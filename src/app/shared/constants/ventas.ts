import { EstadoViaje } from '../../core/models/viaje.model';
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

/** Estado de un viaje, en el orden en que se muestran (primero los que aún se pueden vender o están en curso). */
export const ESTADO_VIAJE: Record<EstadoViaje, { texto: string; clase: string; orden: number }> = {
  EN_RUTA: { texto: 'En ruta', clase: 'info', orden: 0 },
  PROGRAMADO: { texto: 'Programado', clase: 'exito', orden: 1 },
  COMPLETADO: { texto: 'Completado', clase: '', orden: 2 },
};

/**
 * Motivos que el backend guarda como código (motivo_rechazo de una venta o de una orden). Son parte
 * de la saga de pago, no texto para el usuario: aquí se traducen a algo que se pueda leer.
 */
const MOTIVOS: Record<string, string> = {
  SALDO_INSUFICIENTE: 'La billetera digital no tenía saldo suficiente.',
  USUARIO_INACTIVO: 'La cuenta del cliente está inactiva.',
  CARTERA_INEXISTENTE: 'El cliente todavía no tiene billetera digital.',
  TIEMPO_AGOTADO: 'Se agotó el tiempo para pagar y los asientos se liberaron.',
  VIAJE_ELIMINADO: 'El viaje fue eliminado.',
  VIAJE_NO_DISPONIBLE: 'El viaje ya no estaba disponible cuando se cobró.',
  DEBITO_TARDIO: 'El cobro llegó cuando la compra ya no podía completarse; el dinero se devolvió.',
  VENTA_CANCELADA: 'La venta fue cancelada.',
  RECHAZADO: 'El pago fue rechazado.',
};

/**
 * Motivo en palabras. Los motivos escritos por una persona (la cancelación de un administrador, o el
 * motivo de un viaje eliminado) no están en la tabla y se devuelven tal cual.
 */
export function textoMotivo(motivo: string | null | undefined, porDefecto = ''): string {
  const limpio = (motivo ?? '').trim();
  if (!limpio) return porDefecto;
  return MOTIVOS[limpio.toUpperCase()] ?? limpio;
}

/**
 * Código del boleto impreso: los primeros 12 caracteres del id de la venta, en mayúsculas. Es lo que
 * lleva el código de barras del talón y lo que se busca en Reembolsos. Se calcula también en el
 * frontend para que el boleto se pueda imprimir aunque la respuesta no traiga el campo.
 */
export function codigoBoleto(venta: { codigo?: string | null; ventaId: string }): string {
  return (venta.codigo ?? venta.ventaId.replace(/-/g, '').slice(0, 12)).toUpperCase();
}

/** El mismo código en grupos de cuatro, para leerlo o dictarlo por teléfono: A1B2-C3D4-E5F6. */
export function codigoLegible(codigo: string): string {
  return codigo.replace(/(.{4})(?=.)/g, '$1-');
}

/** Más reciente primero: por fecha de pago y, el mismo día, por la hora en que se registró. */
export function ordenarVentas<T extends { fechaPago: string | null; fechaRegistro?: string | null }>(lista: T[]): T[] {
  return [...lista].sort(
    (a, b) =>
      (b.fechaPago ?? '').localeCompare(a.fechaPago ?? '') ||
      (b.fechaRegistro ?? '').localeCompare(a.fechaRegistro ?? ''),
  );
}

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
