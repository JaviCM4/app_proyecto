/** Taller mecánico (Maintenance): categorías de gasto y servicios por bus. */

export interface Categoria {
  categoriaId: string;
  nombre: string;
  descripcion: string | null;
  activa: boolean;
}

export interface NuevaCategoria {
  nombre: string;
  descripcion?: string | null;
}

export interface ActualizarCategoria {
  nombre: string;
  descripcion?: string | null;
  activa?: boolean | null;
}

export interface BusDisponible {
  busId: string;
  placa: string;
  sucursalId: string;
  activo: boolean;
}

export type TipoLinea = 'MANO_OBRA' | 'REPUESTO';

export interface LineaServicio {
  categoriaId: string;
  descripcion: string;
  tipo: TipoLinea;
  monto: number;
}

export interface LineaServicioVista extends LineaServicio {
  lineaId: string;
  categoriaNombre: string | null;
}

export interface ServicioTaller {
  servicioId: string;
  busId: string;
  placa: string | null;
  sucursalId: string;
  fechaServicio: string;
  taller: string | null;
  observaciones: string | null;
  totalManoObra: number;
  totalRepuestos: number;
  total: number;
  registradoPor: string | null;
  lineas: LineaServicioVista[] | null;
}

export interface NuevoServicio {
  busId: string;
  fechaServicio: string;
  taller?: string | null;
  observaciones?: string | null;
  lineas: LineaServicio[];
}

export interface FiltroServicios {
  busId?: string | null;
  desde?: string | null;
  hasta?: string | null;
  categoriaId?: string | null;
}
