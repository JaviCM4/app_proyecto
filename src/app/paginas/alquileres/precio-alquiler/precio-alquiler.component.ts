import { CurrencyPipe, DatePipe } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ConfigAlquiler } from '../../../core/models/viaje.model';
import { AlquileresService } from '../../../core/services/alquileres.service';
import { AuthService } from '../../../core/services/auth.service';
import { mensajeError } from '../../../core/utils/errores-http';
import { hoyGt } from '../../../core/utils/fechas';
import { ModalComponent } from '../../../shared/components/modal/modal.component';
import { PaginadorComponent } from '../../../shared/components/paginador/paginador.component';
import { ToastService } from '../../../shared/services/toast.service';
import { paginar } from '../../../shared/utils/paginacion';

/**
 * Precio por km con el que se cotizan los alquileres privados.
 * Sin un precio vigente no se pueden crear solicitudes de alquiler.
 * Solo el administrador del sistema lo registra; una tarifa nueva reemplaza a la anterior desde su fecha.
 */
@Component({
  selector: 'app-precio-alquiler',
  standalone: true,
  imports: [ReactiveFormsModule, CurrencyPipe, DatePipe, ModalComponent, PaginadorComponent],
  templateUrl: './precio-alquiler.component.html',
  styleUrl: './precio-alquiler.component.scss',
})
export class PrecioAlquilerComponent implements OnInit {
  private readonly servicio = inject(AlquileresService);
  private readonly avisos = inject(ToastService);
  readonly puedeCrear = inject(AuthService).tieneRol('ADMIN_SISTEMA');

  private readonly precios = signal<ConfigAlquiler[]>([]);
  readonly cargando = signal(true);
  readonly pagina = signal(1);
  readonly tamano = signal(10);
  readonly creando = signal(false);
  readonly enviando = signal(false);

  /** El precio que se aplica hoy: el de fecha más reciente que ya empezó. */
  readonly vigente = computed<ConfigAlquiler | null>(() => {
    const hoy = hoyGt();
    return (
      this.precios()
        .filter((p) => p.vigenteDesde <= hoy)
        .sort((a, b) => b.vigenteDesde.localeCompare(a.vigenteDesde))[0] ?? null
    );
  });
  readonly paginaActual = computed(() => paginar(this.precios(), this.pagina(), this.tamano()));

  readonly form = inject(FormBuilder).group({
    precioPorKm: [null as number | null, [Validators.required, Validators.min(0.01)]],
    vigenteDesde: [hoyGt(), Validators.required],
  });

  ngOnInit(): void {
    this.cargar();
  }

  cargar(): void {
    this.cargando.set(true);
    this.servicio.historialPrecio().subscribe({
      next: (lista) => {
        this.precios.set(lista);
        this.cargando.set(false);
      },
      error: (e) => {
        this.cargando.set(false);
        this.avisos.error(mensajeError(e, 'No se pudieron cargar los precios de alquiler.'));
      },
    });
  }

  abrirNuevo(): void {
    this.form.reset({ precioPorKm: null, vigenteDesde: hoyGt() });
    this.creando.set(true);
  }

  crear(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const { precioPorKm, vigenteDesde } = this.form.getRawValue();
    this.enviando.set(true);
    this.servicio.registrarPrecio({ precioPorKm: Number(precioPorKm), vigenteDesde: vigenteDesde! }).subscribe({
      next: () => {
        this.enviando.set(false);
        this.creando.set(false);
        this.avisos.exito('Precio de alquiler registrado.');
        this.cargar();
      },
      error: (e) => {
        this.enviando.set(false);
        this.avisos.error(mensajeError(e, 'No se pudo registrar el precio.'));
      },
    });
  }
}
