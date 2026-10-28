import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { EstadoAlquilerTarifa, TarifaReembolso } from '../../core/models/venta.model';
import { AuthService } from '../../core/services/auth.service';
import { TarifasReembolsoService } from '../../core/services/tarifas-reembolso.service';
import { marcarErroresServidor, mensajeError } from '../../core/utils/errores-http';
import { ModalComponent } from '../../shared/components/modal/modal.component';
import { ToastService } from '../../shared/services/toast.service';

const ESTADOS: EstadoAlquilerTarifa[] = ['SOLICITADO', 'COTIZADO', 'PAGADO', 'ASIGNADO', 'CUALQUIERA'];

const TEXTO_ESTADO: Record<EstadoAlquilerTarifa, string> = {
  SOLICITADO: 'Solicitado',
  COTIZADO: 'Cotizado',
  PAGADO: 'Pagado',
  ASIGNADO: 'Asignado',
  CUALQUIERA: 'Cualquier estado',
};

/**
 * Política de cancelación de alquileres: qué porcentaje se le devuelve al cliente según el estado del
 * alquiler y las horas que faltaban para la salida. La tabla vive en Sales, que es quien tiene la
 * orden de pago y ejecuta la devolución; Trips lleva una copia de solo lectura para poder rechazar
 * una cancelación fuera de plazo.
 *
 * Solo el administrador del sistema la edita. El estado y el tramo de horas identifican la tarifa, así
 * que no se editan: para mover un tramo se desactiva la fila y se crea otra.
 */
@Component({
  selector: 'app-tarifas-reembolso',
  standalone: true,
  imports: [ReactiveFormsModule, ModalComponent],
  templateUrl: './tarifas-reembolso.component.html',
  styleUrl: './tarifas-reembolso.component.scss',
})
export class TarifasReembolsoComponent implements OnInit {
  private readonly servicio = inject(TarifasReembolsoService);
  private readonly avisos = inject(ToastService);
  private readonly fb = inject(FormBuilder);

  readonly puedeEditar = inject(AuthService).tieneRol('ADMIN_SISTEMA');
  readonly estados = ESTADOS;

  private readonly tarifas = signal<TarifaReembolso[]>([]);
  readonly cargando = signal(true);
  readonly creando = signal(false);
  readonly enEdicion = signal<TarifaReembolso | null>(null);
  readonly enviando = signal(false);
  /** Las desactivadas se esconden: siguen ahí para explicar reembolsos viejos. */
  readonly verInactivas = signal(false);

  readonly formNueva = this.fb.nonNullable.group({
    estadoAlquiler: ['PAGADO' as EstadoAlquilerTarifa, Validators.required],
    horasMinimasAntes: [0, [Validators.required, Validators.min(0)]],
    permiteCancelacion: [true],
    porcentajeReembolso: [0, [Validators.required, Validators.min(0), Validators.max(100)]],
    justificacion: ['', [Validators.required, Validators.maxLength(255)]],
  });

  readonly formEditar = this.fb.nonNullable.group({
    permiteCancelacion: [true],
    porcentajeReembolso: [0, [Validators.required, Validators.min(0), Validators.max(100)]],
    justificacion: ['', [Validators.required, Validators.maxLength(255)]],
    activa: [true],
  });

  /** Agrupadas por estado y de mayor a menor anticipación: así se lee como la tabla de la política. */
  readonly visibles = computed(() => {
    const filas = this.verInactivas() ? this.tarifas() : this.tarifas().filter((t) => t.activa);
    return [...filas].sort(
      (a, b) =>
        ESTADOS.indexOf(a.estadoAlquiler) - ESTADOS.indexOf(b.estadoAlquiler)
        || b.horasMinimasAntes - a.horasMinimasAntes,
    );
  });

  readonly hayInactivas = computed(() => this.tarifas().some((t) => !t.activa));

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
        this.avisos.error(mensajeError(e, 'No se pudieron cargar las tarifas de reembolso.'));
      },
    });
  }

  textoEstado(e: EstadoAlquilerTarifa): string {
    return TEXTO_ESTADO[e];
  }

  /** El tramo en palabras: "24 h o más antes" o "último momento" para el tramo de cero. */
  tramo(t: TarifaReembolso): string {
    return t.horasMinimasAntes === 0
      ? 'Último momento'
      : `${t.horasMinimasAntes} h o más antes de la salida`;
  }

  abrirNueva(): void {
    this.formNueva.reset({
      estadoAlquiler: 'PAGADO',
      horasMinimasAntes: 0,
      permiteCancelacion: true,
      porcentajeReembolso: 0,
      justificacion: '',
    });
    this.creando.set(true);
  }

  crear(): void {
    if (this.formNueva.invalid) {
      this.formNueva.markAllAsTouched();
      return;
    }
    const f = this.formNueva.getRawValue();
    this.enviando.set(true);
    this.servicio
      .crear({
        estadoAlquiler: f.estadoAlquiler,
        horasMinimasAntes: Number(f.horasMinimasAntes),
        permiteCancelacion: f.permiteCancelacion,
        porcentajeReembolso: f.permiteCancelacion ? Number(f.porcentajeReembolso) : 0,
        justificacion: f.justificacion.trim(),
      })
      .subscribe({
        next: () => {
          this.enviando.set(false);
          this.creando.set(false);
          this.avisos.exito('Tarifa agregada.');
          this.cargar();
        },
        error: (e) => {
          this.enviando.set(false);
          marcarErroresServidor(this.formNueva, e);
          this.avisos.error(mensajeError(e, 'No se pudo agregar la tarifa.'));
        },
      });
  }

  abrirEditar(t: TarifaReembolso): void {
    this.formEditar.reset({
      permiteCancelacion: t.permiteCancelacion,
      porcentajeReembolso: t.porcentajeReembolso,
      justificacion: t.justificacion,
      activa: t.activa,
    });
    this.enEdicion.set(t);
  }

  guardar(): void {
    const t = this.enEdicion();
    if (!t) return;
    if (this.formEditar.invalid) {
      this.formEditar.markAllAsTouched();
      return;
    }
    const f = this.formEditar.getRawValue();
    this.enviando.set(true);
    this.servicio
      .actualizar(t.tarifaId, {
        permiteCancelacion: f.permiteCancelacion,
        porcentajeReembolso: f.permiteCancelacion ? Number(f.porcentajeReembolso) : 0,
        justificacion: f.justificacion.trim(),
        activa: f.activa,
        version: t.version,
      })
      .subscribe({
        next: () => {
          this.enviando.set(false);
          this.enEdicion.set(null);
          this.avisos.exito('Tarifa actualizada.');
          this.cargar();
        },
        error: (e) => {
          this.enviando.set(false);
          marcarErroresServidor(this.formEditar, e);
          this.avisos.error(mensajeError(e, 'No se pudo actualizar la tarifa.'));
        },
      });
  }
}
