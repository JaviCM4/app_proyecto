import { FilaReporte } from '../../core/models/reporte.model';

/** Filtros que puede pedir un reporte (se muestran solo los que usa la pestaña activa). */
export type Filtro = 'fechas' | 'sucursal' | 'bus' | 'ruta' | 'categoria' | 'estadoBus' | 'estadoChofer' | 'limite';
export type Formato = 'texto' | 'dinero' | 'numero' | 'fecha' | 'estado';
export type Ambito = 'sistema' | 'sucursal';

export interface Columna {
  clave: string;
  etiqueta: string;
  formato: Formato;
}

export interface Reporte {
  codigo: string;
  nombre: string;
  descripcion: string;
  ambito: Ambito;
  /** Ruta relativa a /reports. Los de sucursal reciben el id de la sucursal. */
  ruta: (sucursalId: string) => string;
  filtros: Filtro[];
  columnas: Columna[];
  /** Columnas que se suman en la fila de totales. */
  totaliza?: string[];
  /**
   * Si está, la tabla se muestra agrupada: una sección por cada valor de `por`
   * (que se usa como subtítulo), con el subtotal de la columna indicada.
   */
  agrupar?: { por: string; etiqueta: string; subtotal: string };
  /** Convierte el JSON del servicio (que viene agrupado) en filas planas para la tabla. */
  aplanar: (json: unknown) => FilaReporte[];
  /** true = el mapa de rutas (vista especial). */
  esMapa?: boolean;
}

/** Textos para los valores tipo "estado" que llegan como código. */
export const TEXTO_ESTADO: Record<string, string> = {
  ACTIVO: 'Activo',
  INACTIVO: 'Inactivo',
  EN_RUTA: 'En ruta',
  EN_TALLER: 'En taller',
  BOLETO: 'Boleto',
  ALQUILER: 'Alquiler',
};

type Json = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
const lista = (v: unknown): Json[] => (Array.isArray(v) ? (v as Json[]) : []);

