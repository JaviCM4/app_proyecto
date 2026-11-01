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
export type TipoViaje = 'REGULAR' | 'PRIVADO';

export type SentidoViaje = 'IDA' | 'REGRESO';

export interface Viaje {
  viajeId: string;
  tipo: TipoViaje;
  rutaId: string | null;
  alquilerId: string | null;
  sucursalId: string;
  origenNombre: string;
  destinoNombre: string;
  /**
   * Solo en un viaje PRIVADO: los puntos que el cliente marcó al pedir el alquiler. Con ellos el
   * detalle dibuja su recorrido; un REGULAR lo dibuja con las sucursales de su ruta.
   */
  origenLatitud?: number | null;
  origenLongitud?: number | null;
  destinoLatitud?: number | null;
  destinoLongitud?: number | null;
  busId: string;
  busPlaca: string | null;
  /** Odómetro del bus (de Flota): el piso del kilometraje inicial al registrar la salida. */
  busKilometrajeActual?: number | null;
  /** Foto del bus (copia que Trips guarda de Fleet): el pasajero lo reconoce en la terminal. */
  busFotoUrl?: string | null;
  choferId: string;
  choferNombre: string | null;
  capacidad: number;
  precioBoleto: number | null;
  fechaSalidaProgramada: string;
  fechaLlegadaEstimada: string;
  /**
   * Solo en un viaje PRIVADO de ida y vuelta: cuándo pidió el cliente el regreso. No es la llegada
   * estimada, que es la del trayecto de ida.
   */
  fechaRetorno?: string | null;
  estado: EstadoViaje;
  /**
   * IDA o REGRESO. El viaje de vuelta comparte la ruta con su ida; el backend ya devuelve el origen
   * y el destino invertidos, así que aquí solo sirve para distinguirlo en la lista.
   */
  sentido?: SentidoViaje;
  /** El piloto asignado puede vender boletos presenciales de este viaje. */
  ventaPorChofer?: boolean;
  version: number;
}

export interface FiltroViajes {
  sucursalId?: string | null;
  rutaId?: string | null;
  desde?: string | null;
  hasta?: string | null;
  estado?: EstadoViaje | null;
  /** Al vender boletos solo sirven los REGULAR: un viaje privado no lleva pasajeros de mostrador. */
  tipo?: TipoViaje | null;
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
  /** Si el piloto de la ida puede vender boletos presenciales. */
  ventaPorChofer?: boolean;
  /** El viaje de vuelta por la misma ruta, o null si solo se programa la ida. */
  regreso?: NuevoViajeRegreso | null;
}

/** El viaje de vuelta: no lleva ruta (es la misma), pero sí su propio bus, piloto y horario. */
export interface NuevoViajeRegreso {
  busId: string;
  choferId: string;
  fechaSalidaProgramada: string;
  fechaLlegadaEstimada: string;
  ventaPorChofer?: boolean;
}

export interface ActualizarViaje {
  busId: string;
  choferId: string;
  fechaSalidaProgramada: string;
  fechaLlegadaEstimada: string;
  /** Null deja la marca como está; no se apaga sin querer al cambiar el horario. */
  ventaPorChofer?: boolean | null;
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
  /** Coordenadas del recorrido marcadas por el cliente (null en solicitudes viejas). */
  origenLatitud: number | null;
  origenLongitud: number | null;
  destinoLatitud: number | null;
  destinoLongitud: number | null;
  fechaSalida: string;
  fechaRetorno: string | null;
  cantidadPasajeros: number;
  kmEstimados: number;
  precioEstimado: number;
  precioConfirmado: number | null;
  confirmadoPor: string | null;
  estado: EstadoAlquiler;
  motivoCancelacion: string | null;
  /** Momento en que se canceló, el que indicó quien canceló. Null si no está cancelado. */
  fechaHoraCancelacion: string | null;
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
  /**
   * Momento de la cancelación (OffsetDateTime). Decide qué tramo de la tarifa de reembolso aplica.
   * Se envía igual que la fecha de solicitud en T16; si se omite, el backend usa el momento actual.
   */
  fechaHoraCancelacion?: string | null;
  version: number;
}

/**
 * Qué pasaría si el alquiler se cancelara en un momento dado (GET /trips/alquileres/{id}/politica-cancelacion).
 * El porcentaje es informativo: el monto que se paga lo calcula Sales con su propia tabla de tarifas.
 */
export interface PoliticaCancelacion {
  tarifaId: string | null;
  permiteCancelacion: boolean;
  porcentajeReembolso: number;
  justificacion: string;
  /** Horas que faltan para la salida; negativa si el viaje ya debió salir. */
  horasAntesDeSalida: number;
  /** Lo que se devolvería del precio confirmado, o null si el alquiler todavía no se pagó. */
  montoEstimadoReembolso: number | null;
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
  /** Coordenadas opcionales del origen y del destino marcadas en el mapa. */
  origenLatitud?: number | null;
  origenLongitud?: number | null;
  destinoLatitud?: number | null;
  destinoLongitud?: number | null;
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
