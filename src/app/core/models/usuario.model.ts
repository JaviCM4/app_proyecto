/** Modelos de perfil y administración de usuarios (Identity). */
import { Rol } from './auth.model';

export type EstadoUsuario = 'ACTIVO' | 'INACTIVO' | 'BLOQUEADO';

export interface Perfil {
  usuarioId: string;
  correo: string;
  nombres: string;
  apellidos: string;
  /** NIT, DPI, teléfono y dirección vienen vacíos en cuentas creadas con Google hasta que se completa el perfil. */
  nit: string | null;
  dpi: string | null;
  telefono: string | null;
  direccion: string | null;
  fotoUrl: string | null;
  roles: Rol[];
  sucursalId: string | null;
  choferId: string | null;
}

/** Solo se envían los campos que cambian (correo y DPI no se pueden cambiar). */
export interface ActualizarPerfil {
  nombres?: string;
  apellidos?: string;
  nit?: string;
  telefono?: string;
  direccion?: string;
  fotoUrl?: string;
}

export interface UsuarioResumen {
  usuarioId: string;
  correo: string;
  nombre: string;
  nit: string;
  roles: Rol[];
  estado: EstadoUsuario;
  sucursalId: string | null;
  ultimoAcceso: string | null;
}

export interface UsuarioDetalle extends Perfil {
  estado: EstadoUsuario;
  ultimoAcceso: string | null;
}

export interface NuevoAdministradorSistema {
  correo: string;
  nombres: string;
  apellidos: string;
  nit: string;
  dpi: string;
  telefono: string;
  direccion: string;
}

export interface FiltroUsuarios {
  rol?: Rol | '';
  estado?: EstadoUsuario | '';
  q?: string;
}

/** Resultado de buscar una cuenta por correo exacto (para asignarle un puesto). */
export interface UsuarioBusqueda {
  usuarioId: string;
  correo: string;
  nombreCompleto: string;
  fotoUrl: string | null;
  /** Si puede ser administrador de sucursal o cajero; si no, motivo dice por qué. */
  puedeSerPersonal: boolean;
  motivo: string | null;
}

/** Datos que completa una cuenta creada con Google (el NIT es opcional: sin NIT se factura como CF). */
export interface CompletarPerfil {
  nit: string;
  dpi: string;
  telefono: string;
  direccion: string;
}
