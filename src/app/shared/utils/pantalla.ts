import { DestroyRef, Signal, inject, signal } from '@angular/core';

/**
 * true mientras la ventana mide al menos `minimo` px de ancho (PC); se actualiza al redimensionar.
 * Se llama al declarar un campo del componente (contexto de inyección): deja de escuchar al destruirse.
 */
export function pantallaGrande(minimo = 1024): Signal<boolean> {
  const consulta = window.matchMedia(`(min-width: ${minimo}px)`);
  const valor = signal(consulta.matches);
  const alCambiar = (e: MediaQueryListEvent) => valor.set(e.matches);
  consulta.addEventListener('change', alCambiar);
  inject(DestroyRef).onDestroy(() => consulta.removeEventListener('change', alCambiar));
  return valor.asReadonly();
}
