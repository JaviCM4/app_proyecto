/** Fechas de negocio en hora de Guatemala (UTC-6, sin horario de verano). */
export const ZONA_GT = '-0600';

/** Fecha de hoy en Guatemala con formato yyyy-MM-dd (la que esperan los servicios). */
export function hoyGt(diasExtra = 0): string {
  const ahora = new Date(Date.now() - 6 * 3600_000 + diasExtra * 86_400_000);
  return ahora.toISOString().slice(0, 10);
}

/** Fecha y hora actual de Guatemala como datetime-local (yyyy-MM-ddTHH:mm). */
export function ahoraGt(): string {
  return new Date(Date.now() - 6 * 3600_000).toISOString().slice(0, 16);
}

/**
 * Convierte un datetime-local ("2026-10-25T06:00") al OffsetDateTime que espera
 * Trips ("2026-10-25T06:00:00-06:00", hora de Guatemala).
 */
export function fechaHoraGt(local: string): string {
  if (/[+-]\d{2}:?\d{2}$|Z$/.test(local)) return local;
  return local.length === 16 ? `${local}:00-06:00` : local;
}

/**
 * Pasa una fecha del backend ("2026-10-25T06:00:00-06:00") al formato de un input datetime-local
 * ("2026-10-25T06:00"). Como el backend ya responde en hora de Guatemala, basta con recortarla.
 */
export function aLocalGt(fecha: string | null | undefined): string {
  return fecha && fecha.length >= 16 ? fecha.slice(0, 16) : '';
}
