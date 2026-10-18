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
  estado?: EstadoViaje | null;
}

export interface NuevaRuta {
  sucursalOrigenId: string;
  sucursalDestinoId: string;
  distanciaKm: number;
  precioBoleto: number;
}

export interface ActualizarRuta {
  distanciaKm: number;
  precioBoleto: number;
  activa: boolean;
  version: number;
}

export interface NuevoViaje {
  rutaId: string;
  busId: string;
  choferId: string;
  fechaSalidaProgramada: string;
  fechaLlegadaEstimada: string;
}

export interface ActualizarViaje {
  busId: string;
  choferId: string;
  fechaSalidaProgramada: string;
  fechaLlegadaEstimada: string;
  version: number;
}

export interface SalidaViaje {
  fechaHoraSalida: string;
  kmInicial: number;
  registradoPor: string | null;
}

export interface LlegadaViaje {
  fechaHoraLlegada: string;
  kmFinal: number;
  kmRecorridos: number;
  costoCombustible: number;
  tarifaDepreciacion: number | null;
  costoDepreciacion: number | null;
  salarioChofer: number | null;
}

export interface ViajeDetalle extends Viaje {
  salida: SalidaViaje | null;
  llegada: LlegadaViaje | null;
}

export interface RegistrarSalida {
  fechaHoraSalida: string;
  kmInicial: number;
}

export interface RegistrarLlegada {
  fechaHoraLlegada: string;
  kmFinal: number;
  costoCombustible: number;
}

export type EstadoAlquiler = 'SOLICITADO' | 'COTIZADO' | 'PAGADO' | 'ASIGNADO' | 'COMPLETADO' | 'CANCELADO';

export interface Alquiler {
  alquilerId: string;
  sucursalId: string;
  canal: string;
  clienteUsuarioId: string | null;
  clienteNit: string | null;
  clienteNombre: string;
  clienteCorreo: string | null;
  origen: string;
  destino: string;
  fechaSalida: string;
  fechaRetorno: string | null;
  cantidadPasajeros: number;
  kmEstimados: number;
  precioEstimado: number;
  precioConfirmado: number | null;
  confirmadoPor: string | null;
  estado: EstadoAlquiler;
  motivoCancelacion: string | null;
  fechaSolicitud: string;
  viajeId: string | null;
  /** Viaje privado ya asignado (T22): bus, chofer y fechas. Null hasta que administración asigne. */
  viaje: Viaje | null;
  version: number;
}

export interface FiltroAlquileres {
  sucursalId?: string | null;
  estado?: EstadoAlquiler | null;
  desde?: string | null;
  hasta?: string | null;
}

export interface CotizarAlquiler {
  precioConfirmado: number;
  version: number;
}

export interface CancelarAlquiler {
  motivo: string;
  version: number;
}

export interface AsignarAlquiler {
  busId: string;
  choferId: string;
  fechaLlegadaEstimada: string;
  version: number;
}

/** Cuerpo de POST /trips/alquileres (T16): el precio lo calcula el backend por km estimados. */
export interface NuevoAlquiler {
  sucursalId: string;
  /** Solo para el cajero; vacío equivale a "CF". */
  clienteNit?: string | null;
  clienteNombre: string;
  clienteCorreo?: string | null;
  origen: string;
  destino: string;
  fechaSalida: string;
  /** null = solo ida. */
  fechaRetorno?: string | null;
  cantidadPasajeros: number;
  kmEstimados: number;
  /** Fecha con la que se fija el precio por km (no puede ser pasada). */
  fechaSolicitud: string;
}

export interface ConfigAlquiler {
  configuracionId: string;
  precioPorKm: number;
  vigenteDesde: string;
  creadoPor: string | null;
}

export interface NuevaConfigAlquiler {
  precioPorKm: number;
  vigenteDesde: string;
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
