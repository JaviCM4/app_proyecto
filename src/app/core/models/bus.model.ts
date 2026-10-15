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
