import { CurrencyPipe, DatePipe } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Sucursal } from '../../../core/models/sucursal.model';
import { Alquiler } from '../../../core/models/viaje.model';
import { AlquileresService } from '../../../core/services/alquileres.service';
import { AuthService } from '../../../core/services/auth.service';
import { SucursalesService } from '../../../core/services/sucursales.service';
import { marcarErroresServidor, mensajeError } from '../../../core/utils/errores-http';
import { ZONA_GT, ahoraGt, fechaHoraGt, hoyGt } from '../../../core/utils/fechas';
import { ModalComponent } from '../../../shared/components/modal/modal.component';
import { MapaRecorridoComponent } from '../../../shared/components/mapa-recorrido/mapa-recorrido.component';
import {
  Coordenadas,
  SelectorRecorridoComponent,
} from '../../../shared/components/selector-recorrido/selector-recorrido.component';
import { ToastService } from '../../../shared/services/toast.service';

/**
 * Solicitud de alquiler de un bus (T16).
 * CLIENTE: en línea, elige la sucursal que lo atenderá.
 * CAJERO: presencial, la sucursal es la suya y registra los datos del cliente.
 */
@Component({
  selector: 'app-solicitar-alquiler',
  standalone: true,
  imports: [ReactiveFormsModule, DatePipe, CurrencyPipe, ModalComponent, RouterLink, SelectorRecorridoComponent, MapaRecorridoComponent],
  templateUrl: './solicitar-alquiler.component.html',
  styleUrl: './solicitar-alquiler.component.scss',
})
export class SolicitarAlquilerComponent implements OnInit {
  private readonly alquileres = inject(AlquileresService);
  private readonly sucursalesServicio = inject(SucursalesService);
  private readonly avisos = inject(ToastService);
  private readonly fb = inject(FormBuilder);
  readonly auth = inject(AuthService);

  readonly zona = ZONA_GT;
  readonly esCajero = this.auth.tieneRol('CAJERO');
  readonly hoy = hoyGt();

  readonly sucursales = signal<Sucursal[]>([]);
  readonly enviando = signal(false);
  readonly creado = signal<Alquiler | null>(null);

  /** Puntos marcados en el mapa (null = todavía no se marca). */
  readonly origenMapa = signal<Coordenadas | null>(null);
  readonly destinoMapa = signal<Coordenadas | null>(null);

  readonly sucursalFija = computed(() => {
    const id = this.auth.usuario()?.sucursalId;
    return this.sucursales().find((s) => s.sucursalId === id) ?? null;
  });

  readonly form = this.fb.nonNullable.group({
    sucursalId: ['', Validators.required],
    clienteNit: ['', Validators.maxLength(20)],
    clienteNombre: ['', [Validators.required, Validators.maxLength(150)]],
    clienteCorreo: ['', [Validators.email, Validators.maxLength(150)]],
    origen: ['', [Validators.required, Validators.maxLength(255)]],
    destino: ['', [Validators.required, Validators.maxLength(255)]],
    fechaSalida: ['', Validators.required],
    fechaRetorno: [''],
    cantidadPasajeros: [1, [Validators.required, Validators.min(1), Validators.max(120)]],
    kmEstimados: [null as number | null, [Validators.required, Validators.min(0.01), Validators.max(999999.99)]],
    fechaSolicitud: [hoyGt(), Validators.required],
  });

  ngOnInit(): void {
    this.sucursalesServicio.listar(true).subscribe({
      next: (lista) => this.sucursales.set(lista),
      error: (e) => this.avisos.error(mensajeError(e, 'No se pudieron cargar las sucursales.')),
    });
    this.reiniciar();
  }

  private reiniciar(): void {
    const u = this.auth.usuario();
    this.form.reset({
      sucursalId: this.esCajero ? (u?.sucursalId ?? '') : '',
      clienteNit: '',
      clienteNombre: this.esCajero ? '' : (u?.nombre ?? ''),
      clienteCorreo: this.esCajero ? '' : (u?.correo ?? ''),
      origen: '',
      destino: '',
      fechaSalida: ahoraGt(),
      fechaRetorno: '',
      cantidadPasajeros: 1,
      kmEstimados: null,
      fechaSolicitud: hoyGt(),
    });
    this.origenMapa.set(null);
    this.destinoMapa.set(null);
  }

  alCambiarOrigen(punto: Coordenadas | null): void {
    this.origenMapa.set(punto);
  }

  alCambiarDestino(punto: Coordenadas | null): void {
    this.destinoMapa.set(punto);
  }

  /** Los km salen siempre de la distancia del recorrido marcado (no se editan a mano). */
  alCambiarDistancia(km: number | null): void {
    this.form.controls.kmEstimados.setValue(km);
  }

  /** El origen toma el nombre del punto marcado (o del lugar elegido en el buscador). */
  alSugerirOrigen(nombre: string): void {
    this.form.controls.origen.setValue(nombre);
  }

  /** El destino toma el nombre del punto marcado (o del lugar elegido en el buscador). */
  alSugerirDestino(nombre: string): void {
    this.form.controls.destino.setValue(nombre);
  }

  /** ¿La solicitud trae puntos del mapa? Sirve para mostrar la ruta en el resumen. */
  tieneRecorrido(a: Alquiler): boolean {
    return (a.origenLatitud !== null && a.origenLongitud !== null)
      || (a.destinoLatitud !== null && a.destinoLongitud !== null);
  }

  solicitar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const f = this.form.getRawValue();
    const salida = fechaHoraGt(f.fechaSalida);
    const retorno = f.fechaRetorno ? fechaHoraGt(f.fechaRetorno) : null;
    if (retorno && retorno < salida) {
      this.form.controls.fechaRetorno.setErrors({ retornoInvalido: true });
      return;
    }
    this.enviando.set(true);
    this.alquileres
      .solicitar({
        sucursalId: f.sucursalId,
        clienteNit: this.esCajero ? f.clienteNit.trim() || null : null,
        clienteNombre: f.clienteNombre.trim(),
        clienteCorreo: f.clienteCorreo.trim() || null,
        origen: f.origen.trim(),
        destino: f.destino.trim(),
        origenLatitud: this.origenMapa()?.latitud ?? null,
        origenLongitud: this.origenMapa()?.longitud ?? null,
        destinoLatitud: this.destinoMapa()?.latitud ?? null,
        destinoLongitud: this.destinoMapa()?.longitud ?? null,
        fechaSalida: salida,
        fechaRetorno: retorno,
        cantidadPasajeros: Number(f.cantidadPasajeros),
        kmEstimados: Number(f.kmEstimados),
        fechaSolicitud: f.fechaSolicitud,
      })
      .subscribe({
        next: (a) => {
          this.enviando.set(false);
          this.creado.set(a);
          this.avisos.exito('Solicitud de alquiler enviada.');
        },
        error: (e) => {
          this.enviando.set(false);
          marcarErroresServidor(this.form, e);
          this.avisos.error(mensajeError(e, 'No se pudo enviar la solicitud.'));
        },
      });
  }

  solicitarOtro(): void {
    this.creado.set(null);
    this.reiniciar();
  }

  /** Tarifa por km aplicada al estimado (precioEstimado ÷ kmEstimados). */
  tarifa(a: Alquiler): number | null {
    if (!a.kmEstimados) return null;
    return Math.round((a.precioEstimado / a.kmEstimados) * 100) / 100;
  }
}