export const REPORTES: Reporte[] = [
  // ---------- Del sistema (administrador del sistema) ----------
  {
    codigo: 'ingresos', nombre: 'Ingresos', ambito: 'sistema',
    descripcion: 'Boletos y alquileres cobrados por sucursal. Las cancelaciones aparecen en negativo.',
    ruta: () => '/ingresos', filtros: ['fechas', 'sucursal'],
    columnas: [
      { clave: 'fecha', etiqueta: 'Fecha', formato: 'fecha' },
      { clave: 'sucursal', etiqueta: 'Sucursal', formato: 'texto' },
      { clave: 'tipo', etiqueta: 'Tipo', formato: 'estado' },
      { clave: 'detalle', etiqueta: 'Detalle', formato: 'texto' },
      { clave: 'clienteNit', etiqueta: 'NIT cliente', formato: 'texto' },
      { clave: 'monto', etiqueta: 'Monto', formato: 'dinero' },
    ],
    totaliza: ['monto'],
    aplanar: (j) => lista((j as Json)?.['sucursales']).flatMap((s) => lista(s['filas']).map((f) => ({ ...f, sucursal: s['sucursal'] }))),
  },
  {
    codigo: 'gastos', nombre: 'Gastos', ambito: 'sistema',
    descripcion: 'Combustible, taller, repuestos, depreciación y salario de pilotos por sucursal.',
    ruta: () => '/gastos', filtros: ['fechas', 'sucursal'],
    columnas: [
      { clave: 'sucursal', etiqueta: 'Sucursal', formato: 'texto' },
      { clave: 'combustible', etiqueta: 'Combustible', formato: 'dinero' },
      { clave: 'taller', etiqueta: 'Mano de obra', formato: 'dinero' },
      { clave: 'repuestos', etiqueta: 'Repuestos', formato: 'dinero' },
      { clave: 'depreciacion', etiqueta: 'Depreciación', formato: 'dinero' },
      { clave: 'salarioChoferes', etiqueta: 'Salario pilotos', formato: 'dinero' },
      { clave: 'total', etiqueta: 'Total', formato: 'dinero' },
    ],
    totaliza: ['combustible', 'taller', 'repuestos', 'depreciacion', 'salarioChoferes', 'total'],
    aplanar: (j) => lista((j as Json)?.['porSucursal']),
  },
  {
    codigo: 'ganancias', nombre: 'Ganancias', ambito: 'sistema',
    descripcion: 'Ingresos menos gastos de cada sucursal.',
    ruta: () => '/ganancias', filtros: ['fechas', 'sucursal'],
    columnas: [
      { clave: 'sucursal', etiqueta: 'Sucursal', formato: 'texto' },
      { clave: 'ingresos', etiqueta: 'Ingresos', formato: 'dinero' },
      { clave: 'gastos', etiqueta: 'Gastos', formato: 'dinero' },
      { clave: 'ganancia', etiqueta: 'Ganancia', formato: 'dinero' },
    ],
    totaliza: ['ingresos', 'gastos', 'ganancia'],
    aplanar: (j) => lista((j as Json)?.['filas']),
  },
  {
    codigo: 'rutas', nombre: 'Rutas más demandadas', ambito: 'sistema',
    descripcion: 'Rutas ordenadas por boletos netos. Sin filtro se incluyen todas las sucursales; puedes elegir una para comparar su reporte.',
    ruta: () => '/rutas-demandadas', filtros: ['fechas', 'sucursal', 'limite'],
    columnas: [
      { clave: 'origen', etiqueta: 'Origen', formato: 'texto' },
      { clave: 'destino', etiqueta: 'Destino', formato: 'texto' },
      { clave: 'boletosVendidos', etiqueta: 'Vendidos', formato: 'numero' },
      { clave: 'boletosCancelados', etiqueta: 'Cancelados', formato: 'numero' },
      { clave: 'boletos', etiqueta: 'Netos', formato: 'numero' },
      { clave: 'ingresos', etiqueta: 'Ingresos', formato: 'dinero' },
    ],
    totaliza: ['boletosVendidos', 'boletosCancelados', 'boletos', 'ingresos'],
    aplanar: (j) => lista(j),
  },
  {
    codigo: 'taller-categoria', nombre: 'Taller por categoría', ambito: 'sistema',
    descripcion: 'Detalle de cada gasto de taller (bus, fecha, descripción y monto), con el subtotal de cada categoría y el gran total. Se puede filtrar por sucursal o bus.',
    ruta: () => '/taller-por-categoria', filtros: ['fechas', 'sucursal', 'bus'],
    columnas: [
      { clave: 'categoria', etiqueta: 'Categoría', formato: 'texto' },
      { clave: 'placa', etiqueta: 'Bus', formato: 'texto' },
      { clave: 'fecha', etiqueta: 'Fecha', formato: 'fecha' },
      { clave: 'descripcion', etiqueta: 'Descripción', formato: 'texto' },
      { clave: 'monto', etiqueta: 'Monto', formato: 'dinero' },
    ],
    totaliza: ['monto'],
    agrupar: { por: 'categoria', etiqueta: 'Categoría', subtotal: 'monto' },
    aplanar: (j) => lista((j as Json)?.['filas']),
  },
  {
    codigo: 'mapa', nombre: 'Mapa de rutas', ambito: 'sistema',
    descripcion: 'Sucursales y rutas en el mapa.',
    ruta: () => '/mapa-rutas', filtros: ['sucursal'], columnas: [], esMapa: true,
    aplanar: () => [],
  },

  // ---------- Por sucursal (administrador de la sucursal o del sistema) ----------
  {
    codigo: 'buses', nombre: 'Buses', ambito: 'sucursal',
    descripcion: 'Flota de la sucursal con kilometraje y viajes realizados.',
    ruta: (id) => `/sucursales/${id}/buses`, filtros: ['estadoBus'],
    columnas: [
      { clave: 'placa', etiqueta: 'Placa', formato: 'texto' },
      { clave: 'marca', etiqueta: 'Marca', formato: 'texto' },
      { clave: 'modelo', etiqueta: 'Modelo', formato: 'texto' },
      { clave: 'capacidadPasajeros', etiqueta: 'Asientos', formato: 'numero' },
      { clave: 'estado', etiqueta: 'Estado', formato: 'estado' },
      { clave: 'choferActual', etiqueta: 'Piloto', formato: 'texto' },
      { clave: 'kilometrajeActual', etiqueta: 'Kilometraje', formato: 'numero' },
      { clave: 'totalViajes', etiqueta: 'Viajes', formato: 'numero' },
    ],
    aplanar: (j) => lista(j),
  },
  {
    codigo: 'choferes', nombre: 'Pilotos', ambito: 'sucursal',
    descripcion: 'Pilotos de la sucursal con su licencia y viajes realizados.',
    ruta: (id) => `/sucursales/${id}/choferes`, filtros: ['estadoChofer'],
    columnas: [
      { clave: 'nombreCompleto', etiqueta: 'Nombre', formato: 'texto' },
      { clave: 'numeroLicencia', etiqueta: 'Licencia', formato: 'texto' },
      { clave: 'tipoLicencia', etiqueta: 'Tipo', formato: 'texto' },
      { clave: 'fechaVencimientoLicencia', etiqueta: 'Vence', formato: 'fecha' },
      { clave: 'estado', etiqueta: 'Estado', formato: 'estado' },
      { clave: 'totalViajes', etiqueta: 'Viajes', formato: 'numero' },
    ],
    aplanar: (j) => lista(j),
  },
  {
    codigo: 'ingresos-boletos', nombre: 'Ingresos por boletos', ambito: 'sucursal',
    descripcion: 'Ventas de boletos de la sucursal. Se puede filtrar por ruta y bus.',
    ruta: (id) => `/sucursales/${id}/ingresos-boletos`, filtros: ['fechas', 'ruta', 'bus'],
    columnas: [
      { clave: 'fecha', etiqueta: 'Fecha', formato: 'fecha' },
      { clave: 'ruta', etiqueta: 'Ruta', formato: 'texto' },
      { clave: 'busPlaca', etiqueta: 'Bus', formato: 'texto' },
      { clave: 'clienteNit', etiqueta: 'NIT cliente', formato: 'texto' },
      { clave: 'boletos', etiqueta: 'Boletos', formato: 'numero' },
      { clave: 'monto', etiqueta: 'Monto', formato: 'dinero' },
    ],
    totaliza: ['boletos', 'monto'],
    aplanar: (j) => lista((j as Json)?.['filas']),
  },
  {
    codigo: 'ingresos-alquiler', nombre: 'Ingresos por alquiler', ambito: 'sucursal',
    descripcion: 'Alquileres de bus pagados: cliente, origen, destino, fechas de salida y retorno, bus asignado y precio total.',
    ruta: (id) => `/sucursales/${id}/ingresos-alquiler`, filtros: ['fechas'],
    columnas: [
      { clave: 'fecha', etiqueta: 'Fecha de pago', formato: 'fecha' },
      { clave: 'clienteNombre', etiqueta: 'Cliente', formato: 'texto' },
      { clave: 'clienteNit', etiqueta: 'NIT', formato: 'texto' },
      { clave: 'origen', etiqueta: 'Origen', formato: 'texto' },
      { clave: 'destino', etiqueta: 'Destino', formato: 'texto' },
      { clave: 'busPlaca', etiqueta: 'Bus', formato: 'texto' },
      { clave: 'fechaSalida', etiqueta: 'Salida', formato: 'texto' },
      { clave: 'fechaRetorno', etiqueta: 'Retorno', formato: 'texto' },
      { clave: 'monto', etiqueta: 'Precio total', formato: 'dinero' },
    ],
    totaliza: ['monto'],
    aplanar: (j) => lista((j as Json)?.['filas']),
  },
  {
    codigo: 'depreciacion', nombre: 'Depreciación', ambito: 'sucursal',
    descripcion: 'Desgaste de cada bus según los kilómetros de sus viajes completados.',
    ruta: (id) => `/sucursales/${id}/depreciacion`, filtros: ['fechas', 'bus'],
    columnas: [
      { clave: 'placa', etiqueta: 'Bus', formato: 'texto' },
      { clave: 'fecha', etiqueta: 'Fecha', formato: 'fecha' },
      { clave: 'kmRecorridos', etiqueta: 'Km recorridos', formato: 'numero' },
      { clave: 'tarifa', etiqueta: 'Tarifa por km', formato: 'dinero' },
      { clave: 'costo', etiqueta: 'Costo', formato: 'dinero' },
    ],
    totaliza: ['kmRecorridos', 'costo'],
    aplanar: (j) => lista((j as Json)?.['buses']).flatMap((b) => lista(b['viajes']).map((v) => ({ ...v, placa: b['placa'] }))),
  },
  {
    codigo: 'taller-bus', nombre: 'Taller por bus', ambito: 'sucursal',
    descripcion: 'Cada gasto de taller de cada bus (categoría, fecha, descripción, tipo y monto), con el total del bus. Filtra por categoría para detectar reparaciones recurrentes.',
    ruta: (id) => `/sucursales/${id}/taller-por-bus`, filtros: ['fechas', 'bus', 'categoria'],
    columnas: [
      { clave: 'placa', etiqueta: 'Bus', formato: 'texto' },
      { clave: 'categoria', etiqueta: 'Categoría', formato: 'texto' },
      { clave: 'fecha', etiqueta: 'Fecha', formato: 'fecha' },
      { clave: 'descripcion', etiqueta: 'Descripción', formato: 'texto' },
      { clave: 'tipo', etiqueta: 'Tipo', formato: 'texto' },
      { clave: 'monto', etiqueta: 'Monto', formato: 'dinero' },
    ],
    totaliza: ['monto'],
    agrupar: { por: 'placa', etiqueta: 'Bus', subtotal: 'monto' },
    aplanar: (j) => lista((j as Json)?.['buses']).flatMap((b) => lista(b['gastos']).map((g) => ({ ...g, placa: b['placa'] }))),
  },
];
