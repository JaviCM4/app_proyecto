import { Component, computed, input, output, signal } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { MapaAsientos } from '../../../core/models/viaje.model';

type Celda = { tipo: 'asiento'; numero: number } | { tipo: 'pasillo' } | { tipo: 'vacia' } | { tipo: 'piloto' };

/**
 * Mapa de asientos con silueta de bus: parabrisas, piloto (C) adelante a la
 * izquierda y filas de 2 + 2 con pasillo al medio. Si los asientos son impares,
 * el desigual va solo del lado del piloto, detrás de él.
 */
@Component({
  selector: 'app-selector-asientos',
  standalone: true,
  imports: [CurrencyPipe],
  templateUrl: './selector-asientos.component.html',
  styleUrl: './selector-asientos.component.scss',
})
export class SelectorAsientosComponent {
  readonly mapa = input<MapaAsientos | null>(null);
  readonly maximo = input(60);
  /** Muestra el encabezado con ruta y totales (apágalo si la página ya los muestra). */
  readonly resumen = input(true);
  /** Solo ver (invitados, o el pasajero mirando su boleto): no deja elegir ningún asiento. */
  readonly bloqueado = input(false);
  /**
   * Asientos del propio pasajero: se pintan en verde para que encuentre el suyo de un vistazo.
   * Se usa en "Mis boletos", donde el mapa es solo para ubicarse dentro del bus.
   */
  readonly propios = input<number[]>([]);
  readonly seleccion = output<number[]>();

  private readonly elegidos = signal<number[]>([]);
  readonly cantidad = computed(() => this.elegidos().length);
  readonly total = computed(() => this.cantidad() * (this.mapa()?.precioBoleto ?? 0));

  /** Filas de 5 celdas: asiento, asiento, pasillo, asiento, asiento. */
  readonly filas = computed<Celda[][]>(() => {
    const numeros = (this.mapa()?.asientos ?? []).map((a) => a.numero).sort((a, b) => a - b);
    const filas: Celda[][] = [];
    let resto = [...numeros];
    if (resto.length % 2 === 1 && resto.length > 0) {
      const desigual = resto.shift() as number;
      filas.push([{ tipo: 'asiento', numero: desigual }, { tipo: 'vacia' }, { tipo: 'pasillo' }, { tipo: 'vacia' }, { tipo: 'vacia' }]);
    }
    while (resto.length > 0) {
      const grupo = resto.splice(0, 4);
      while (grupo.length < 4) grupo.push(-1);
      const celda = (n: number): Celda => (n < 0 ? { tipo: 'vacia' } : { tipo: 'asiento', numero: n });
      filas.push([celda(grupo[0]), celda(grupo[1]), { tipo: 'pasillo' }, celda(grupo[2]), celda(grupo[3])]);
    }
    return filas;
  });

  /** ¿Es uno de los asientos del pasajero? Gana sobre "ocupado": ocupado por él mismo. */
  propio(numero: number): boolean {
    return this.propios().includes(numero);
  }

  ocupado(numero: number): boolean {
    return this.mapa()?.asientos.find((a) => a.numero === numero)?.estado !== 'DISPONIBLE';
  }

  elegido(numero: number): boolean {
    return this.elegidos().includes(numero);
  }

  alternar(numero: number): void {
    if (this.bloqueado() || this.ocupado(numero)) return;
    this.elegidos.update((lista) => {
      if (lista.includes(numero)) return lista.filter((n) => n !== numero);
      if (lista.length >= this.maximo()) return lista;
      return [...lista, numero].sort((a, b) => a - b);
    });
    this.seleccion.emit(this.elegidos());
  }

  limpiar(): void {
    this.elegidos.set([]);
    this.seleccion.emit([]);
  }
}
