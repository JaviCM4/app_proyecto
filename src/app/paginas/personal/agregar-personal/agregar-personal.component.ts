import { Component, effect, inject, input, output, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RolPersonal, Sucursal } from '../../../core/models/sucursal.model';
import { PersonalService } from '../../../core/services/personal.service';
import { SucursalesService } from '../../../core/services/sucursales.service';
import { marcarErroresServidor, mensajeError } from '../../../core/utils/errores-http';
import { hoyGt } from '../../../core/utils/fechas';
import { ModalComponent } from '../../../shared/components/modal/modal.component';
import { ToastService } from '../../../shared/services/toast.service';
import { DatosCuentaComponent } from '../datos-cuenta/datos-cuenta.component';
import { grupoCuenta, valoresCuenta } from '../datos-cuenta/cuenta.form';

/**
 * Modal para agregar un administrador (o cajero) a una sucursal que ya existe.
 * Si recibe `sucursalId` la sucursal queda fija; si no, se elige de la lista.
 */
@Component({
  selector: 'app-agregar-personal',
  standalone: true,
  imports: [ReactiveFormsModule, ModalComponent, DatosCuentaComponent],
  templateUrl: './agregar-personal.component.html',
})
export class AgregarPersonalComponent {
  private readonly personal = inject(PersonalService);
  private readonly sucursalesServicio = inject(SucursalesService);
  private readonly avisos = inject(ToastService);
  private readonly fb = inject(FormBuilder);

  readonly abierto = input(false);
  readonly sucursalId = input<string | null>(null);
  readonly agregado = output<void>();
  readonly cerrar = output<void>();

  readonly sucursales = signal<Sucursal[]>([]);
  readonly enviando = signal(false);

  readonly form = this.fb.nonNullable.group({
    sucursalId: ['', Validators.required],
    rol: ['ADMIN_SUCURSAL' as RolPersonal, Validators.required],
    fechaAsignacion: [hoyGt(), Validators.required],
    cuenta: grupoCuenta(this.fb),
  });

  constructor() {
    effect(() => {
      if (!this.abierto()) return;
      this.form.reset({ sucursalId: this.sucursalId() ?? '', rol: 'ADMIN_SUCURSAL', fechaAsignacion: hoyGt() });
      if (this.sucursalId()) this.form.controls.sucursalId.disable();
      else this.form.controls.sucursalId.enable();
      this.sucursalesServicio.listar(true).subscribe({ next: (s) => this.sucursales.set(s) });
    });
  }

  nombreSucursal(): string {
    return this.sucursales().find((s) => s.sucursalId === this.form.getRawValue().sucursalId)?.nombre ?? '';
  }

  guardar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const v = this.form.getRawValue();
    this.enviando.set(true);
    this.personal
      .agregar(v.sucursalId, { rol: v.rol, fechaAsignacion: v.fechaAsignacion, cuenta: valoresCuenta(this.form.controls.cuenta) })
      .subscribe({
        next: (p) => {
          this.enviando.set(false);
          this.avisos.exito(`${p.nombreCompleto} quedó asignado a la sucursal. Le llegará un correo para activar su cuenta.`);
          this.agregado.emit();
        },
        error: (e) => {
          this.enviando.set(false);
          marcarErroresServidor(this.form, e);
          this.avisos.error(mensajeError(e, 'No se pudo agregar a la persona.'));
        },
      });
  }
}
