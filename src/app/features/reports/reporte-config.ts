/** Configuración declarativa de los 12 reportes: filtros que pide y columnas de la tabla. */

export type FiltroReporte = 'desde' | 'hasta' | 'sucursalId' | 'limite' | 'busId' | 'rutaId' | 'estado';
export type FormatoColumna = 'texto' | 'dinero' | 'numero' | 'estado';

export interface ColumnaReporte {
  clave: string;
  etiqueta: string;
  formato: FormatoColumna;
}

export interface DefinicionReporte {
  codigo: string;
  nombre: string;
  descripcion: string;
  /** Ruta relativa a /reports (sin ?format). */
  ruta: (sucursalId: string) => string;
  filtros: FiltroReporte[];
  columnas: ColumnaReporte[];
  totaliza?: string[];
}

export const ETIQUETAS_FILTRO: Record<FiltroReporte, string> = {
  desde: 'Desde',
  hasta: 'Hasta',
  sucursalId: 'Sucursal (ID)',
  limite: 'Límite de filas',
  busId: 'Bus (ID)',
  rutaId: 'Ruta (ID)',
  estado: 'Estado',
};

export const REPORTES_GLOBALES: DefinicionReporte[] = [
  {
    codigo: 'RG1', nombre: 'Ingresos por sucursal', descripcion: 'Boletos, alquileres y reembolsos; las cancelaciones restan.',
    ruta: () => '/ingresos', filtros: ['desde', 'hasta', 'sucursalId'],
    columnas: [
      { clave: 'fecha', etiqueta: 'Fecha', formato: 'texto' },
      { clave: 'sucursal', etiqueta: 'Sucursal', formato: 'texto' },
      { clave: 'tipo', etiqueta: 'Tipo', formato: 'estado' },
      { clave: 'detalle', etiqueta: 'Detalle', formato: 'texto' },
      { clave: 'clienteNit', etiqueta: 'NIT cliente', formato: 'texto' },
      { clave: 'monto', etiqueta: 'Monto (Q)', formato: 'dinero' },
    ],
    totaliza: ['monto'],
  },
  {
    codigo: 'RG2', nombre: 'Gastos por sucursal y tipo', descripcion: 'Agregado de gastos (taller, depreciación y otros).',
    ruta: () => '/gastos', filtros: ['desde', 'hasta', 'sucursalId'],
    columnas: [
      { clave: 'sucursal', etiqueta: 'Sucursal', formato: 'texto' },
      { clave: 'tipo', etiqueta: 'Tipo', formato: 'estado' },
      { clave: 'monto', etiqueta: 'Monto (Q)', formato: 'dinero' },
    ],
    totaliza: ['monto'],
  },
  {
    codigo: 'RG3', nombre: 'Ganancias por sucursal', descripcion: 'Ingresos menos gastos por sucursal.',
    ruta: () => '/ganancias', filtros: ['desde', 'hasta', 'sucursalId'],
    columnas: [
      { clave: 'sucursal', etiqueta: 'Sucursal', formato: 'texto' },
      { clave: 'ingresos', etiqueta: 'Ingresos (Q)', formato: 'dinero' },
      { clave: 'gastos', etiqueta: 'Gastos (Q)', formato: 'dinero' },
      { clave: 'ganancia', etiqueta: 'Ganancia (Q)', formato: 'dinero' },
    ],
    totaliza: ['ingresos', 'gastos', 'ganancia'],
  },
  {
    codigo: 'RG4', nombre: 'Rutas más demandadas', descripcion: 'Ranking de rutas por boletos vendidos.',
    ruta: () => '/rutas-demandadas', filtros: ['desde', 'hasta', 'limite'],
    columnas: [
      { clave: 'origen', etiqueta: 'Origen', formato: 'texto' },
      { clave: 'destino', etiqueta: 'Destino', formato: 'texto' },
      { clave: 'boletos', etiqueta: 'Boletos', formato: 'numero' },
      { clave: 'ingresos', etiqueta: 'Ingresos (Q)', formato: 'dinero' },
    ],
    totaliza: ['boletos', 'ingresos'],
  },
  {
    codigo: 'RG5', nombre: 'Taller por categoría', descripcion: 'Mano de obra + repuestos por categoría de gasto.',
    ruta: () => '/taller-por-categoria', filtros: ['desde', 'hasta', 'sucursalId', 'busId'],
    columnas: [
      { clave: 'categoria', etiqueta: 'Categoría', formato: 'texto' },
      { clave: 'manoObra', etiqueta: 'Mano de obra (Q)', formato: 'dinero' },
      { clave: 'repuestos', etiqueta: 'Repuestos (Q)', formato: 'dinero' },
      { clave: 'total', etiqueta: 'Total (Q)', formato: 'dinero' },
    ],
    totaliza: ['manoObra', 'repuestos', 'total'],
  },
  {
    codigo: 'RG6', nombre: 'Mapa de rutas', descripcion: 'Sucursales con coordenadas y rutas (vista especial).',
    ruta: () => '/mapa-rutas', filtros: ['sucursalId'], columnas: [],
  },
];

