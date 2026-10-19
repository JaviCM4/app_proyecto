import { CanalVenta, EstadoOrdenAlquiler, EstadoVenta, MetodoPago } from '../../core/models/venta.model';

/** Texto e insignia de cada estado de venta (nunca se muestra el código). */
export const ESTADO_VENTA: Record<EstadoVenta, { texto: string; clase: string }> = {
  PENDIENTE_PAGO: { texto: 'Pendiente de pago', clase: 'aviso' },
  CONFIRMADA: { texto: 'Confirmada', clase: 'exito' },
  RECHAZADA: { texto: 'Rechazada', clase: 'peligro' },
  CANCELADA: { texto: 'Cancelada', clase: '' },
  REEMBOLSADA: { texto: 'Reembolsada', clase: 'info' },
};

export const CANAL_VENTA: Record<CanalVenta, string> = {
  EN_LINEA: 'En línea',
  PRESENCIAL: 'Presencial',
};

export const METODO_PAGO: Record<MetodoPago, string> = {
  CARTERA: 'Cartera digital',
  EFECTIVO: 'Efectivo',
};

/** Pago de una orden de alquiler. */
export const ESTADO_ORDEN_ALQUILER: Record<EstadoOrdenAlquiler, { texto: string; clase: string }> = {
  PENDIENTE_PAGO: { texto: 'Pendiente de pago', clase: 'aviso' },
  PAGADA: { texto: 'Pagada', clase: 'exito' },
  RECHAZADA: { texto: 'Rechazada', clase: 'peligro' },
  REEMBOLSADA: { texto: 'Reembolsada', clase: 'info' },
};

/** Texto de un viaje para listas y filtros: "Xela → Guate · 19/10/2026 08:00". */
export function textoViaje(origen: string | null | undefined, destino: string | null | undefined,
                           salida: string | null | undefined): string {
  const ruta = `${origen || '—'} → ${destino || '—'}`;
  if (!salida) return ruta;
  const fecha = new Date(salida);
  if (Number.isNaN(fecha.getTime())) return ruta;
  const f = new Intl.DateTimeFormat('es-GT', {
    timeZone: 'America/Guatemala', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit',
    minute: '2-digit', hour12: false,
  }).format(fecha);
  return `${ruta} · ${f.replace(',', '')}`;
}
