import { CurrencyPipe, DatePipe } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Sucursal } from '../../../core/models/sucursal.model';
import { Alquiler } from '../../../core/models/viaje.model';
import { AlquileresService } from '../../../core/services/alquileres.service';
import { AuthService } from '../../../core/services/auth.service';
import { SucursalesService } from '../../../core/services/sucursales.service';
import { UsuariosService } from '../../../core/services/usuarios.service';
import { marcarErroresServidor, mensajeError } from '../../../core/utils/errores-http';
import { ZONA_GT, ahoraGt, fechaHoraGt, hoyGt } from '../../../core/utils/fechas';
import { ModalComponent } from '../../../shared/components/modal/modal.component';
import { MapaRecorridoComponent } from '../../../shared/components/mapa-recorrido/mapa-recorrido.component';
import {
  Coordenadas,
  SelectorRecorridoComponent,
} from '../../../shared/components/selector-recorrido/selector-recorrido.component';
import { ToastService } from '../../../shared/services/toast.service';
import { pantallaGrande } from '../../../shared/utils/pantalla';

/** Para quién es el alquiler: la persona con sesión (sus datos del perfil) u otra (datos a mano). */
export type ParaQuien = 'propia' | 'otra';

/**
 * Solicitud de alquiler de un bus (T16).
 * - CLIENTE: siempre a su nombre; NIT, nombre y correo salen de su perfil y no se editan aquí.
 * - CAJERO y ADMINISTRADOR DE SUCURSAL: eligen si es propia (necesita el rol Cliente; se toman sus datos)
 *   o de otra persona (nombre obligatorio, NIT y correo opcionales).
 * El backend no cambia: con rol Cajero el alquiler es PRESENCIAL en su sucursal; si no, EN_LINEA a la cuenta
 * que lo pide (así lo registra el administrador de sucursal, que no es cajero).
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
  private readonly usuarios = inject(UsuariosService);
  private readonly avisos = inject(ToastService);
  private readonly fb = inject(FormBuilder);
  readonly auth = inject(AuthService);

  readonly zona = ZONA_GT;
  /** Cajero o administrador de sucursal: registra el alquiler de un cliente que llega a la ventanilla. */
  readonly esVentanilla = this.auth.tieneRol('CAJERO', 'ADMIN_SUCURSAL');
  readonly esCajero = this.auth.tieneRol('CAJERO');
  /** Solo con el rol Cliente se puede pedir un alquiler propio. */
  readonly tieneCliente = this.auth.tieneRol('CLIENTE');
  readonly paraQuien = signal<ParaQuien>(this.esVentanilla ? 'otra' : 'propia');
  /** Datos del cliente tomados del perfil (solo lectura) o escritos a mano. */
  readonly esPropia = computed(() => this.paraQuien() === 'propia');
  /**
   * Sucursal fija: la del cajero siempre (el backend lo exige) y la del administrador de sucursal cuando
   * atiende a otra persona. El cliente, o el administrador pidiendo para sí, elige la sucursal.
   */
  readonly sucursalBloqueada = computed(() => this.esCajero || (this.esVentanilla && !this.esPropia()));
  readonly hoy = hoyGt();

  readonly sucursales = signal<Sucursal[]>([]);
  readonly enviando = signal(false);
  readonly creado = signal<Alquiler | null>(null);
  /** En PC el resumen de la solicitud se abre amplio, con el mapa grande al lado. */
  readonly pantallaGrande = pantallaGrande();

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
    this.form.reset({
      sucursalId: '',
      clienteNit: '',
      clienteNombre: '',
      clienteCorreo: '',
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
    this.elegirParaQuien(this.paraQuien());
  }

  /**
   * Propia: datos del perfil, bloqueados (getRawValue() igual los envía). Otra persona: campos vacíos
   * y editables. También fija o libera la sucursal.
   */
  elegirParaQuien(valor: ParaQuien): void {
    if (valor === 'propia' && !this.tieneCliente) return;
    this.paraQuien.set(valor);
    const datos = [this.form.controls.clienteNit, this.form.controls.clienteNombre, this.form.controls.clienteCorreo];
    if (valor === 'propia') {
      const u = this.auth.usuario();
      this.form.patchValue({ clienteNit: '', clienteNombre: u?.nombre ?? '', clienteCorreo: u?.correo ?? '' });
      datos.forEach((c) => c.disable());
      this.llenarConPerfil();
    } else {
      this.form.patchValue({ clienteNit: '', clienteNombre: '', clienteCorreo: '' });
      datos.forEach((c) => {
        c.enable();
        c.markAsUntouched();
      });
    }
    const suya = this.auth.usuario()?.sucursalId ?? '';
    this.form.controls.sucursalId.setValue(this.sucursalBloqueada() ? suya : (this.esVentanilla ? suya : ''));
  }

  /** NIT, nombre y correo del perfil del cliente (campos de solo lectura: se cambian en Mi perfil). */
  private llenarConPerfil(): void {
    this.usuarios.perfil().subscribe({
      next: (p) => {
        if (!this.esPropia()) return; // cambió a "otra persona" mientras llegaba el perfil
        const nombre = `${p.nombres ?? ''} ${p.apellidos ?? ''}`.trim();
        this.form.patchValue({
          clienteNit: p.nit ?? '',
          clienteNombre: nombre || this.form.controls.clienteNombre.value,
          clienteCorreo: p.correo ?? this.form.controls.clienteCorreo.value,
        });
      },
      // Sin perfil se queda con el nombre y correo de la sesión; el NIT vacío se registra como CF
      error: () => undefined,
    });
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
        clienteNit: f.clienteNit.trim() || null,
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
