/** Forma de todos los errores del backend (gateway y servicios). */
export interface ErrorApi {
  status: number;
  codigo: string;
  mensaje: string;
  ruta?: string;
  timestamp?: string;
  correlationId?: string;
  errores: { campo: string | null; mensaje: string }[];
}
