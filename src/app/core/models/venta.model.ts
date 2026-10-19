/** Ventas de boletos e historial (Sales). */

export type EstadoVenta = 'PENDIENTE_PAGO' | 'CONFIRMADA' | 'RECHAZADA' | 'CANCELADA' | 'REEMBOLSADA';
export type CanalVenta = 'EN_LINEA' | 'PRESENCIAL';
export type MetodoPago = 'CARTERA' | 'EFECTIVO';

export interface Boleto {
  boletoId: string;
  numeroAsiento: number;
  precio: number;
  estado: string;
}

export interface Venta {
  ventaId: string;
  viajeId: string;
  canal: CanalVenta;
  clienteNit: string | null;
  clienteNombre: string | null;
  sucursalId: string;
  metodoPago: MetodoPago | null;
  montoTotal: number;
  fechaPago: string;
  /** Fecha y hora en que se registró la venta: ordena las del mismo día (la más reciente primero). */
  fechaRegistro?: string | null;
  estado: EstadoVenta;
  motivoRechazo: string | null;
  motivoCancelacion: string | null;
  fechaCancelacion: string | null;
  boletos: Boleto[];
  viaje: {
    origenNombre: string;
    destinoNombre: string;
    fechaSalida: string;
    busPlaca: string | null;
    precioBoleto: number;
  } | null;
  version: number;
}

export interface VentaPendiente {
  ventaId: string;
  estado: EstadoVenta;
  montoTotal: number;
  asientos: number[];
  reservadoHasta: string;
}

export interface NuevaVentaEnLinea {
  viajeId: string;
  asientos: number[];
  fechaPago: string;
}

export interface NuevaVentaMostrador {
  viajeId: string;
  asientos: number[];
  clienteNit?: string | null;
  clienteNombre?: string | null;
  clienteCorreo?: string | null;
  fechaPago: string;
}

export interface CancelarVenta {
  motivo: string;
  fechaCancelacion: string;
  version: number;
}

export interface FiltroVentas {
  viajeId?: string | null;
  sucursalId?: string | null;
  estado?: EstadoVenta | null;
  canal?: CanalVenta | null;
  desde?: string | null;
  hasta?: string | null;
}

export interface VentaHistorial {
  ventaId: string;
  canal: CanalVenta;
  origenNombre: string | null;
  destinoNombre: string | null;
  fechaSalida: string | null;
  asientos: number[];
  montoTotal: number;
  fechaPago: string;
  estado: EstadoVenta;
}

export interface AlquilerHistorial {
  ordenId: string;
  alquilerId: string;
  origen: string;
  destino: string;
  monto: number;
  metodoPago: MetodoPago | null;
  fechaPago: string | null;
  estado: EstadoOrdenAlquiler;
}

export interface Historial {
  nit: string | null;
  nombre: string | null;
  ventas: VentaHistorial[];
  alquileres: AlquilerHistorial[];
}

export type EstadoOrdenAlquiler = 'PENDIENTE_PAGO' | 'PAGADA' | 'RECHAZADA' | 'REEMBOLSADA';

export interface OrdenAlquiler {
  ordenId: string;
  alquilerId: string;
  sucursalId: string;
  clienteNit: string | null;
  clienteNombre: string | null;
  clienteCorreo: string | null;
  origen: string;
  destino: string;
  monto: number;
  metodoPago: MetodoPago | null;
  fechaPago: string | null;
  estado: EstadoOrdenAlquiler;
  motivoRechazo: string | null;
  version: number;
}

export interface FiltroOrdenes {
  sucursalId?: string | null;
  estado?: EstadoOrdenAlquiler | null;
}
