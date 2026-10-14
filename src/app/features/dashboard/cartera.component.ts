import { Component, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CarteraService } from '../../core/services/cartera.service';
import { ToastService } from '../../shared/toast.service';
import { WalletMovementResponse, WalletResponse } from '../../core/models/identity.model';
import { mensajeError } from '../../shared/mensaje-error';

@Component({
  selector: 'app-cartera',
  standalone: true,
  imports: [FormsModule],
  template: `
    <section class="mx-auto max-w-6xl px-4 py-8">
      <h1 class="page-title">Mi cartera</h1>
      <p class="page-subtitle">GET /identity/cartera · POST /identity/cartera/recargas · GET /identity/cartera/movimientos.</p>

      <div class="mt-4 grid gap-4 md:grid-cols-3">
        <div class="rounded-2xl bg-azul p-6 text-white">
          <p class="text-sm text-white/70">Saldo actual</p>
          <p class="text-3xl font-black text-menta">Q {{ saldo?.saldo ?? '—' }}</p>
          @if (saldo) { <p class="mt-1 text-xs text-white/60">Actualizado: {{ saldo.fechaActualizacion }}</p> }
        </div>
        <div class="card md:col-span-2">
          <h2 class="font-bold text-azul">Recargar</h2>
          <form class="mt-3 grid gap-3 md:grid-cols-3" (ngSubmit)="recargar()" #f="ngForm">
            <div class="field !mb-0">
              <label class="label" for="monto">Monto (Q)</label>
              <input class="input" id="monto" name="monto" type="number" step="0.01" min="0.01" required [(ngModel)]="monto" />
            </div>
            <div class="field !mb-0">
              <label class="label" for="fechaMov">Fecha (opcional)</label>
              <input class="input" id="fechaMov" name="fechaMov" type="date" [(ngModel)]="fechaMov" />
            </div>
            <div class="flex items-end">
              <button type="submit" class="btn-menta w-full" [disabled]="recargando || f.invalid">{{ recargando ? 'Recargando…' : 'Recargar' }}</button>
            </div>
          </form>
        </div>
      </div>

      <div class="card mt-4">
        <h2 class="font-bold text-azul">Movimientos</h2>
        <div class="mt-3 flex flex-wrap items-end gap-3">
          <div class="field !mb-0"><label class="label" for="desde">Desde</label><input class="input" id="desde" type="date" [(ngModel)]="desde" /></div>
          <div class="field !mb-0"><label class="label" for="hasta">Hasta</label><input class="input" id="hasta" type="date" [(ngModel)]="hasta" /></div>
          <button type="button" class="btn-primary" (click)="cargarMovimientos()">Consultar</button>
        </div>
      </div>

      <div class="table-wrap mt-4">
        <table class="table">
          <thead><tr><th>Fecha</th><th>Tipo</th><th>Monto</th><th>Saldo resultante</th><th>Referencia</th></tr></thead>
          <tbody>
            @for (m of movimientos; track m.id) {
              <tr>
                <td>{{ m.fechaMovimiento }}</td>
                <td><span class="badge-activo">{{ m.tipo }}</span></td>
                <td>Q {{ m.monto }}</td>
                <td>Q {{ m.saldoResultante }}</td>
                <td class="text-cafe">{{ m.tipoReferencia }}</td>
              </tr>
            } @empty {
              <tr><td colspan="5" class="!text-center text-cafe">Sin movimientos en el rango.</td></tr>
            }
          </tbody>
        </table>
      </div>
      @if (error) { <div class="card mt-4"><p class="error-text">{{ error }}</p></div> }
    </section>
  `,
})
export class CarteraComponent implements OnInit {
  private readonly cartera = inject(CarteraService);
  private readonly avisos = inject(ToastService);

  saldo: WalletResponse | null = null;
  movimientos: WalletMovementResponse[] = [];
  monto = 0;
  fechaMov = '';
  desde = '';
  hasta = '';
  error = '';
  recargando = false;

  ngOnInit(): void {
    this.cargarSaldo();
    this.cargarMovimientos();
  }

  cargarSaldo(): void {
    this.cartera.saldo().subscribe({
      next: (res) => (this.saldo = res),
      error: (e) => (this.error = mensajeError(e, 'No se pudo cargar el saldo.')),
    });
  }

  cargarMovimientos(): void {
    this.cartera.movimientos(this.desde || undefined, this.hasta || undefined).subscribe({
      next: (res) => (this.movimientos = res),
      error: (e) => (this.error = mensajeError(e, 'No se pudieron cargar los movimientos.')),
    });
  }

  recargar(): void {
    this.recargando = true;
    this.cartera.recargar(this.monto, this.fechaMov || undefined).subscribe({
      next: () => {
        this.recargando = false;
        this.avisos.success('Recarga registrada.');
        this.monto = 0;
        this.fechaMov = '';
        this.cargarSaldo();
        this.cargarMovimientos();
      },
      error: (e) => {
        this.recargando = false;
        this.avisos.error(mensajeError(e, 'No se pudo registrar la recarga.'));
      },
    });
  }
}
