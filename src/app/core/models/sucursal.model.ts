/** Modelos de sucursales (Fleet). */

export interface Sucursal {
  sucursalId: string;
  codigo: string;
  nombre: string;
  departamento: string;
  municipio: string;
  direccion: string;
  telefono: string | null;
  latitud: number;
  longitud: number;
  activa: boolean;
  version: number;
}

/** Datos de la cuenta que se crea en Identity (admin de sucursal, cajero o piloto). */
export interface DatosCuenta {
  /** Lo genera el front al abrir el formulario: si se reintenta, no se crea una segunda cuenta. */
  solicitudId?: string;
  correo: string;
  nombres: string;
  apellidos: string;
  nit: string;
  dpi: string;
  telefono: string;
  direccion: string;
  fotoUrl?: string | null;
}

export interface NuevaSucursal {
  codigo: string;
  nombre: string;
  departamento: string;
  municipio: string;
  direccion: string;
  telefono: string | null;
  latitud: number;
  longitud: number;
  fechaAsignacion: string;
  /** Exactamente uno de los dos: cuenta nueva o una persona que ya tiene cuenta. */
  adminInicial?: DatosCuenta;
  adminExistente?: UsuarioExistente;
}

/** Persona que ya tiene cuenta en la plataforma (se elige con la búsqueda por correo). */
export interface UsuarioExistente {
  solicitudId?: string;
  usuarioId: string;
  /** Solo choferes: foto nueva; sin ella se usa la foto de perfil de la cuenta. */
  fotoUrl?: string;
}

export interface ActualizarSucursal {
  nombre: string;
  departamento: string;
  municipio: string;
  direccion: string;
  telefono: string | null;
  latitud: number;
  longitud: number;
  version: number;
}

export interface PersonalSucursal {
  personalId: string;
  sucursalId: string;
  usuarioId: string;
  nombreCompleto: string;
  correo: string;
  rol: 'ADMIN_SUCURSAL' | 'CAJERO';
  activo: boolean;
  fechaAsignacion: string;
  fechaDesasignacion: string | null;
  version: number;
}

export interface SucursalCreada {
  sucursal: Sucursal;
  adminInicial: PersonalSucursal;
}

export type RolPersonal = 'ADMIN_SUCURSAL' | 'CAJERO';

export interface NuevoPersonal {
  rol: RolPersonal;
  fechaAsignacion: string;
  /** Exactamente uno de los dos: cuenta nueva o una persona que ya tiene cuenta. */
  cuenta?: DatosCuenta;
  usuarioExistente?: UsuarioExistente;
}

export interface TrasladoRealizado {
  anterior: PersonalSucursal;
  nueva: PersonalSucursal;
}
