import { CurrencyPipe, DatePipe } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { TarifaDepreciacion } from '../../core/models/tarifa.model';
import { AuthService } from '../../core/services/auth.service';
import { TarifasService } from '../../core/services/tarifas.service';
import { mensajeError } from '../../core/utils/errores-http';
import { hoyGt } from '../../core/utils/fechas';
import { ModalComponent } from '../../shared/components/modal/modal.component';
import { PaginadorComponent } from '../../shared/components/paginador/paginador.component';
import { ToastService } from '../../shared/services/toast.service';
import { paginar } from '../../shared/utils/paginacion';

/**
 * Tarifas de depreciación por km. Se usan al registrar la llegada de cada viaje.
 * Solo el administrador del sistema crea tarifas; no se editan (una tarifa nueva reemplaza a la anterior desde su fecha).
 */
@Component({
  selector: 'app-tarifas',
  standalone: true,
  imports: [ReactiveFormsModule, CurrencyPipe, DatePipe, ModalComponent, PaginadorComponent],
  templateUrl: './tarifas.component.html',
  styleUrl: './tarifas.component.scss',
})
export class TarifasComponent implements OnInit {
  private readonly servicio = inject(TarifasService);
  private readonly avisos = inject(ToastService);
  readonly puedeCrear = inject(AuthService).tieneRol('ADMIN_SISTEMA');

  private readonly tarifas = signal<TarifaDepreciacion[]>([]);
  readonly cargando = signal(true);
  readonly pagina = signal(1);
  readonly tamano = signal(10);
  readonly creando = signal(false);
  readonly enviando = signal(false);

  /** La tarifa que se aplica hoy: la de fecha más reciente que ya empezó. */
  readonly vigente = computed<TarifaDepreciacion | null>(() => {
    const hoy = hoyGt();
    return this.tarifas().filter((t) => t.vigenteDesde <= hoy).sort((a, b) => b.vigenteDesde.localeCompare(a.vigenteDesde))[0] ?? null;
  });
  readonly paginaActual = computed(() => paginar(this.tarifas(), this.pagina(), this.tamano()));

  readonly form = inject(FormBuilder).group({
    montoPorKm: [null as number | null, [Validators.required, Validators.min(0.0001)]],
    vigenteDesde: [hoyGt(), Validators.required],
  });

  ngOnInit(): void {
    this.cargar();
  }

  cargar(): void {
    this.cargando.set(true);
    this.servicio.listar().subscribe({
      next: (lista) => {
        this.tarifas.set(lista);
        this.cargando.set(false);
      },
      error: (e) => {
        this.cargando.set(false);
        this.avisos.error(mensajeError(e, 'No se pudieron cargar las tarifas.'));
      },
    });
  }

  abrirNueva(): void {
    this.form.reset({ montoPorKm: null, vigenteDesde: hoyGt() });
    this.creando.set(true);
  }

  crear(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const { montoPorKm, vigenteDesde } = this.form.getRawValue();
    this.enviando.set(true);
    this.servicio.crear(Number(montoPorKm), vigenteDesde!).subscribe({
      next: () => {
        this.enviando.set(false);
        this.creando.set(false);
        this.avisos.exito('Tarifa registrada.');
        this.cargar();
      },
      error: (e) => {
        this.enviando.set(false);
        this.avisos.error(mensajeError(e, 'No se pudo registrar la tarifa.'));
      },
    });
  }
}
