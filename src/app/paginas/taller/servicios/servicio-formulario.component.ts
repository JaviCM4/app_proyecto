import { Component, effect, inject, input, output, signal } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { CurrencyPipe } from '@angular/common';
import { BusDisponible, Categoria, LineaServicio, TipoLinea } from '../../../core/models/taller.model';
import { TallerService } from '../../../core/services/taller.service';
import { marcarErroresServidor, mensajeError } from '../../../core/utils/errores-http';
import { hoyGt } from '../../../core/utils/fechas';
import { ModalComponent } from '../../../shared/components/modal/modal.component';
import { ToastService } from '../../../shared/services/toast.service';

/** Modal para registrar un servicio de taller con sus líneas (mano de obra y repuestos). */
@Component({
  selector: 'app-servicio-formulario',
  standalone: true,
  imports: [ReactiveFormsModule, CurrencyPipe, ModalComponent],
  templateUrl: './servicio-formulario.component.html',
})
export class ServicioFormularioComponent {
  private readonly taller = inject(TallerService);
  private readonly avisos = inject(ToastService);
  private readonly fb = inject(FormBuilder);

  readonly abierto = input(false);
  readonly buses = input<BusDisponible[]>([]);
  readonly guardado = output<void>();
  readonly cerrar = output<void>();

  readonly categorias = signal<Categoria[]>([]);
  readonly enviando = signal(false);

  readonly form = this.fb.nonNullable.group({
    busId: ['', Validators.required],
    fechaServicio: [hoyGt(), Validators.required],
    taller: [''],
    observaciones: [''],
    lineas: this.fb.array<FormGroup>([]),
  });

  constructor() {
    effect(() => {
      if (!this.abierto()) return;
      this.form.reset({ busId: '', fechaServicio: hoyGt(), taller: '', observaciones: '' });
      this.lineas.clear();
      this.agregarLinea();
      this.taller.categorias(true).subscribe({
        next: (c) => this.categorias.set(c),
        error: (e) => this.avisos.error(mensajeError(e, 'No se pudieron cargar las categorías.')),
      });
    });
  }

  get lineas(): FormArray<FormGroup> {
    return this.form.controls.lineas;
  }

  agregarLinea(): void {
    this.lineas.push(
      this.fb.nonNullable.group({
        categoriaId: ['', Validators.required],
        descripcion: ['', [Validators.required, Validators.maxLength(255)]],
        tipo: ['MANO_OBRA' as TipoLinea, Validators.required],
        monto: [0, [Validators.required, Validators.min(0.01)]],
      }),
    );
  }

  quitarLinea(i: number): void {
    if (this.lineas.length > 1) this.lineas.removeAt(i);
  }

  total(): number {
    return this.lineas.controls.reduce((acc, g) => acc + (Number(g.value.monto) || 0), 0);
  }

  nombreCategoria(id: string): string {
    return this.categorias().find((c) => c.categoriaId === id)?.nombre ?? '';
  }

  guardar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const f = this.form.getRawValue();
    const lineas: LineaServicio[] = (f.lineas as LineaServicio[]).map((l) => ({
      categoriaId: l.categoriaId,
      descripcion: l.descripcion.trim(),
      tipo: l.tipo,
      monto: Number(l.monto),
    }));
    this.enviando.set(true);
    this.taller
      .registrar({ busId: f.busId, fechaServicio: f.fechaServicio, taller: f.taller?.trim() || null, observaciones: f.observaciones?.trim() || null, lineas })
      .subscribe({
        next: () => {
          this.enviando.set(false);
          this.avisos.exito('Servicio registrado.');
          this.guardado.emit();
        },
        error: (e) => {
          this.enviando.set(false);
          marcarErroresServidor(this.form, e);
          this.avisos.error(mensajeError(e, 'No se pudo registrar el servicio.'));
        },
      });
  }
}
