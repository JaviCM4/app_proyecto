/** Modelos del módulo identity (microservicio identity-service vía gateway). */

export type Rol = 'ADMIN_SISTEMA' | 'ADMIN_SUCURSAL' | 'CAJERO' | 'CHOFER' | 'CLIENTE' | 'SERVICIO';

export interface UsuarioSesion {
  usuarioId: string;
  correo: string;
  nombre: string;
  roles: Rol[];
  sucursalId: string | null;
  choferId: string | null;
  fotoUrl: string | null;
}

/** POST /identity/auth/login: 200 sesión completa | 202 desafío 2FA */
export type ResultadoLogin =
  | ({ tipoResultado: 'SESION' } & SesionResponse)
  | ({ tipoResultado: 'DOBLE_FACTOR' } & DesafioDobleFactor);

export interface SesionResponse {
  tokenAcceso: string;
  tipo: string;
  expiraEn: string;
  tokenRefresco: string;
  usuarioId: string;
  usuario: UsuarioSesion;
}

export interface DesafioDobleFactor {
  usuarioId: string;
  correo: string;
  expiraEn: string;
}

export interface RegistroRequest {
  correo: string;
  contrasena: string;
  nombres: string;
  apellidos: string;
  nit: string;
  dpi: string;
  telefono: string;
  direccion: string;
  fotoUrl?: string;
}

export interface RegistroResponse {
  usuarioId: string;
  correo: string;
  roles: Rol[];
}

export interface PerfilResponse {
  usuarioId: string;
  correo: string;
  nombres: string;
  apellidos: string;
  nit: string;
  dpi: string;
  telefono: string;
  direccion: string;
  fotoUrl: string | null;
  roles: Rol[];
  sucursalId: string | null;
  choferId: string | null;
}

export interface UpdateProfileRequest {
  nombres?: string;
  apellidos?: string;
  nit?: string;
  telefono?: string;
  direccion?: string;
  fotoUrl?: string;
}

export interface UsuarioListaResponse {
  usuarioId: string;
  correo: string;
  nombre: string;
  nit: string;
  roles: Rol[];
  estado: string;
  sucursalId: string | null;
  ultimoAcceso: string | null;
}

export interface UsuarioDetalleResponse extends PerfilResponse {
  estado: string;
  ultimoAcceso: string | null;
}

export interface AdministradorSistemaRequest {
  correo: string;
  nombres: string;
  apellidos: string;
  nit: string;
  dpi: string;
  telefono: string;
  direccion: string;
}

export interface WalletResponse {
  carteraId: string;
  saldo: number;
  fechaActualizacion: string;
}

export interface WalletMovementResponse {
  id: string;
  tipo: string;
  monto: number;
  saldoResultante: number;
  tipoReferencia: string;
  referenciaId: string | null;
  fechaMovimiento: string;
}

export interface DepreciationRateResponse {
  tarifaId: string;
  montoPorKm: number;
  vigenteDesde: string;
  creadoPor: string;
  fechaCreacion: string;
}

export interface CuentaPersonalRequest {
  solicitudId: string;
  rol: 'CHOFER' | 'ADMIN_SUCURSAL' | 'CAJERO';
  sucursalId: string;
  choferId?: string;
  correo: string;
  nombres: string;
  apellidos: string;
  nit: string;
  dpi: string;
  telefono: string;
  direccion: string;
  fotoUrl?: string;
}

export interface CuentaPersonalResponse {
  usuarioId: string;
  creada: boolean;
}

export interface AdminContactoResponse {
  usuarioId: string;
  correo: string;
  nombre: string;
  telefono: string | null;
}

export interface ContactoResponse {
  usuarioId: string;
  correo: string;
  nombre: string;
  telefono: string | null;
}
