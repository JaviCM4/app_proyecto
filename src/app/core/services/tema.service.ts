import { Injectable, computed, effect, signal } from '@angular/core';

/** Lo que elige el usuario. "sistema" sigue el modo claro/oscuro del sistema operativo. */
export type Tema = 'claro' | 'oscuro' | 'calido' | 'sistema';

/** Tema que de verdad se pinta (valor del atributo data-tema de <html>). */
export type TemaAplicado = Exclude<Tema, 'sistema'>;

const CLAVE = 'tema';
const TEMAS: readonly Tema[] = ['claro', 'oscuro', 'calido', 'sistema'];

/**
 * Tema visual de la aplicación. Guarda la elección en este navegador (localStorage) y pone
 * data-tema en <html>; los colores salen de styles/_variables.scss. Si el navegador no deja
 * guardar (modo privado), el tema funciona igual durante la sesión.
 */
@Injectable({ providedIn: 'root' })
export class TemaService {
  private readonly consulta =
    typeof window !== 'undefined' && window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;
  private readonly sistemaOscuro = signal(this.consulta?.matches ?? false);

  readonly tema = signal<Tema>(leerGuardado());
  readonly aplicado = computed<TemaAplicado>(() => {
    const tema = this.tema();
    if (tema !== 'sistema') return tema;
    return this.sistemaOscuro() ? 'oscuro' : 'claro';
  });

  constructor() {
    this.consulta?.addEventListener('change', (e) => this.sistemaOscuro.set(e.matches));
    effect(() => {
      document.documentElement.dataset['tema'] = this.aplicado();
    });
  }

  elegir(tema: Tema): void {
    this.tema.set(tema);
    try {
      localStorage.setItem(CLAVE, tema);
    } catch {
      /* sin almacenamiento: el tema dura solo esta sesión */
    }
  }
}

function leerGuardado(): Tema {
  try {
    const guardado = localStorage.getItem(CLAVE) as Tema | null;
    if (guardado && TEMAS.includes(guardado)) return guardado;
  } catch {
    /* sin almacenamiento */
  }
  return 'claro';
}
