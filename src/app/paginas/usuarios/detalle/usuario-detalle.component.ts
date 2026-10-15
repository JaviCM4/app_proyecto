import { DatePipe } from '@angular/common';
import { Component, computed, effect, inject, input, output, signal } from '@angular/core';
import { PersonalSucursal, Sucursal } from '../../../core/models/sucursal.model';
import { EstadoUsuario, UsuarioDetalle } from '../../../core/models/usuario.model';
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
}

const ACCIONES: AccionEstado[] = [
  { estado: 'ACTIVO', texto: 'Activar', pregunta: 'La cuenta podrá volver a entrar al sistema.', peligro: false },
  { estado: 'INACTIVO', texto: 'Desactivar', pregunta: 'La cuenta ya no podrá entrar al sistema.', peligro: true },
  { estado: 'BLOQUEADO', texto: 'Bloquear', pregunta: 'La cuenta queda bloqueada y se cierran sus sesiones.', peligro: true },
];

/** Modal con los datos de un usuario y las acciones para cambiar el estado de su cuenta. */
@Component({
  selector: 'app-usuario-detalle',
  standalone: true,
  imports: [ModalComponent, AvatarComponent, ConfirmacionComponent, RolTextoPipe, DatePipe, AccionPersonalComponent],
  templateUrl: './usuario-detalle.component.html',
  styleUrl: './usuario-detalle.component.scss',
})
export class UsuarioDetalleComponent {
  private readonly usuarios = inject(UsuariosService);
  private readonly personalServicio = inject(PersonalService);
  private readonly sucursalesServicio = inject(SucursalesService);
  private readonly avisos = inject(ToastService);

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

  /** El personal de sucursal y los pilotos se retiran desde Fleet (no se cambia el estado de la cuenta aquí). */
  readonly esPersonal = computed(() => !!this.detalle()?.sucursalId || !!this.detalle()?.choferId);
  readonly esPiloto = computed(() => !!this.detalle()?.choferId);
  readonly acciones = computed(() => ACCIONES.filter((a) => a.estado !== this.detalle()?.estado));

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

  confirmar(): void {
    const accion = this.porConfirmar();
    const d = this.detalle();
    if (!accion || !d) return;
    this.procesando.set(true);
    this.usuarios.cambiarEstado(d.usuarioId, accion.estado).subscribe({
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
