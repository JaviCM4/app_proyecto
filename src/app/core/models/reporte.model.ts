/** Respuestas JSON de reporting (?format=json) que tienen forma especial. */

export interface SucursalMapa {
  sucursalId: string;
  nombre: string;
  latitud: number;
  longitud: number;
  activa: boolean;
}

export interface RutaMapa {
  rutaId: string;
  sucursalOrigenId: string;
  sucursalDestinoId: string;
  origen?: string;
  destino?: string;
  distanciaKm: number;
  precioBoleto: number;
  activa: boolean;
}

export interface MapaRutas {
  sucursales: SucursalMapa[];
  rutas: RutaMapa[];
}

/** Una fila genérica de tabla de reporte. */
export type FilaReporte = Record<string, string | number | boolean | null>;

export interface PdfDescargado {
  blob: Blob;
  nombre: string;
}
