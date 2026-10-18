/** Cartera digital del cliente (wallet-service). */
export interface Cartera {
  carteraId: string;
  saldo: number;
  fechaActualizacion: string;
}

/** RECARGA, DEBITO y REEMBOLSO: cartera del cliente. COBRO y DEVOLUCION: billetera del sistema. */
export type TipoMovimiento = 'RECARGA' | 'DEBITO' | 'REEMBOLSO' | 'COBRO' | 'DEVOLUCION';
export type ReferenciaMovimiento = 'VENTA' | 'ALQUILER' | 'MANUAL';

export interface MovimientoCartera {
  id: string;
  tipo: TipoMovimiento;
  monto: number;
  saldoResultante: number;
  tipoReferencia: ReferenciaMovimiento;
  referenciaId: string | null;
  fechaMovimiento: string;
}

/** Billetera del sistema: recibe las compras en línea y paga los reembolsos (solo administrador del sistema). */
export interface CarteraSistema {
  carteraId: string;
  saldo: number;
  totalCobrado: number;
  totalDevuelto: number;
  fechaActualizacion: string;
}
