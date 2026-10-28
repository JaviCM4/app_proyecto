import { CurrencyPipe } from '@angular/common';
import { Component, computed, input } from '@angular/core';
import { PoliticaCancelacion } from '../../../core/models/viaje.model';

/**
 * Qué pasa si se cancela el alquiler ahora: si se permite, cuánto se devuelve y por qué.
 * Lo usan el cliente (Mis alquileres) y la ventanilla (Alquileres) antes de confirmar, con la
 * política que resuelve Trips a partir de la tabla de tarifas de Sales.
 *
 * Es solo presentación: quien lo usa carga la política y la pasa por `politica`.
 */
@Component({
  selector: 'app-aviso-cancelacion',
  standalone: true,
  imports: [CurrencyPipe],
  templateUrl: './aviso-cancelacion.component.html',
  styleUrl: './aviso-cancelacion.component.scss',
})
export class AvisoCancelacionComponent {
  readonly politica = input<PoliticaCancelacion | null>(null);
  readonly cargando = input(false);

  /** "en 2 días", "en 18 horas" o "el viaje ya debió salir": el plazo en palabras. */
  readonly plazo = computed(() => {
    const horas = this.politica()?.horasAntesDeSalida;
    if (horas === undefined || horas === null) return '';
    if (horas < 0) return 'el viaje ya debió salir';
    if (horas === 0) return 'falta menos de una hora para la salida';
    if (horas < 48) return `faltan ${horas} ${horas === 1 ? 'hora' : 'horas'} para la salida`;
    return `faltan ${Math.floor(horas / 24)} días para la salida`;
  });

  /** Se devuelve algo solo si hay porcentaje y el alquiler ya se había pagado. */
  readonly hayDevolucion = computed(() => {
    const p = this.politica();
    return !!p && p.permiteCancelacion && p.porcentajeReembolso > 0 && p.montoEstimadoReembolso !== null;
  });

  /** Sin monto estimado el alquiler no se pagó: no hay nada que devolver. */
  readonly sinPago = computed(() => {
    const p = this.politica();
    return !!p && p.permiteCancelacion && p.montoEstimadoReembolso === null;
  });
}
