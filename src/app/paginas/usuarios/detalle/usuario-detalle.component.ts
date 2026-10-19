import { DatePipe } from '@angular/common';
import { Component, computed, effect, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { PersonalSucursal, Sucursal } from '../../../core/models/sucursal.model';
import { EstadoUsuario, UsuarioDetalle } from '../../../core/models/usuario.model';
import { AuthService } from '../../../core/services/auth.service';
import { PersonalService } from '../../../core/services/personal.service';
import { SucursalesService } from '../../../core/services/sucursales.service';
import { UsuariosService } from '../../../core/services/usuarios.service';
import { mensajeError } from '../../../core/utils/errores-http';
import { ConfirmacionComponent } from '../../../shared/components/confirmacion/confirmacion.component';
import { ModalComponent } from '../../../shared/components/modal/modal.component';
import { AvatarComponent } from '../../../shared/components/avatar/avatar.component';
import { ESTADO_USUARIO } from '../../../shared/constants/estados';
import { RolTextoPipe } from '../../../shared/pipes/rol-texto.pipe';
import { ToastService } from '../../../shared/services/toast.service';
import { AccionPersonal, AccionPersonalComponent } from '../../personal/accion-personal/accion-personal.component';
import { NOMBRE_ROL } from '../../../shared/constants/roles';

interface AccionEstado {
  estado: EstadoUsuario;
  texto: string;
  pregunta: string;
  peligro: boolean;
  /** Desbloquear usa el endpoint dedicado (no envía estado). */
  desbloquea?: boolean;
  /** Bloquear permite elegir cuánto dura. */
  pideDuracion?: boolean;
}

/** Una acción por transición: el panel muestra los 4 botones (activar, desactivar, bloquear, desbloquear). */
const ACTIVAR: AccionEstado = {
  estado: 'ACTIVO', texto: 'Activar', peligro: false,
  pregunta: 'La cuenta podrá volver a entrar al sistema.',
};
const DESBLOQUEAR: AccionEstado = {
  estado: 'ACTIVO', texto: 'Desbloquear', peligro: false, desbloquea: true,
  pregunta: 'Se quita el bloqueo y la cuenta podrá volver a entrar de inmediato.',
};
const DESACTIVAR: AccionEstado = {
  estado: 'INACTIVO', texto: 'Desactivar', peligro: true,
  pregunta: 'La cuenta dejará de poder entrar al sistema hasta que la activen de nuevo.',
};
const BLOQUEAR: AccionEstado = {
  estado: 'BLOQUEADO', texto: 'Bloquear', peligro: true, pideDuracion: true,
  pregunta: 'Se cierran sus sesiones y no podrá entrar hasta que venza el bloqueo o la desbloqueen.',
};

/** 0 = sin vencimiento (solo lo quita desbloquear). */
const DURACIONES = [
  { valor: 15, texto: '15 minutos' },
  { valor: 60, texto: '1 hora' },
  { valor: 1440, texto: '24 horas' },
  { valor: 0, texto: 'Sin vencimiento' },
];

/** Modal con los datos de un usuario y las acciones para cambiar el estado de su cuenta. */
@Component({
  selector: 'app-usuario-detalle',
  standalone: true,
  imports: [ModalComponent, AvatarComponent, ConfirmacionComponent, RolTextoPipe, DatePipe, AccionPersonalComponent, FormsModule],
  templateUrl: './usuario-detalle.component.html',
  styleUrl: './usuario-detalle.component.scss',
})
export class UsuarioDetalleComponent {
  private readonly usuarios = inject(UsuariosService);
  private readonly personalServicio = inject(PersonalService);
  private readonly sucursalesServicio = inject(SucursalesService);
  private readonly avisos = inject(ToastService);
  private readonly miUsuarioId = inject(AuthService).usuario()?.usuarioId ?? null;

  /** Id del usuario a mostrar (null = cerrado). */
  readonly usuarioId = input<string | null>(null);
  readonly cambiado = output<void>();
  readonly cerrar = output<void>();

  readonly detalle = signal<UsuarioDetalle | null>(null);
  readonly porConfirmar = signal<AccionEstado | null>(null);
  readonly procesando = signal(false);
  readonly estados = ESTADO_USUARIO;
  readonly nombreRol = NOMBRE_ROL;

  /** Puesto en la sucursal (administrador o cajero) y la sucursal, si es personal. */
  readonly puesto = signal<PersonalSucursal | null>(null);
  readonly sucursal = signal<Sucursal | null>(null);
  readonly enAccion = signal<AccionPersonal | null>(null);

  /** El personal de sucursal y los pilotos conservan su puesto en Fleet, pero su cuenta se maneja aquí. */
  readonly esPersonal = computed(() => !!this.detalle()?.sucursalId || !!this.detalle()?.choferId);
  readonly esPiloto = computed(() => !!this.detalle()?.choferId);
  /** Activar, desactivar, bloquear o desbloquear según el estado actual. */
  readonly acciones = computed<AccionEstado[]>(() => {
    switch (this.detalle()?.estado) {
      case 'INACTIVO': return [ACTIVAR];
      case 'BLOQUEADO': return [DESBLOQUEAR, DESACTIVAR];
      case 'ACTIVO': return [BLOQUEAR, DESACTIVAR];
      default: return [];
    }
  });
  readonly duraciones = DURACIONES;
  /** Duración elegida para el bloqueo (minutos); 0 = sin vencimiento. */
  readonly duracion = signal(15);
  /** Nadie cambia el estado de su propia cuenta (el servidor también lo rechaza). */
  readonly esPropia = computed(() => !!this.detalle() && this.detalle()!.usuarioId === this.miUsuarioId);

  /** Solo cuentas activas que no son personal, piloto ni ya administradores del sistema. */
  readonly puedeSerAdmin = computed(() => {
    const d = this.detalle();
    return !!d && d.estado === 'ACTIVO' && !this.esPersonal() && !d.roles.includes('ADMIN_SISTEMA');
  });
  readonly confirmandoAdmin = signal(false);

  constructor() {
    effect(() => {
      const id = this.usuarioId();
      this.detalle.set(null);
      this.puesto.set(null);
      this.sucursal.set(null);
      if (!id) return;
      this.usuarios.detalle(id).subscribe({
        next: (d) => {
          this.detalle.set(d);
          this.cargarPuesto(d);
        },
        error: (e) => {
          this.avisos.error(mensajeError(e, 'No se pudo cargar el usuario.'));
          this.cerrar.emit();
        },
      });
    });
  }

  /** Busca en Fleet el puesto activo de la persona en su sucursal. */
  private cargarPuesto(d: UsuarioDetalle): void {
    if (!d.sucursalId) return;
    this.sucursalesServicio.obtener(d.sucursalId).subscribe({ next: (s) => this.sucursal.set(s) });
    if (d.choferId) return;
    this.personalServicio.listar(d.sucursalId, undefined, true).subscribe({
      next: (lista) => this.puesto.set(lista.find((p) => p.usuarioId === d.usuarioId) ?? null),
    });
  }

  alTerminarAccion(): void {
    this.enAccion.set(null);
    this.avisos.info('Los cambios en la cuenta pueden tardar unos segundos en verse.');
    this.cambiado.emit();
    this.cerrar.emit();
  }

  hacerAdministrador(): void {
    const d = this.detalle();
    if (!d) return;
    this.procesando.set(true);
    this.usuarios.hacerAdministradorSistema(d.usuarioId).subscribe({
      next: (actualizado) => {
        this.procesando.set(false);
        this.confirmandoAdmin.set(false);
        this.detalle.set(actualizado);
        this.avisos.exito('Ahora es administrador del sistema. Le llegará un correo para que vuelva a iniciar sesión.');
        this.cambiado.emit();
      },
      error: (e) => {
        this.procesando.set(false);
        this.confirmandoAdmin.set(false);
        this.avisos.error(mensajeError(e, 'No se pudo hacer administrador a esta cuenta.'));
      },
    });
  }

  /** Abre la confirmación; para bloquear, reinicia la duración por defecto. */
  pedirConfirmacion(accion: AccionEstado): void {
    if (accion.pideDuracion) this.duracion.set(15);
    this.porConfirmar.set(accion);
  }

  confirmar(): void {
    const accion = this.porConfirmar();
    const d = this.detalle();
    if (!accion || !d) return;
    this.procesando.set(true);
    const peticion = accion.desbloquea
      ? this.usuarios.desbloquear(d.usuarioId)
      : this.usuarios.cambiarEstado(d.usuarioId, accion.estado,
          accion.pideDuracion && this.duracion() > 0 ? this.duracion() : undefined);
    peticion.subscribe({
      next: (actualizado) => {
        this.procesando.set(false);
        this.porConfirmar.set(null);
        this.detalle.set(actualizado);
        this.avisos.exito(`La cuenta quedó ${this.estados[actualizado.estado].texto.toLowerCase()}.`);
        this.cambiado.emit();
      },
      error: (e) => {
        this.procesando.set(false);
        this.porConfirmar.set(null);
        this.avisos.error(mensajeError(e, 'No se pudo cambiar el estado.'));
      },
    });
  }
}
