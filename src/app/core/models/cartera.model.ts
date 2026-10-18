/** Cartera digital del cliente (wallet-service). */
export interface Cartera {
  carteraId: string;
  saldo: number;
  fechaActualizacion: string;
}

export type TipoMovimiento = 'RECARGA' | 'DEBITO' | 'REEMBOLSO';
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
