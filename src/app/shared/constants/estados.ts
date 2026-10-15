import { EstadoUsuario } from '../../core/models/usuario.model';

/** Texto e insignia de cada estado de cuenta (nunca se muestra el código). */
export const ESTADO_USUARIO: Record<EstadoUsuario, { texto: string; clase: string }> = {
  ACTIVO: { texto: 'Activo', clase: 'exito' },
  INACTIVO: { texto: 'Inactivo', clase: '' },
  BLOQUEADO: { texto: 'Bloqueado', clase: 'peligro' },
};
