/** Choferes (Fleet). La foto y el contacto viven en Identity. */
import type { DatosCuenta, UsuarioExistente } from './sucursal.model';

export type EstadoChofer = 'ACTIVO' | 'INACTIVO';
export type TipoLicencia = 'A' | 'B' | 'C' | 'M' | 'E';

export interface Chofer {
  choferId: string;
  sucursalId: string;
  usuarioId: string;
  nombreCompleto: string;
  numeroLicencia: string;
  tipoLicencia: TipoLicencia;
  fechaVencimientoLicencia: string;
  salarioBaseViaje: number;
  estado: EstadoChofer;
  version: number;
}

export interface NuevoChofer {
  sucursalId: string;
  numeroLicencia: string;
  tipoLicencia: TipoLicencia;
  fechaVencimientoLicencia: string;
  salarioBaseViaje: number;
  fechaRegistro: string;
  /** Exactamente uno de los dos: cuenta nueva o una persona que ya tiene cuenta. */
  cuenta?: DatosCuenta;
  usuarioExistente?: UsuarioExistente;
}

export interface ActualizarChofer {
  salarioBaseViaje: number;
  version: number;
}

export interface ActualizarLicencia {
  numeroLicencia: string;
  tipoLicencia: TipoLicencia;
  fechaVencimientoLicencia: string;
  fechaRegistro: string;
  version: number;
}
