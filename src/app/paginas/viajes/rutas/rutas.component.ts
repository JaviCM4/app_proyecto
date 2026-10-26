import { CurrencyPipe, DecimalPipe } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { Ruta } from '../../../core/models/viaje.model';
import { Sucursal } from '../../../core/models/sucursal.model';
import { AuthService } from '../../../core/services/auth.service';
import { SucursalesService } from '../../../core/services/sucursales.service';
import { ViajesService } from '../../../core/services/viajes.service';
import { marcarErroresServidor, mensajeError } from '../../../core/utils/errores-http';
import { ConfirmacionComponent } from '../../../shared/components/confirmacion/confirmacion.component';
import { MapaRecorridoComponent } from '../../../shared/components/mapa-recorrido/mapa-recorrido.component';
import { ModalComponent } from '../../../shared/components/modal/modal.component';
import { PaginadorComponent } from '../../../shared/components/paginador/paginador.component';
import { ToastService } from '../../../shared/services/toast.service';
import { normalizar, paginar } from '../../../shared/utils/paginacion';

type FiltroActiva = 'todas' | 'activas' | 'inactivas';

/** Rutas entre sucursales: lista con buscador, nueva, editar (km/precio/activa) y eliminar. */
@Component({
  selector: 'app-rutas',
  standalone: true,
  imports: [
    FormsModule,
    ReactiveFormsModule,
    CurrencyPipe,
    DecimalPipe,
    ModalComponent,
    ConfirmacionComponent,
    PaginadorComponent,
    MapaRecorridoComponent,
  ],
  templateUrl: './rutas.component.html',
  styleUrl: './rutas.component.scss',
})
export class RutasComponent implements OnInit {
  readonly auth = inject(AuthService);
  private readonly servicio = inject(ViajesService);
  private readonly sucursalesServicio = inject(SucursalesService);
  private readonly avisos = inject(ToastService);
  private readonly fb = inject(FormBuilder);

  readonly esSistema = this.auth.tieneRol('ADMIN_SISTEMA');

  private readonly rutas = signal<Ruta[]>([]);
  readonly sucursales = signal<Sucursal[]>([]);
  readonly cargando = signal(true);

  readonly texto = signal('');
  readonly filtroActiva = signal<FiltroActiva>('todas');
  readonly sucursalId = signal<string>(this.auth.usuario()?.sucursalId ?? '');
  readonly pagina = signal(1);
  readonly tamano = signal(10);

  /** Modal de nueva/edición: undefined = cerrado, null = nueva, Ruta = editar. */
  readonly enFormulario = signal<Ruta | null | undefined>(undefined);
  readonly porEliminar = signal<Ruta | null>(null);
  readonly enviando = signal(false);
  readonly eliminando = signal(false);
  /** Distancia real por carretera del recorrido dibujado (referencia para el campo de km). */
  readonly distanciaMapa = signal<number | null>(null);

  readonly form = this.fb.nonNullable.group({
    sucursalOrigenId: ['', Validators.required],
    sucursalDestinoId: ['', Validators.required],
    distanciaKm: [null as number | null, [Validators.required, Validators.min(0.01)]],
    precioBoleto: [null as number | null, [Validators.required, Validators.min(0.01)]],
    activa: [true],
  });

  readonly sucursalesActivas = computed(() => this.sucursales().filter((s) => s.activa));

  readonly filtradas = computed(() => {
    const buscado = normalizar(this.texto());
    const activa = this.filtroActiva();
    const sucursal = this.sucursalId();
    return this.rutas().filter(
      (r) =>
        (activa === 'todas' || r.activa === (activa === 'activas')) &&
        (!sucursal || r.sucursalOrigenId === sucursal) &&
        (!buscado || normalizar(`${r.origenNombre} ${r.destinoNombre}`).includes(buscado)),
    );
  });

  readonly paginaActual = computed(() => paginar(this.filtradas(), this.pagina(), this.tamano()));

  ngOnInit(): void {
    this.sucursalesServicio.listar().subscribe({
      next: (lista) => this.sucursales.set(lista),
      error: (e) => this.avisos.error(mensajeError(e, 'No se pudieron cargar las sucursales.')),
    });
    this.cargar();
  }

  cargar(): void {
    this.cargando.set(true);
    forkJoin([this.servicio.rutas(true), this.servicio.rutas(false)]).subscribe({
      next: ([activas, inactivas]) => {
        this.rutas.set([...activas, ...inactivas]);
        this.cargando.set(false);
      },
      error: (e) => {
        this.cargando.set(false);
        this.avisos.error(mensajeError(e, 'No se pudieron cargar las rutas.'));
      },
    });
  }

  filtrar(texto: string): void {
    this.texto.set(texto);
    this.pagina.set(1);
  }

