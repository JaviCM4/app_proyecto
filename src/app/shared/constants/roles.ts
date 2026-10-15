import { Rol } from '../../core/models/auth.model';

/** Nombre que ve el usuario para cada rol (nunca se muestra el código). */
export const NOMBRE_ROL: Record<Rol, string> = {
  ADMIN_SISTEMA: 'Administrador del sistema',
  ADMIN_SUCURSAL: 'Administrador de sucursal',
  CAJERO: 'Cajero',
  CHOFER: 'Piloto',
  CLIENTE: 'Cliente',
};

/** Orden para mostrar el rol principal primero. */
export const ORDEN_ROL: Rol[] = ['ADMIN_SISTEMA', 'ADMIN_SUCURSAL', 'CAJERO', 'CHOFER', 'CLIENTE'];

export function rolPrincipal(roles: Rol[]): Rol | null {
  return ORDEN_ROL.find((r) => roles.includes(r)) ?? null;
}
