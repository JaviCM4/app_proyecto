import { DatePipe, DecimalPipe } from '@angular/common';
import { Component, computed, effect, inject, input, output, signal } from '@angular/core';
import { PersonalSucursal, Sucursal } from '../../../core/models/sucursal.model';
import { PersonalService } from '../../../core/services/personal.service';
import { mensajeError } from '../../../core/utils/errores-http';
import { ModalComponent } from '../../../shared/components/modal/modal.component';
import { NOMBRE_ROL } from '../../../shared/constants/roles';
import { ToastService } from '../../../shared/services/toast.service';
import { AccionPersonal, AccionPersonalComponent } from '../../personal/accion-personal/accion-personal.component';
import { AgregarPersonalComponent } from '../../personal/agregar-personal/agregar-personal.component';

/** Detalle de una sucursal: sus datos y su personal (administradores y cajeros). */
@Component({
  selector: 'app-sucursal-detalle',
  standalone: true,
  imports: [ModalComponent, DatePipe, DecimalPipe, AgregarPersonalComponent, AccionPersonalComponent],
  templateUrl: './sucursal-detalle.component.html',
  styleUrl: './sucursal-detalle.component.scss',
})
export class SucursalDetalleComponent {
  private readonly servicio = inject(PersonalService);
  private readonly avisos = inject(ToastService);

  readonly sucursal = input<Sucursal | null>(null);
  readonly editar = output<Sucursal>();
  readonly cerrar = output<void>();

  readonly personal = signal<PersonalSucursal[]>([]);
  readonly cargando = signal(false);
  readonly mostrarInactivos = signal(false);
  readonly agregando = signal(false);
  readonly enAccion = signal<{ persona: PersonalSucursal; accion: AccionPersonal } | null>(null);
  readonly nombreRol = NOMBRE_ROL;

  readonly administradores = computed(() => this.personal().filter((p) => p.activo && p.rol === 'ADMIN_SUCURSAL'));
  readonly visibles = computed(() => this.personal().filter((p) => p.activo || this.mostrarInactivos()));

  constructor() {
    effect(() => {
      const s = this.sucursal();
      this.personal.set([]);
      this.mostrarInactivos.set(false);
      if (s) this.cargar(s.sucursalId);
    });
  }

  cargar(sucursalId = this.sucursal()?.sucursalId): void {
    if (!sucursalId) return;
    this.cargando.set(true);
    this.servicio.listar(sucursalId).subscribe({
      next: (lista) => {
        this.personal.set(lista);
        this.cargando.set(false);
      },
      error: (e) => {
        this.cargando.set(false);
        this.avisos.error(mensajeError(e, 'No se pudo cargar el personal.'));
      },
    });
  }

  /**
   * Reintegrar solo se ofrece en la fila más reciente de cada persona que no esté activa en esta sucursal
   * (si ya trabaja en otra sucursal, Fleet lo rechaza y se muestra el aviso).
   */
  esUltimaAsignacion(p: PersonalSucursal): boolean {
    const suyas = this.personal().filter((x) => x.usuarioId === p.usuarioId);
    if (suyas.some((x) => x.activo)) return false;
    return suyas.every((x) => x.fechaAsignacion <= p.fechaAsignacion);
  }

  alTerminarAccion(): void {
    this.enAccion.set(null);
    this.agregando.set(false);
    this.cargar();
  }
}
