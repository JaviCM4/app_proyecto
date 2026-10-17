import { CurrencyPipe, DatePipe } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { EstadoViaje, Viaje, ViajeDetalle } from '../../../core/models/viaje.model';
import { ViajesService } from '../../../core/services/viajes.service';
import { marcarErroresServidor, mensajeError } from '../../../core/utils/errores-http';
import { ZONA_GT, ahoraGt, fechaHoraGt } from '../../../core/utils/fechas';
import { ModalComponent } from '../../../shared/components/modal/modal.component';
import { PaginadorComponent } from '../../../shared/components/paginador/paginador.component';
import { ToastService } from '../../../shared/services/toast.service';
import { paginar } from '../../../shared/utils/paginacion';

type FiltroEstado = 'TODAS' | EstadoViaje;

/**
 * Vista del piloto (CHOFER): sus viajes asignados y el registro de la salida y la llegada.
 * Solo maneja los viajes que el backend le devuelve en /trips/viajes/mios.
 */
@Component({
  selector: 'app-mis-viajes-chofer',
  standalone: true,
  imports: [FormsModule, ReactiveFormsModule, DatePipe, CurrencyPipe, ModalComponent, PaginadorComponent],
  templateUrl: './mis-viajes.component.html',
  styleUrl: './mis-viajes.component.scss',
})
export class MisViajesChoferComponent implements OnInit {
  private readonly servicio = inject(ViajesService);
  private readonly avisos = inject(ToastService);
  private readonly fb = inject(FormBuilder);

  readonly zona = ZONA_GT;

  private readonly viajes = signal<Viaje[]>([]);
  readonly cargando = signal(true);

  readonly estado = signal<FiltroEstado>('TODAS');
  readonly desde = signal('');
  readonly hasta = signal('');
  readonly pagina = signal(1);
  readonly tamano = signal(9);

  readonly enSalida = signal<Viaje | null>(null);
  readonly enLlegada = signal<Viaje | null>(null);
  readonly enviando = signal(false);

  readonly detalleVisible = signal(false);
  readonly cargandoDetalle = signal(false);
  readonly enDetalle = signal<ViajeDetalle | null>(null);

  readonly formSalida = this.fb.nonNullable.group({
    fechaHora: [ahoraGt(), Validators.required],
    kmInicial: [null as number | null, [Validators.required, Validators.min(0)]],
  });

  readonly formLlegada = this.fb.nonNullable.group({
    fechaHora: [ahoraGt(), Validators.required],
    kmFinal: [null as number | null, [Validators.required, Validators.min(0)]],
    costoCombustible: [null as number | null, [Validators.required, Validators.min(0)]],
  });

  readonly filtrados = computed(() => {
    const estado = this.estado();
    return this.viajes().filter((v) => estado === 'TODAS' || v.estado === estado);
  });

  readonly paginaActual = computed(() => paginar(this.filtrados(), this.pagina(), this.tamano()));

  ngOnInit(): void {
    this.cargar();
  }

  cargar(): void {
    this.cargando.set(true);
    this.servicio
      .mios({ desde: this.desde() || null, hasta: this.hasta() || null })
      .subscribe({
        next: (lista) => {
          this.viajes.set(lista);
          this.cargando.set(false);
        },
        error: (e) => {
          this.cargando.set(false);
          this.avisos.error(mensajeError(e, 'No se pudieron cargar tus viajes.'));
        },
      });
  }

  cambiarEstado(valor: FiltroEstado): void {
    this.estado.set(valor);
    this.pagina.set(1);
  }

  limpiarFechas(): void {
    this.desde.set('');
    this.hasta.set('');
    this.cargar();
  }

  verDetalle(v: Viaje): void {
    this.cargandoDetalle.set(true);
    this.enDetalle.set(null);
    this.detalleVisible.set(true);
    this.servicio.detalleViaje(v.viajeId).subscribe({
      next: (detalle) => {
        this.cargandoDetalle.set(false);
        this.enDetalle.set(detalle);
      },
      error: (e) => {
        this.cargandoDetalle.set(false);
        this.avisos.error(mensajeError(e, 'No se pudo cargar el detalle del viaje.'));
      },
    });
  }

  abrirSalida(v: Viaje): void {
    this.formSalida.reset({ fechaHora: ahoraGt(), kmInicial: null });
    this.enSalida.set(v);
  }

  confirmarSalida(): void {
    const v = this.enSalida();
    if (!v) return;
    if (this.formSalida.invalid) {
      this.formSalida.markAllAsTouched();
      return;
    }
    const f = this.formSalida.getRawValue();
    this.enviando.set(true);
    this.servicio
      .registrarSalida(v.viajeId, { fechaHoraSalida: fechaHoraGt(f.fechaHora), kmInicial: Number(f.kmInicial) })
      .subscribe({
        next: (detalle) => {
          this.enviando.set(false);
          this.enSalida.set(null);
          this.avisos.exito('Salida registrada. Buen viaje.');
          this.enDetalle.set(detalle);
          this.detalleVisible.set(true);
          this.cargar();
        },
        error: (e) => {
          this.enviando.set(false);
          marcarErroresServidor(this.formSalida, e);
          this.avisos.error(mensajeError(e, 'No se pudo registrar la salida.'));
        },
      });
  }

  abrirLlegada(v: Viaje): void {
    this.formLlegada.reset({ fechaHora: ahoraGt(), kmFinal: null, costoCombustible: null });
    this.enLlegada.set(v);
  }

  confirmarLlegada(): void {
    const v = this.enLlegada();
    if (!v) return;
    if (this.formLlegada.invalid) {
      this.formLlegada.markAllAsTouched();
      return;
    }
    const f = this.formLlegada.getRawValue();
    this.enviando.set(true);
    this.servicio
      .registrarLlegada(v.viajeId, {
        fechaHoraLlegada: fechaHoraGt(f.fechaHora),
        kmFinal: Number(f.kmFinal),
        costoCombustible: Number(f.costoCombustible),
      })
      .subscribe({
        next: (detalle) => {
          this.enviando.set(false);
          this.enLlegada.set(null);
          this.avisos.exito('Llegada registrada. Viaje completado.');
          this.enDetalle.set(detalle);
          this.detalleVisible.set(true);
          this.cargar();
        },
        error: (e) => {
          this.enviando.set(false);
          marcarErroresServidor(this.formLlegada, e);
          this.avisos.error(mensajeError(e, 'No se pudo registrar la llegada.'));
        },
      });
  }

  cerrarDetalle(): void {
    this.detalleVisible.set(false);
    this.enDetalle.set(null);
  }
}
