import {
  AfterViewInit,
  Component,
  ElementRef,
  OnDestroy,
  ViewChild,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { Subscription } from 'rxjs';
import * as L from 'leaflet';
import { GeocodificacionService, Lugar, seisDecimales } from '../../../core/services/geocodificacion.service';
import { RuteoService } from '../../../core/services/ruteo.service';
import { agregarCapaBase } from '../../utils/capa-base-mapa';
import { PuntoReferencia, capaDeReferencias } from '../../utils/pin-referencia';

/** Centro y límites del mapa: Guatemala. */
const CENTRO_GT: L.LatLngTuple = [15.6, -90.25];
const LIMITES_GT = L.latLngBounds([13.4, -92.6], [18.1, -88.0]);
const COLOR_RUTA = '#2563eb';

type Punto = 'ORIGEN' | 'DESTINO';
type Par = L.LatLngTuple;

export interface Coordenadas {
  latitud: number;
  longitud: number;
}

export type { PuntoReferencia } from '../../utils/pin-referencia';

/**
 * Mapa para marcar el recorrido de un alquiler: el origen (O, verde) y el destino (D, rojo),
 * unidos por el recorrido real por carretera (o por una línea recta si el servicio de ruteo no
 * responde). Se puede marcar con un clic, buscar un lugar por nombre, arrastrar los marcadores o
 * limpiar todo. Al marcar un punto se propone el nombre del lugar más cercano.
 * Emite la distancia por carretera (km) para llenar los km estimados.
 */
@Component({
  selector: 'app-selector-recorrido',
  standalone: true,
  imports: [DecimalPipe],
  templateUrl: './selector-recorrido.component.html',
  styleUrl: './selector-recorrido.component.scss',
})
export class SelectorRecorridoComponent implements AfterViewInit, OnDestroy {
  private readonly geo = inject(GeocodificacionService);
  private readonly ruteo = inject(RuteoService);

  readonly origenLatitud = input<number | null>(null);
  readonly origenLongitud = input<number | null>(null);
  readonly destinoLatitud = input<number | null>(null);
  readonly destinoLongitud = input<number | null>(null);
  /** Alto del mapa en píxeles. */
  readonly alto = input(320);
  /**
   * Puntos fijos que se dibujan de referencia (las sucursales): ayudan a elegir el origen sabiendo
   * de dónde puede salir el bus. No son seleccionables ni estorban al clic para marcar.
   */
  readonly referencias = input<PuntoReferencia[]>([]);

  readonly origenCambio = output<Coordenadas | null>();
  readonly destinoCambio = output<Coordenadas | null>();
  readonly distanciaKm = output<number | null>();
  /** true mientras se está calculando la ruta por carretera (para bloquear el envío). */
  readonly calculandoRuta = output<boolean>();
  readonly nombreOrigen = output<string>();
  readonly nombreDestino = output<string>();

  readonly modo = signal<Punto>('ORIGEN');
  readonly distancia = signal<number | null>(null);
  readonly texto = signal('');
  readonly buscando = signal(false);
  readonly resultados = signal<Lugar[]>([]);
  /** true cuando los km son los de la carretera; false si son la línea recta de respaldo. */
  readonly porCarretera = signal(false);
  readonly calculando = signal(false);

  @ViewChild('contenedor', { static: true }) private contenedor!: ElementRef<HTMLDivElement>;
  private mapa?: L.Map;
  private marcadorOrigen?: L.Marker;
  private capaReferencias?: L.LayerGroup;
  private marcadorDestino?: L.Marker;
  private linea?: L.Polyline;
  private lineaRuta?: L.Polyline;
  private observador?: ResizeObserver;
  private peticion?: Subscription;
  private generacion = 0;
  private origenActual: Par | null = null;
  private destinoActual: Par | null = null;

  constructor() {
    // Las referencias (sucursales) llegan por HTTP, así que pueden aparecer después del mapa.
    effect(() => {
      const puntos = this.referencias();
      if (this.mapa) this.dibujarReferencias(puntos);
    });
    // Si la página cambia las coordenadas (por ejemplo, al limpiar el formulario), se redibuja.
    // Cuando el cambio viene de este mismo mapa (clic o arrastre) ya está dibujado: no se toca,
    // para no borrar la ruta por carretera que acaba de llegar.
    effect(() => {
      const origen = this.punto(this.origenLatitud(), this.origenLongitud());
      const destino = this.punto(this.destinoLatitud(), this.destinoLongitud());
      if (this.mismos(origen, this.origenActual) && this.mismos(destino, this.destinoActual)) return;
      this.dibujar(origen, destino, false);
    });
  }

  ngAfterViewInit(): void {
    this.mapa = L.map(this.contenedor.nativeElement, {
      maxBounds: LIMITES_GT.pad(0.3),
      minZoom: 6,
    }).setView(CENTRO_GT, 7);
    agregarCapaBase(this.mapa);
    this.mapa.on('click', (e: L.LeafletMouseEvent) => this.marcar(e.latlng));
    this.dibujarReferencias(this.referencias());
    this.dibujar(
      this.punto(this.origenLatitud(), this.origenLongitud()),
      this.punto(this.destinoLatitud(), this.destinoLongitud()),
      true,
    );
    this.avisarDistancia();

    // El mapa puede vivir dentro de un modal: se reajusta al cambiar de tamaño.
    this.observador = new ResizeObserver(() => this.mapa?.invalidateSize());
    this.observador.observe(this.contenedor.nativeElement);
  }

  ngOnDestroy(): void {
    this.generacion++;
    this.peticion?.unsubscribe();
    this.observador?.disconnect();
    this.mapa?.remove();
  }

  alEscribir(e: Event): void {
    this.texto.set((e.target as HTMLInputElement).value);
  }

  /** Busca lugares por nombre (Photon). Es opcional: sin resultados se marca en el mapa a mano. */
  buscar(): void {
    const consulta = this.texto().trim();
    if (consulta.length < 3) {
      this.resultados.set([]);
      return;
    }
    this.buscando.set(true);
    this.geo.buscar(consulta).subscribe((lugares) => {
      this.resultados.set(lugares);
      this.buscando.set(false);
    });
  }

  /** Coloca el punto activo en el lugar elegido y usa su nombre. */
  elegir(lugar: Lugar): void {
    const tipo = this.modo();
    const punto: Par = [lugar.latitud, lugar.longitud];
    this.fijar(punto, tipo);
    this.emitirNombre(tipo, lugar.nombre);
    if (tipo === 'ORIGEN') this.modo.set('DESTINO');
    this.resultados.set([]);
    this.texto.set('');
    this.mapa?.setView(punto, 14);
  }

  limpiar(): void {
    this.generacion++;
    this.peticion?.unsubscribe();
    this.dibujar(null, null, false);
    this.modo.set('ORIGEN');
    this.distancia.set(null);
    this.porCarretera.set(false);
    this.calculando.set(false);
    this.calculandoRuta.emit(false);
    this.texto.set('');
    this.resultados.set([]);
    this.origenCambio.emit(null);
    this.destinoCambio.emit(null);
    this.distanciaKm.emit(null);
  }

  /**
   * Pinta las sucursales como puntos pequeños con su nombre al pasar el cursor. Van en una capa
   * aparte para poder rehacerla sola, y no interceptan el clic: el mapa sigue sirviendo para marcar.
   */
  private dibujarReferencias(puntos: PuntoReferencia[]): void {
    if (!this.mapa) return;
    this.capaReferencias?.remove();
    this.capaReferencias = undefined;
    if (!puntos.length) return;
    this.capaReferencias = capaDeReferencias(puntos).addTo(this.mapa);
  }

  private marcar(latlng: L.LatLng): void {
    const tipo = this.modo();
    const punto = this.redondear(latlng);
    this.fijar(punto, tipo);
    if (tipo === 'ORIGEN') this.modo.set('DESTINO');
    this.sugerirNombre(punto, tipo);
  }

  /** Guarda el punto en el estado local, lo emite y refresca la línea y los km. */
  private fijar(original: Par, tipo: Punto): void {
    // Venga del buscador, de un clic o de arrastrar el pin, sale siempre con 6 decimales
    const punto: Par = [seisDecimales(original[0]), seisDecimales(original[1])];
    if (tipo === 'ORIGEN') {
      this.origenActual = punto;
      this.marcadorOrigen = this.colocarMarcador(this.marcadorOrigen, punto, 'ORIGEN');
      this.origenCambio.emit(this.coordenadas(punto));
    } else {
      this.destinoActual = punto;
      this.marcadorDestino = this.colocarMarcador(this.marcadorDestino, punto, 'DESTINO');
      this.destinoCambio.emit(this.coordenadas(punto));
    }
    this.actualizarLinea();
    this.avisarDistancia();
  }

  /**
   * Propone el nombre del lugar más cercano. Deja de inmediato un nombre con las coordenadas para
   * que el formulario siempre quede completo, y lo cambia por el nombre real si el servicio responde.
   */
  private sugerirNombre(punto: Par, tipo: Punto): void {
    this.emitirNombre(tipo, `${punto[0].toFixed(5)}, ${punto[1].toFixed(5)}`);
    this.geo.reversa(punto[0], punto[1]).subscribe((nombre) => {
      if (nombre) this.emitirNombre(tipo, nombre);
    });
  }

  private emitirNombre(tipo: Punto, nombre: string): void {
    if (tipo === 'ORIGEN') this.nombreOrigen.emit(nombre);
    else this.nombreDestino.emit(nombre);
  }

  private dibujar(origen: Par | null, destino: Par | null, centrar: boolean): void {
    if (!this.mapa) return;
    this.origenActual = origen;
    this.destinoActual = destino;
    this.marcadorOrigen = this.colocarMarcador(this.marcadorOrigen, origen, 'ORIGEN');
    this.marcadorDestino = this.colocarMarcador(this.marcadorDestino, destino, 'DESTINO');
    this.actualizarLinea();
    if (!centrar) return;
    if (origen && destino) {
      this.mapa.fitBounds(L.latLngBounds(origen, destino).pad(0.35));
    } else if (origen ?? destino) {
      this.mapa.setView((origen ?? destino)!, 12);
    }
  }

  private colocarMarcador(actual: L.Marker | undefined, punto: Par | null, tipo: Punto): L.Marker | undefined {
    if (!this.mapa) return undefined;
    if (!punto) {
      if (actual) this.mapa.removeLayer(actual);
      return undefined;
    }
    if (actual) {
      actual.setLatLng(punto);
      return actual;
    }
    const icono = L.divIcon({
      className: `pin-recorrido ${tipo === 'ORIGEN' ? 'pin-origen' : 'pin-destino'}`,
      html: `<span>${tipo === 'ORIGEN' ? 'O' : 'D'}</span>`,
      iconSize: [26, 26],
      iconAnchor: [13, 13],
    });
    const marcador = L.marker(punto, { icon: icono, draggable: true, zIndexOffset: 1000 }).addTo(this.mapa);
    marcador.on('dragend', () => {
      const movido = this.redondear(marcador.getLatLng());
      this.fijar(movido, tipo);
      this.sugerirNombre(movido, tipo);
    });
    return marcador;
  }

  private actualizarLinea(): void {
    if (!this.mapa) return;
    this.quitarLineaRuta();
    if (this.origenActual && this.destinoActual) {
      const puntos = [this.origenActual, this.destinoActual] as L.LatLngTuple[];
      if (this.linea) {
        this.linea.setLatLngs(puntos);
      } else {
        this.linea = L.polyline(puntos, { color: COLOR_RUTA, weight: 4, dashArray: '7 6' }).addTo(this.mapa);
      }
    } else if (this.linea) {
      this.mapa.removeLayer(this.linea);
      this.linea = undefined;
    }
  }

  /**
   * Calcula los km del recorrido. Primero emite la distancia en línea recta para que el formulario
   * nunca quede vacío y, cuando el ruteo responde, la reemplaza por la distancia real por carretera
   * y dibuja esa geometría. Si el servicio falla, se queda la línea recta como respaldo.
   */
  private avisarDistancia(): void {
    this.generacion++;
    const generacion = this.generacion;
    this.peticion?.unsubscribe();
    this.quitarLineaRuta();
    this.porCarretera.set(false);

    const origen = this.origenActual;
    const destino = this.destinoActual;
    if (!origen || !destino) {
      this.distancia.set(null);
      this.distanciaKm.emit(null);
      this.calculando.set(false);
      this.calculandoRuta.emit(false);
      return;
    }

    const recta = this.haversine(origen, destino);
    this.distancia.set(recta);
    this.distanciaKm.emit(recta);
    this.calculando.set(true);
    this.calculandoRuta.emit(true);

    this.peticion = this.ruteo.calcular(this.coordenadas(origen), this.coordenadas(destino)).subscribe((ruta) => {
      if (generacion !== this.generacion) return;
      this.calculando.set(false);
      this.calculandoRuta.emit(false);
      if (!ruta) return;

      this.distancia.set(Math.round(ruta.kilometros * 10) / 10);
      // El backend acepta como máximo 2 decimales en los km estimados.
      this.distanciaKm.emit(ruta.kilometros);
      this.porCarretera.set(true);
      this.mostrarLineaRuta(ruta.puntos);
    });
  }

  /** Dibuja el recorrido real por carretera y oculta la línea recta de respaldo. */
  private mostrarLineaRuta(puntos: [number, number][]): void {
    if (!this.mapa) return;
    this.quitarLineaRuta();
    if (this.linea) {
      this.mapa.removeLayer(this.linea);
      this.linea = undefined;
    }
    this.lineaRuta = L.polyline(puntos, { color: COLOR_RUTA, weight: 5 }).addTo(this.mapa);
    this.mapa.attributionControl.addAttribution('Ruta: © OSRM · © OpenStreetMap');
  }

  private quitarLineaRuta(): void {
    if (!this.lineaRuta) return;
    this.mapa?.removeLayer(this.lineaRuta);
    this.lineaRuta = undefined;
  }

  private punto(latitud: number | null, longitud: number | null): Par | null {
    if (latitud === null || longitud === null || !Number.isFinite(latitud) || !Number.isFinite(longitud)) {
      return null;
    }
    return [latitud, longitud];
  }

  private mismos(a: Par | null, b: Par | null): boolean {
    if (!a || !b) return a === b;
    return a[0] === b[0] && a[1] === b[1];
  }

  private redondear(latlng: L.LatLng): Par {
    return [seisDecimales(latlng.lat), seisDecimales(latlng.lng)];
  }

  private coordenadas([latitud, longitud]: Par): Coordenadas {
    return { latitud, longitud };
  }

  /** Distancia en línea recta (km) entre dos puntos. */
  private haversine([lat1, lon1]: Par, [lat2, lon2]: Par): number {
    const radio = 6371;
    const rad = (grados: number) => (grados * Math.PI) / 180;
    const dLat = rad(lat2 - lat1);
    const dLon = rad(lon2 - lon1);
    const a = Math.sin(dLat / 2) ** 2
      + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLon / 2) ** 2;
    return Math.round(2 * radio * Math.asin(Math.sqrt(a)) * 10) / 10;
  }
}
