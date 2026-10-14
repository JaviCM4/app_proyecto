import { Component, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TarifasService } from '../../core/services/tarifas.service';
import { ToastService } from '../../shared/toast.service';
import { DepreciationRateResponse } from '../../core/models/identity.model';
import { mensajeError } from '../../shared/mensaje-error';

@Component({
  selector: 'app-tarifas',
  standalone: true,
  imports: [FormsModule],
  template: `
    <section class="mx-auto max-w-6xl px-4 py-8">
      <h1 class="page-title">Tarifas de depreciación</h1>
      <p class="page-subtitle">GET /identity/tarifas-depreciacion · GET ?vigenteEn=YYYY-MM-DD · POST (ADMIN_SISTEMA).</p>

      <div class="card mt-4">
        <h2 class="font-bold text-azul">Vigente en fecha</h2>
        <div class="mt-3 flex flex-wrap items-end gap-3">
          <div class="field !mb-0">
            <label class="label" for="fecha">Fecha</label>
            <input class="input" id="fecha" type="date" [(ngModel)]="fecha" />
          </div>
          <button type="button" class="btn-cafe" (click)="consultarVigente()" [disabled]="!fecha">Consultar</button>
        </div>
        @if (vigente) {
          <p class="mt-3 text-sm">Vigente el {{ vigente.vigenteDesde }}: <strong class="text-azul">Q {{ vigente.montoPorKm }} / km</strong></p>
        }
      </div>

      <div class="table-wrap mt-4">
        <table class="table">
          <thead><tr><th>Monto / km</th><th>Vigente desde</th><th>Creada</th></tr></thead>
          <tbody>
            @for (t of lista; track t.tarifaId) {
              <tr><td>Q {{ t.montoPorKm }}</td><td>{{ t.vigenteDesde }}</td><td>{{ t.fechaCreacion }}</td></tr>
            } @empty {
              <tr><td colspan="3" class="!text-center text-cafe">Sin tarifas.</td></tr>
            }
          </tbody>
        </table>
      </div>
      @if (error) { <div class="card mt-4"><p class="error-text">{{ error }}</p></div> }

      <div class="card mt-4">
        <h2 class="font-bold text-azul">Crear tarifa (ADMIN_SISTEMA)</h2>
        <form class="mt-3 grid gap-3 md:grid-cols-3" (ngSubmit)="crear()" #f="ngForm">
          <div class="field !mb-0">
            <label class="label" for="monto">Monto por km</label>
            <input class="input" id="monto" name="monto" type="number" step="0.0001" min="0.0001" required [(ngModel)]="nueva.monto" />
          </div>
          <div class="field !mb-0">
            <label class="label" for="vigencia">Vigente desde</label>
            <input class="input" id="vigencia" name="vigencia" type="date" required [(ngModel)]="nueva.desde" />
          </div>
          <div class="flex items-end">
            <button type="submit" class="btn-menta w-full" [disabled]="creando || f.invalid">{{ creando ? 'Creando…' : 'Crear tarifa' }}</button>
          </div>
        </form>
      </div>
    </section>
  `,
})
export class TarifasComponent implements OnInit {
  private readonly tarifas = inject(TarifasService);
  private readonly avisos = inject(ToastService);

  lista: DepreciationRateResponse[] = [];
  vigente: DepreciationRateResponse | null = null;
  fecha = '';
  nueva = { monto: 0, desde: '' };
  error = '';
  creando = false;

  ngOnInit(): void {
    this.cargar();
  }

  cargar(): void {
    this.tarifas.listar().subscribe({
      next: (res) => (this.lista = res),
      error: (e) => (this.error = mensajeError(e, 'No se pudieron listar las tarifas.')),
    });
  }

  consultarVigente(): void {
    this.vigente = null;
    this.tarifas.vigente(this.fecha).subscribe({
      next: (res) => (this.vigente = res),
      error: (e) => this.avisos.error(mensajeError(e, 'No hay tarifa vigente en esa fecha.')),
    });
  }

  crear(): void {
    this.creando = true;
    this.tarifas.crear(this.nueva.monto, this.nueva.desde).subscribe({
      next: () => {
        this.creando = false;
        this.avisos.success('Tarifa creada.');
        this.nueva = { monto: 0, desde: '' };
        this.cargar();
      },
      error: (e) => {
        this.creando = false;
        this.avisos.error(mensajeError(e, 'No se pudo crear la tarifa.'));
      },
    });
  }
}
