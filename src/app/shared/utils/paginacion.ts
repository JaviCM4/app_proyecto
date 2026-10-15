/** Paginación en el navegador para las listas que el backend devuelve completas. */
export interface Pagina<T> {
  elementos: T[];
  pagina: number;
  tamano: number;
  total: number;
  totalPaginas: number;
}

export function paginar<T>(lista: T[], pagina: number, tamano: number): Pagina<T> {
  const total = lista.length;
  const totalPaginas = Math.max(1, Math.ceil(total / tamano));
  const actual = Math.min(Math.max(1, pagina), totalPaginas);
  const inicio = (actual - 1) * tamano;
  return { elementos: lista.slice(inicio, inicio + tamano), pagina: actual, tamano, total, totalPaginas };
}

/** Texto sin mayúsculas ni tildes, para buscar sin importar cómo se escriba. */
export function normalizar(texto: string | null | undefined): string {
  return (texto ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
}
