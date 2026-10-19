import { Component, computed, effect, inject, input, output, signal } from '@angular/core';
import { Observable } from 'rxjs';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { PersonalSucursal, RolPersonal, Sucursal } from '../../../core/models/sucursal.model';
import { PersonalService } from '../../../core/services/personal.service';
import { SucursalesService } from '../../../core/services/sucursales.service';
import { mensajeError } from '../../../core/utils/errores-http';
import { hoyGt } from '../../../core/utils/fechas';
import { ModalComponent } from '../../../shared/components/modal/modal.component';
import { NOMBRE_ROL } from '../../../shared/constants/roles';
import { ToastService } from '../../../shared/services/toast.service';

export type AccionPersonal = 'desactivar' | 'trasladar' | 'reintegrar';

/**
 * Modal para retirar a una persona de su sucursal, trasladarla a otra o reintegrar a alguien retirado.
 * El reintegro es siempre a la sucursal de la que se retiró (bloqueada): para llevarla a otra se usa trasladar.
 * Fleet no deja retirar al último administrador activo de una sucursal activa, ni reintegrar a quien
 * ya trabaja en otra sucursal o a una sucursal inactiva.
 */
@Component({
  selector: 'app-accion-personal',
  standalone: true,
  imports: [ReactiveFormsModule, ModalComponent],
  templateUrl: './accion-personal.component.html',
})
export class AccionPersonalComponent {
  private readonly servicio = inject(PersonalService);
  private readonly sucursalesServicio = inject(SucursalesService);
  private readonly avisos = inject(ToastService);

  /** Persona sobre la que se actúa (null = cerrado). */
  readonly personal = input<PersonalSucursal | null>(null);
  readonly accion = input<AccionPersonal>('desactivar');
  readonly hecho = output<void>();
  readonly cerrar = output<void>();

  readonly sucursales = signal<Sucursal[]>([]);
  readonly enviando = signal(false);
  /** Para trasladar se excluye la sucursal actual; para reintegrar puede volver a la misma. */
  readonly destinos = computed(() =>
    this.accion() === 'reintegrar' ? this.sucursales() : this.sucursales().filter((s) => s.sucursalId !== this.personal()?.sucursalId),
  );
  readonly titulo = computed(() =>
    ({ desactivar: 'Retirar de la sucursal', trasladar: 'Trasladar a otra sucursal', reintegrar: 'Reintegrar' })[this.accion()],
  );
  /** Nombre de la sucursal a la que vuelve quien se reintegra (la suya, no se puede cambiar). */
  readonly sucursalPropia = computed(() => {
    const id = this.personal()?.sucursalId;
    return this.sucursales().find((s) => s.sucursalId === id)?.nombre ?? 'Su sucursal';
  });
  readonly puesto = computed(() => {
    const p = this.personal();
    return p ? NOMBRE_ROL[p.rol].toLowerCase() : '';
  });

  readonly form = inject(FormBuilder).nonNullable.group({
    fecha: [hoyGt(), Validators.required],
    sucursalDestinoId: [''],
    rol: ['ADMIN_SUCURSAL' as RolPersonal],
  });

  constructor() {
    effect(() => {
      if (!this.personal()) return;
      const p = this.personal()!;
      const reintegro = this.accion() === 'reintegrar';
      this.form.reset({ fecha: hoyGt(), sucursalDestinoId: reintegro ? p.sucursalId : '', rol: p.rol });
      const destino = this.form.controls.sucursalDestinoId;
      destino.setValidators(this.accion() !== 'desactivar' ? Validators.required : null);
      // Reintegro: la sucursal queda fija en la suya (getRawValue() la sigue enviando)
      if (reintegro) destino.disable();
      else destino.enable();
      destino.updateValueAndValidity();
      if (this.accion() !== 'desactivar') this.sucursalesServicio.listar(true).subscribe({ next: (s) => this.sucursales.set(s) });
    });
  }

  confirmar(): void {
    const p = this.personal();
    if (!p || this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const { fecha, sucursalDestinoId, rol } = this.form.getRawValue();
    const destino = this.destinos().find((s) => s.sucursalId === sucursalDestinoId)?.nombre ?? 'la sucursal';
    this.enviando.set(true);
    const peticiones: Record<AccionPersonal, () => Observable<unknown>> = {
      trasladar: () => this.servicio.trasladar(p.personalId, sucursalDestinoId, fecha, p.version),
      desactivar: () => this.servicio.desactivar(p.personalId, fecha, p.version),
      reintegrar: () => this.servicio.reintegrar(p.personalId, sucursalDestinoId, rol, fecha),
    };
    const exito: Record<AccionPersonal, string> = {
      trasladar: `${p.nombreCompleto} fue trasladado a ${destino}.`,
      desactivar: `${p.nombreCompleto} ya no forma parte de la sucursal.`,
      reintegrar: `${p.nombreCompleto} volvió a ${destino} como ${NOMBRE_ROL[rol].toLowerCase()}.`,
    };
    const peticion = peticiones[this.accion()]();
    peticion.subscribe({
      next: () => {
        this.enviando.set(false);
        this.avisos.exito(exito[this.accion()]);
        this.hecho.emit();
      },
      error: (e) => {
        this.enviando.set(false);
        this.avisos.error(mensajeError(e, 'No se pudo completar la acción.'));
      },
    });
  }
}
