/** Fechas de negocio en hora de Guatemala (UTC-6, sin horario de verano). */
export const ZONA_GT = '-0600';

/** Fecha de hoy en Guatemala con formato yyyy-MM-dd (la que esperan los servicios). */
export function hoyGt(diasExtra = 0): string {
  const ahora = new Date(Date.now() - 6 * 3600_000 + diasExtra * 86_400_000);
  return ahora.toISOString().slice(0, 10);
}
