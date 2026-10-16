import { Component, effect, inject, input, output, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { CurrencyPipe } from '@angular/common';
import { CarteraService } from '../../../core/services/cartera.service';
import { mensajeError } from '../../../core/utils/errores-http';
import { hoyGt } from '../../../core/utils/fechas';
import { ModalComponent } from '../../../shared/components/modal/modal.component';
import { ToastService } from '../../../shared/services/toast.service';

/** Modal para recargar saldo a la cartera. */
@Component({
  selector: 'app-recarga',
  standalone: true,
  imports: [ReactiveFormsModule, ModalComponent, CurrencyPipe],
  templateUrl: './recarga.component.html',
  styleUrl: './recarga.component.scss',
})
export class RecargaComponent {
  private readonly cartera = inject(CarteraService);
  private readonly avisos = inject(ToastService);

  readonly abierto = input(false);
  readonly recargada = output<void>();
  readonly cerrar = output<void>();

  readonly montosRapidos = [50, 100, 200, 500];
  readonly enviando = signal(false);

  readonly form = inject(FormBuilder).group({
    monto: [null as number | null, [Validators.required, Validators.min(0.01), Validators.max(1000000)]],
    fecha: [hoyGt(), Validators.required],
  });

  constructor() {
    effect(() => {
      if (this.abierto()) this.form.reset({ monto: null, fecha: hoyGt() });
    });
  }

  elegir(monto: number): void {
    this.form.controls.monto.setValue(monto);
  }

  recargar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const { monto, fecha } = this.form.getRawValue();
    this.enviando.set(true);
    this.cartera.recargar(Number(monto), fecha!).subscribe({
      next: (m) => {
        this.enviando.set(false);
        this.avisos.exito(`Recarga realizada. Tu saldo ahora es Q${Number(m.saldoResultante).toFixed(2)}.`);
        this.recargada.emit();
      },
      error: (e) => {
        this.enviando.set(false);
        this.avisos.error(mensajeError(e, 'No se pudo hacer la recarga.'));
      },
    });
  }
}