export const REPORTES_SUCURSAL: DefinicionReporte[] = [
  {
    codigo: 'RS1', nombre: 'Buses de la sucursal', descripcion: 'Flota asignada con kilometraje y viajes.',
    ruta: (id) => `/sucursales/${id}/buses`, filtros: ['estado'],
    columnas: [
      { clave: 'placa', etiqueta: 'Placa', formato: 'texto' },
      { clave: 'marca', etiqueta: 'Marca', formato: 'texto' },
      { clave: 'modelo', etiqueta: 'Modelo', formato: 'texto' },
      { clave: 'capacidadPasajeros', etiqueta: 'Capacidad', formato: 'numero' },
      { clave: 'estado', etiqueta: 'Estado', formato: 'estado' },
      { clave: 'choferActual', etiqueta: 'Chofer', formato: 'texto' },
      { clave: 'kilometrajeActual', etiqueta: 'Km actual', formato: 'numero' },
      { clave: 'totalViajes', etiqueta: 'Viajes', formato: 'numero' },
    ],
  },
  {
    codigo: 'RS2', nombre: 'Choferes de la sucursal', descripcion: 'Personal de conducción con licencia y viajes.',
    ruta: (id) => `/sucursales/${id}/choferes`, filtros: ['estado'],
    columnas: [
      { clave: 'nombreCompleto', etiqueta: 'Nombre', formato: 'texto' },
      { clave: 'numeroLicencia', etiqueta: 'Licencia', formato: 'texto' },
      { clave: 'tipoLicencia', etiqueta: 'Tipo', formato: 'texto' },
      { clave: 'fechaVencimientoLicencia', etiqueta: 'Vence', formato: 'texto' },
      { clave: 'estado', etiqueta: 'Estado', formato: 'estado' },
      { clave: 'totalViajes', etiqueta: 'Viajes', formato: 'numero' },
    ],
  },
  {
    codigo: 'RS3', nombre: 'Ingresos por boletos', descripcion: 'Detalle de boletos vendidos, filtros por ruta y bus.',
    ruta: (id) => `/sucursales/${id}/ingresos-boletos`, filtros: ['desde', 'hasta', 'rutaId', 'busId'],
    columnas: [
      { clave: 'fecha', etiqueta: 'Fecha', formato: 'texto' },
      { clave: 'ruta', etiqueta: 'Ruta', formato: 'texto' },
      { clave: 'busPlaca', etiqueta: 'Bus', formato: 'texto' },
      { clave: 'clienteNit', etiqueta: 'NIT cliente', formato: 'texto' },
      { clave: 'boletos', etiqueta: 'Boletos', formato: 'numero' },
      { clave: 'monto', etiqueta: 'Monto (Q)', formato: 'dinero' },
    ],
    totaliza: ['boletos', 'monto'],
  },
  {
    codigo: 'RS4', nombre: 'Ingresos por alquiler', descripcion: 'Órdenes de alquiler pagadas.',
    ruta: (id) => `/sucursales/${id}/ingresos-alquiler`, filtros: ['desde', 'hasta'],
    columnas: [
      { clave: 'fecha', etiqueta: 'Fecha', formato: 'texto' },
      { clave: 'clienteNombre', etiqueta: 'Cliente', formato: 'texto' },
      { clave: 'clienteNit', etiqueta: 'NIT', formato: 'texto' },
      { clave: 'origen', etiqueta: 'Origen', formato: 'texto' },
      { clave: 'destino', etiqueta: 'Destino', formato: 'texto' },
      { clave: 'monto', etiqueta: 'Monto (Q)', formato: 'dinero' },
    ],
    totaliza: ['monto'],
  },
  {
    codigo: 'RS5', nombre: 'Depreciación por bus', descripcion: 'Viajes completados con su costo de depreciación.',
    ruta: (id) => `/sucursales/${id}/depreciacion`, filtros: ['desde', 'hasta', 'busId'],
    columnas: [
      { clave: 'placa', etiqueta: 'Bus', formato: 'texto' },
      { clave: 'fecha', etiqueta: 'Fecha', formato: 'texto' },
      { clave: 'kmRecorridos', etiqueta: 'Km', formato: 'numero' },
      { clave: 'tarifa', etiqueta: 'Tarifa (Q/km)', formato: 'dinero' },
      { clave: 'costo', etiqueta: 'Costo (Q)', formato: 'dinero' },
    ],
    totaliza: ['kmRecorridos', 'costo'],
  },
  {
    codigo: 'RS6', nombre: 'Taller por bus', descripcion: 'Gastos de taller por bus agrupados por categoría.',
    ruta: (id) => `/sucursales/${id}/taller-por-bus`, filtros: ['desde', 'hasta', 'busId'],
    columnas: [
      { clave: 'placa', etiqueta: 'Bus', formato: 'texto' },
      { clave: 'categoria', etiqueta: 'Categoría', formato: 'texto' },
      { clave: 'manoObra', etiqueta: 'Mano de obra (Q)', formato: 'dinero' },
      { clave: 'repuestos', etiqueta: 'Repuestos (Q)', formato: 'dinero' },
      { clave: 'total', etiqueta: 'Total (Q)', formato: 'dinero' },
    ],
    totaliza: ['manoObra', 'repuestos', 'total'],
  },
];
