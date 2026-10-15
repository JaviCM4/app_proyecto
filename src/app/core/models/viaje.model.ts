/** Modelos de rutas, viajes y asientos (Trips y Sales). */

export interface Ruta {
  rutaId: string;
  sucursalOrigenId: string;
  origenNombre: string;
  sucursalDestinoId: string;
  destinoNombre: string;
  distanciaKm: number;
  precioBoleto: number;
  activa: boolean;
  version: number;
}

export type EstadoViaje = 'PROGRAMADO' | 'EN_RUTA' | 'COMPLETADO';

export interface Viaje {
  viajeId: string;
  tipo: 'REGULAR' | 'PRIVADO';
  rutaId: string | null;
  alquilerId: string | null;
  sucursalId: string;
  origenNombre: string;
  destinoNombre: string;
  busId: string;
  busPlaca: string | null;
  choferId: string;
  choferNombre: string | null;
  capacidad: number;
  precioBoleto: number | null;
  fechaSalidaProgramada: string;
  fechaLlegadaEstimada: string;
  estado: EstadoViaje;
  version: number;
}

export interface FiltroViajes {
  sucursalId?: string | null;
  rutaId?: string | null;
  desde?: string | null;
  hasta?: string | null;
}

export interface MapaAsientos {
  viajeId: string;
  origenNombre: string;
  destinoNombre: string;
  fechaSalida: string;
  busPlaca: string | null;
  precioBoleto: number;
  capacidad: number;
  disponibles: number;
  asientos: { numero: number; estado: 'DISPONIBLE' | 'OCUPADO' }[];
}
