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
import * as L from 'leaflet';
import { GeocodificacionService, Lugar, seisDecimales } from '../../../core/services/geocodificacion.service';
import { agregarCapaBase } from '../../utils/capa-base-mapa';

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

/**
 * Mapa para marcar el recorrido de un alquiler: el origen (O, verde) y el destino (D, rojo),
 * unidos por una línea. Se puede marcar con un clic, buscar un lugar por nombre, arrastrar los
 * marcadores o limpiar todo. Al marcar un punto se propone el nombre del lugar más cercano.
 * Emite la distancia en línea recta (km) como ayuda para llenar los km estimados.
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

  readonly origenLatitud = input<number | null>(null);
  readonly origenLongitud = input<number | null>(null);
  readonly destinoLatitud = input<number | null>(null);
  readonly destinoLongitud = input<number | null>(null);

  readonly origenCambio = output<Coordenadas | null>();
  readonly destinoCambio = output<Coordenadas | null>();
  readonly distanciaKm = output<number | null>();
  readonly nombreOrigen = output<string>();
  readonly nombreDestino = output<string>();

  readonly modo = signal<Punto>('ORIGEN');
  readonly distancia = signal<number | null>(null);
  readonly texto = signal('');
  readonly buscando = signal(false);
  readonly resultados = signal<Lugar[]>([]);

  @ViewChild('contenedor', { static: true }) private contenedor!: ElementRef<HTMLDivElement>;
  private mapa?: L.Map;
  private marcadorOrigen?: L.Marker;
  private marcadorDestino?: L.Marker;
  private linea?: L.Polyline;
  private observador?: ResizeObserver;
  private origenActual: Par | null = null;
  private destinoActual: Par | null = null;

  constructor() {
    // Si la página cambia las coordenadas (por ejemplo, al limpiar el formulario), se redibuja.
    effect(() => {
      const origen = this.punto(this.origenLatitud(), this.origenLongitud());
      const destino = this.punto(this.destinoLatitud(), this.destinoLongitud());
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
    this.dibujar(
      this.punto(this.origenLatitud(), this.origenLongitud()),
      this.punto(this.destinoLatitud(), this.destinoLongitud()),
      true,
    );

    // El mapa puede vivir dentro de un modal: se reajusta al cambiar de tamaño.
    this.observador = new ResizeObserver(() => this.mapa?.invalidateSize());
    this.observador.observe(this.contenedor.nativeElement);
  }

  ngOnDestroy(): void {
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
    this.dibujar(null, null, false);
    this.modo.set('ORIGEN');
    this.distancia.set(null);
    this.texto.set('');
    this.resultados.set([]);
    this.origenCambio.emit(null);
    this.destinoCambio.emit(null);
    this.distanciaKm.emit(null);
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
      this.origenCambio.emit(this.coordenadas(punto));
    } else {
      this.destinoActual = punto;
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
    const marcador = L.marker(punto, { icon: icono, draggable: true }).addTo(this.mapa);
    marcador.on('dragend', () => {
      const movido = this.redondear(marcador.getLatLng());
      this.fijar(movido, tipo);
      this.sugerirNombre(movido, tipo);
    });
    return marcador;
  }

  private actualizarLinea(): void {
    if (!this.mapa) return;
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

  private avisarDistancia(): void {
    const km = this.origenActual && this.destinoActual
      ? this.haversine(this.origenActual, this.destinoActual)
      : null;
    this.distancia.set(km);
    this.distanciaKm.emit(km);
  }

  private punto(latitud: number | null, longitud: number | null): Par | null {
    if (latitud === null || longitud === null || !Number.isFinite(latitud) || !Number.isFinite(longitud)) {
      return null;
    }
    return [latitud, longitud];
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
