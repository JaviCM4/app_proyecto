/** Buses (Fleet). Por ahora solo se usan para los filtros de reportes. */
export type EstadoBus = 'ACTIVO' | 'EN_RUTA' | 'EN_TALLER' | 'INACTIVO';

export interface Bus {
  busId: string;
  sucursalId: string;
  placa: string;
  marca: string;
  modelo: string;
  anioFabricacion: number;
  capacidadPasajeros: number;
  estado: EstadoBus;
  kilometrajeActual: number;
  fotoUrl: string;
  version: number;
}

export interface NuevoBus {
  sucursalId: string;
  placa: string;
  marca: string;
  modelo: string;
  anioFabricacion: number;
  capacidadPasajeros: number;
  kilometrajeActual?: number | null;
  fotoUrl: string;
  fechaRegistro: string;
}

export interface ActualizarBus {
  marca: string;
  modelo: string;
  anioFabricacion: number;
  capacidadPasajeros: number;
  fotoUrl: string;
  version: number;
}

/** Estados asignables a mano: ACTIVO, EN_TALLER o INACTIVO. */
export type EstadoBusManual = 'ACTIVO' | 'EN_TALLER' | 'INACTIVO';

export interface ViajeKilometraje {
  viajeId: string;
  kmInicial: number;
  kmFinal: number;
  kmRecorridos: number;
  fechaLlegada: string;
}

export interface BusDetalle extends Bus {
  ultimosViajes: ViajeKilometraje[];
}

export type TipoFotoFleet = 'BUS' | 'CHOFER';
