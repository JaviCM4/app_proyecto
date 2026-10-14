/** Filas JSON de los reportes (reporting-service, ?format=json). */

export interface IngresoGlobalFila {
  fecha: string;
  sucursal: string;
  tipo: string;
  referenciaId: string | null;
  detalle: string;
  clienteNit: string;
  monto: number;
}

export interface GastoGlobalFila {
  sucursal: string;
  tipo: string;
  monto: number;
}

export interface GananciaFila {
  sucursalId: string;
  sucursal: string;
  ingresos: number;
  gastos: number;
  ganancia: number;
}

export interface RutaDemandaFila {
  rutaId: string;
  origen: string;
  destino: string;
  boletos: number;
  ingresos: number;
}

export interface TallerCategoriaFila {
  categoriaId: string;
  categoria: string;
  manoObra: number;
  repuestos: number;
  total: number;
}

export interface SucursalMapaFila {
  sucursalId: string;
  nombre: string;
  latitud: number;
  longitud: number;
  activa: boolean;
}

export interface RutaMapaFila {
  rutaId: string;
  sucursalOrigenId: string;
  sucursalDestinoId: string;
  origen?: string;
  destino?: string;
  distanciaKm: number;
  precioBoleto: number;
  activa: boolean;
}

export interface MapaRutasResponse {
  sucursales: SucursalMapaFila[];
  rutas: RutaMapaFila[];
}

export interface BusFila {
  busId: string;
  placa: string;
  marca: string;
  modelo: string;
  capacidadPasajeros: number;
  estado: string;
  choferActual: string;
  kilometrajeActual: number;
  totalViajes: number;
}

export interface ChoferFila {
  choferId: string;
  nombreCompleto: string;
  numeroLicencia: string;
  tipoLicencia: string;
  fechaVencimientoLicencia: string;
  estado: string;
  totalViajes: number;
}

export interface BoletoFila {
  fecha: string;
  ventaId: string;
  ruta: string;
  busPlaca: string;
  clienteNit: string;
  boletos: number;
  monto: number;
}

export interface AlquilerFila {
  fecha: string;
  ordenId: string;
  clienteNit: string;
  clienteNombre: string;
  origen: string;
  destino: string;
  monto: number;
}

export interface DepreciacionFila {
  busId: string;
  placa: string;
  viajeId: string;
  fecha: string;
  kmRecorridos: number;
  tarifa: number;
  costo: number;
}

export interface TallerBusFila {
  busId: string;
  placa: string;
  categoria: string;
  manoObra: number;
  repuestos: number;
  total: number;
}
