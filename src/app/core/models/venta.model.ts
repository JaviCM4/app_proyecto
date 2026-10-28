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
  /** Código del boleto impreso (12 caracteres): lo que lleva el código de barras del talón. */
  codigo?: string | null;
  viajeId: string;
  canal: CanalVenta;
  clienteNit: string | null;
  clienteNombre: string | null;
  /** Correo del cliente: si existe, Notification envía el comprobante de la compra. */
  clienteCorreo: string | null;
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
  /** Cuándo volvió el dinero: la cartera lo devuelve sola, el efectivo lo entrega la sucursal. */
  fechaReembolso?: string | null;
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

/** Reembolso de una venta cancelada: solo la version, para que no se reembolse dos veces. */
export interface ReembolsarVenta {
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

/** Cliente con cuenta en el sistema, como lo devuelve el buscador de la ventanilla. */
export interface ClienteCuenta {
  usuarioId: string;
  nit: string;
  nombre: string;
  correo: string;
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

export type EstadoOrdenAlquiler = 'PENDIENTE_PAGO' | 'PAGADA' | 'RECHAZADA' | 'CANCELADA' | 'REEMBOLSADA';

export interface OrdenAlquiler {
  ordenId: string;
  alquilerId: string;
  sucursalId: string;
  clienteNit: string | null;
  clienteNombre: string | null;
  clienteCorreo: string | null;
  origen: string;
  destino: string;
  /** Puntos que el cliente marcó en el mapa al pedir el alquiler; null si no los marcó. */
  origenLatitud?: number | null;
  origenLongitud?: number | null;
  destinoLatitud?: number | null;
  destinoLongitud?: number | null;
  /** Intervalo del alquiler, para saber de qué viaje era la orden en la pantalla de reembolsos. */
  fechaSalida?: string | null;
  fechaRetorno?: string | null;
  monto: number;
  metodoPago: MetodoPago | null;
  fechaPago: string | null;
  estado: EstadoOrdenAlquiler;
  motivoRechazo: string | null;
  // ----- Cancelación del alquiler y devolución del dinero -----
  fechaCancelacion?: string | null;
  motivoCancelacion?: string | null;
  /** Horas que faltaban para la salida al cancelar: explica qué tramo de la tarifa se aplicó. */
  horasAntesViaje?: number | null;
  porcentajeReembolso?: number | null;
  justificacionReembolso?: string | null;
  /** Lo que le toca al cliente según la tarifa. 0 si no se había pagado o no hay derecho. */
  montoReembolsado?: number | null;
  fechaReembolso?: string | null;
  /** Quién entregó el efectivo en la ventanilla; null cuando lo devolvió la cartera. */
  reembolsadoPor?: string | null;
  /** true mientras quede dinero por entregarle al cliente. */
  reembolsoPendiente?: boolean;
  version: number;
}

/** A qué estado del alquiler aplica una tarifa de reembolso. CUALQUIERA es el comodín. */
export type EstadoAlquilerTarifa = 'SOLICITADO' | 'COTIZADO' | 'PAGADO' | 'ASIGNADO' | 'CUALQUIERA';

/** Una fila de tarifas_reembolso (Sales): cuánto se devuelve al cancelar un alquiler. */
export interface TarifaReembolso {
  tarifaId: string;
  estadoAlquiler: EstadoAlquilerTarifa;
  /** Horas mínimas antes de la salida para que esta tarifa aplique (0 = tramo de último momento). */
  horasMinimasAntes: number;
  permiteCancelacion: boolean;
  porcentajeReembolso: number;
  justificacion: string;
  activa: boolean;
  version: number;
}

export interface NuevaTarifaReembolso {
  estadoAlquiler: EstadoAlquilerTarifa;
  horasMinimasAntes: number;
  permiteCancelacion: boolean;
  porcentajeReembolso: number;
  justificacion: string;
}

/** El estado y el tramo de horas identifican la tarifa: no se editan. */
export interface ActualizarTarifaReembolso {
  permiteCancelacion: boolean;
  porcentajeReembolso: number;
  justificacion: string;
  activa: boolean;
  version: number;
}

/** La tarifa ya resuelta para un estado y unas horas concretas. */
export interface ReglaReembolso {
  tarifaId: string | null;
  permiteCancelacion: boolean;
  porcentajeReembolso: number;
  justificacion: string;
  horasMinimasAntes: number | null;
}

export interface FiltroOrdenes {
  sucursalId?: string | null;
  estado?: EstadoOrdenAlquiler | null;
}