  cambiarFiltroActiva(activa: FiltroActiva): void {
    this.filtroActiva.set(activa);
    this.pagina.set(1);
  }

  cambiarSucursal(id: string): void {
    this.sucursalId.set(id);
    this.pagina.set(1);
  }

  nombreSucursal(id: string): string {
    return this.sucursales().find((s) => s.sucursalId === id)?.nombre ?? '';
  }

  /** Sucursal de origen del formulario (aunque el control esté deshabilitado). */
  origenSucursal(): Sucursal | null {
    const id = this.form.getRawValue().sucursalOrigenId;
    return this.sucursales().find((s) => s.sucursalId === id) ?? null;
  }

  /** Sucursal de destino del formulario (aunque el control esté deshabilitado). */
  destinoSucursal(): Sucursal | null {
    const id = this.form.getRawValue().sucursalDestinoId;
    return this.sucursales().find((s) => s.sucursalId === id) ?? null;
  }

  /**
   * La distancia siempre sale del mapa: cada vez que el recorrido cambia se copia al campo,
   * que es de solo lectura. Si el ruteo falla (null) al editar se conserva la distancia
   * guardada; en una ruta nueva el campo queda vacío y no deja guardar.
   */
  alCambiarDistancia(km: number | null): void {
    this.distanciaMapa.set(km);
    if (km === null) {
      if (!this.enFormulario()) this.form.controls.distanciaKm.setValue(null);
      return;
    }
    this.form.controls.distanciaKm.setValue(Math.round(km * 100) / 100);
  }

  abrirNueva(): void {
    this.distanciaMapa.set(null);
    this.form.reset({
      sucursalOrigenId: this.sucursalId(),
      sucursalDestinoId: '',
      distanciaKm: null,
      precioBoleto: null,
      activa: true,
    });
    if (this.esSistema) this.form.controls.sucursalOrigenId.enable();
    else this.form.controls.sucursalOrigenId.disable();
    this.enFormulario.set(null);
  }

  abrirEditar(r: Ruta): void {
    this.distanciaMapa.set(null);
    this.form.reset({
      sucursalOrigenId: r.sucursalOrigenId,
      sucursalDestinoId: r.sucursalDestinoId,
      distanciaKm: r.distanciaKm,
      precioBoleto: r.precioBoleto,
      activa: r.activa,
    });
    this.form.controls.sucursalOrigenId.disable();
    this.form.controls.sucursalDestinoId.disable();
    this.enFormulario.set(r);
  }

  errorServidor(ruta: string): string | null {
    return (this.form.get(ruta)?.errors?.['servidor'] as string | undefined) ?? null;
  }

  guardar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const v = this.form.getRawValue();
    if (v.sucursalOrigenId === v.sucursalDestinoId) {
      this.avisos.error('El origen y el destino no pueden ser la misma sucursal.');
      return;
    }
    this.enviando.set(true);
    const enEdicion = this.enFormulario();
    if (enEdicion) {
      this.servicio
        .actualizarRuta(enEdicion.rutaId, {
          distanciaKm: Number(v.distanciaKm),
          precioBoleto: Number(v.precioBoleto),
          activa: v.activa,
          version: enEdicion.version,
        })
        .subscribe({
          next: () => {
            this.enviando.set(false);
            this.enFormulario.set(undefined);
            this.avisos.exito('Ruta actualizada.');
            this.cargar();
          },
          error: (e) => {
            this.enviando.set(false);
            marcarErroresServidor(this.form, e);
            this.avisos.error(mensajeError(e, 'No se pudo actualizar la ruta.'));
          },
        });
    } else {
      this.servicio
        .crearRuta({
          sucursalOrigenId: v.sucursalOrigenId,
          sucursalDestinoId: v.sucursalDestinoId,
          distanciaKm: Number(v.distanciaKm),
          precioBoleto: Number(v.precioBoleto),
        })
        .subscribe({
          next: () => {
            this.enviando.set(false);
            this.enFormulario.set(undefined);
            this.avisos.exito('Ruta creada.');
            this.cargar();
          },
          error: (e) => {
            this.enviando.set(false);
            marcarErroresServidor(this.form, e);
            this.avisos.error(mensajeError(e, 'No se pudo crear la ruta.'));
          },
        });
    }
  }

  confirmarEliminar(): void {
    const r = this.porEliminar();
    if (!r) return;
    this.eliminando.set(true);
    this.servicio.eliminarRuta(r.rutaId).subscribe({
      next: () => {
        this.eliminando.set(false);
        this.porEliminar.set(null);
        this.avisos.exito('Ruta eliminada.');
        this.cargar();
      },
      error: (e) => {
        this.eliminando.set(false);
        this.porEliminar.set(null);
        this.avisos.error(mensajeError(e, 'No se pudo eliminar la ruta.'));
      },
    });
  }
}
