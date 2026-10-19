/** Modelos de sesión y cuentas (Identity). */

export type Rol = 'ADMIN_SISTEMA' | 'ADMIN_SUCURSAL' | 'CAJERO' | 'CHOFER' | 'CLIENTE';

export interface UsuarioSesion {
  usuarioId: string;
  correo: string;
  nombre: string;
  roles: Rol[];
  sucursalId: string | null;
  choferId: string | null;
  fotoUrl: string | null;
  /**
   * false: cuenta creada con Google que aún no completó DPI, teléfono y dirección (no puede usar el portal).
   * Las sesiones guardadas antes de este campo no lo traen: se toman como completas.
   */
  perfilCompleto?: boolean;
}

export interface Sesion {
  tokenAcceso: string;
  tipo: string;
  expiraEn: string;
  tokenRefresco: string;
  usuarioId: string;
  usuario: UsuarioSesion;
}

/** Respuesta cuando la cuenta tiene doble factor: hay que pedir el código enviado al correo. */
export interface DesafioDobleFactor {
  usuarioId: string;
  correo: string;
  expiraEn: string;
}

/** URL de Google a la que se manda el navegador para elegir la cuenta. */
export interface UrlGoogle {
  url: string;
  state: string;
}

export type ResultadoLogin = { tipo: 'SESION'; sesion: Sesion } | { tipo: 'DOBLE_FACTOR'; desafio: DesafioDobleFactor };

export interface RegistroCliente {
  correo: string;
  contrasena: string;
  nombres: string;
  apellidos: string;
  nit: string;
  dpi: string;
  telefono: string;
  direccion: string;
}
