import {
  AfterViewInit,
  Component,
  ElementRef,
  OnDestroy,
  ViewChild,
  computed,
  effect,
  inject,
  input,
  output,
} from '@angular/core';
import { Subscription } from 'rxjs';
import * as L from 'leaflet';
import { RuteoService } from '../../../core/services/ruteo.service';
import { agregarCapaBase } from '../../utils/capa-base-mapa';
import { PuntoReferencia, capaDeReferencias } from '../../utils/pin-referencia';

const CENTRO_GT: L.LatLngTuple = [15.6, -90.25];
const LIMITES_GT = L.latLngBounds([13.4, -92.6], [18.1, -88.0]);
const LIMITES_MAPA = LIMITES_GT.pad(0.3);
const COLOR_RUTA = '#2563eb';

type Par = L.LatLngTuple;

export interface Coordenadas {
  latitud: number;
  longitud: number;
}

export type { PuntoReferencia } from '../../utils/pin-referencia';

/**
 * Mapa de solo lectura con el recorrido de un alquiler o de un viaje: origen (O, verde) y
 * destino (D, rojo). Primero dibuja la línea recta punteada y, cuando el servicio de ruteo
 * responde, la reemplaza por el recorrido real por carretera. Si el servicio falla, la línea
 * recta se queda como respaldo. Es reactivo: si cambian las coordenadas (por ejemplo, al elegir
 * otra sucursal en el formulario de rutas), vuelve a dibujar el recorrido.
 */
@Component({
  selector: 'app-mapa-recorrido',
  standalone: true,
  templateUrl: './mapa-recorrido.component.html',
  styleUrl: './mapa-recorrido.component.scss',
})
export class MapaRecorridoComponent implements AfterViewInit, OnDestroy {
  private readonly ruteo = inject(RuteoService);

  readonly origenLatitud = input<number | null>(null);
  readonly origenLongitud = input<number | null>(null);
  readonly destinoLatitud = input<number | null>(null);
  readonly destinoLongitud = input<number | null>(null);
  readonly origen = input('Origen');
  readonly destino = input('Destino');
  readonly alto = input(240);
  /** Si es true, muestra el mapa de Guatemala aunque todavía no haya puntos (formulario de rutas). */
  readonly mostrarVacio = input(false);
  readonly mensajeVacio = input('Esta solicitud no tiene el recorrido marcado en el mapa.');
  readonly mensajeIncompleto = input('Marca el origen y el destino para ver el recorrido.');
  /** Puntos fijos de referencia (la sucursal que sale del bus), además del origen y el destino. */
  readonly referencias = input<PuntoReferencia[]>([]);
  /** Kilómetros reales por carretera; null mientras no haya recorrido o si el ruteo falla. */
  readonly distanciaKm = output<number | null>();

  readonly tienePuntos = computed(
    () => this.punto(this.origenLatitud(), this.origenLongitud()) !== null
      || this.punto(this.destinoLatitud(), this.destinoLongitud()) !== null,
  );
  readonly completo = computed(
    () => this.punto(this.origenLatitud(), this.origenLongitud()) !== null
      && this.punto(this.destinoLatitud(), this.destinoLongitud()) !== null,
  );

  @ViewChild('contenedor', { static: true }) private contenedor!: ElementRef<HTMLDivElement>;
  private mapa?: L.Map;
  private capaReferencias?: L.LayerGroup;
  private marcadorOrigen?: L.Marker;
  private marcadorDestino?: L.Marker;
  private linea?: L.Polyline;
  private lineaRuta?: L.Polyline;
  private observador?: ResizeObserver;
  private peticion?: Subscription;
  private generacion = 0;
  private origenActual: Par | null = null;
  private destinoActual: Par | null = null;
  private puntosRuta: Par[] | null = null;

  constructor() {
    // La sucursal de referencia puede cambiar (al elegir otra en el select) o llegar después.
    effect(() => {
      const puntos = this.referencias();
      if (!this.mapa) return;
      this.dibujarReferencias(puntos);
      this.encuadrar();
    });
    // Redibuja cuando el formulario cambia el origen o el destino. El primer trazo lo hace
    // ngAfterViewInit (aquí el mapa todavía no existe); después esta comprobación evita repetirlo.
    effect(() => {
      const origen = this.punto(this.origenLatitud(), this.origenLongitud());
      const destino = this.punto(this.destinoLatitud(), this.destinoLongitud());
      if (this.mismos(origen, this.origenActual) && this.mismos(destino, this.destinoActual)) return;
      this.dibujar(origen, destino);
    });
  }

  ngAfterViewInit(): void {
    this.mapa = L.map(this.contenedor.nativeElement, {
      maxBounds: LIMITES_MAPA,
      minZoom: 6,
      scrollWheelZoom: false,
    }).setView(CENTRO_GT, 7);
    agregarCapaBase(this.mapa);
    this.dibujarReferencias(this.referencias());

    this.dibujar(
      this.punto(this.origenLatitud(), this.origenLongitud()),
      this.punto(this.destinoLatitud(), this.destinoLongitud()),
    );

    // Dentro de un modal el mapa nace con tamaño 0 (o cambia al pasar de celular a PC): al tomar su
    // tamaño real se recalcula y se vuelve a encuadrar el recorrido, si no queda con el zoom de todo el país.
    this.observador = new ResizeObserver(() => {
      if (!this.mapa || this.contenedor.nativeElement.clientWidth === 0) return;
      this.mapa.invalidateSize();
      this.encuadrar();
    });
    this.observador.observe(this.contenedor.nativeElement);
  }

  ngOnDestroy(): void {
    this.generacion++;
    this.peticion?.unsubscribe();
    this.observador?.disconnect();
    this.mapa?.remove();
  }

  /** Actualiza marcadores, línea y ruta; se llama al crear el mapa y cuando cambian las coordenadas. */
  /** Dibuja los puntos de referencia (la sucursal) en su propia capa, sin tocar el recorrido. */
  private dibujarReferencias(puntos: PuntoReferencia[]): void {
    if (!this.mapa) return;
    this.capaReferencias?.remove();
    this.capaReferencias = undefined;
    if (!puntos.length) return;
    this.capaReferencias = capaDeReferencias(puntos).addTo(this.mapa);
  }

  private dibujar(origen: Par | null, destino: Par | null): void {
    if (!this.mapa) return;
    this.origenActual = origen;
    this.destinoActual = destino;
    this.marcadorOrigen = this.colocarMarcador(this.marcadorOrigen, origen, 'O', 'pin-origen');
    this.marcadorDestino = this.colocarMarcador(this.marcadorDestino, destino, 'D', 'pin-destino');
    this.actualizarLineaRecta();
    this.cancelarRuta();
    if (origen && destino) {
      this.trazarPorCarretera(origen, destino);
    } else {
      this.distanciaKm.emit(null);
    }
    this.encuadrar();
  }

  /** Pide la ruta real por carretera y reemplaza la línea recta cuando llega. */
  private trazarPorCarretera(origen: Par, destino: Par): void {
    const generacion = this.generacion;
    this.peticion = this.ruteo
      .calcular(this.coordenadas(origen), this.coordenadas(destino))
      .subscribe((ruta) => {
        if (generacion !== this.generacion || !this.mapa) return;
        if (!ruta) {
          this.distanciaKm.emit(null);
          return;
        }
        this.puntosRuta = ruta.puntos;
        if (this.linea) {
          this.mapa.removeLayer(this.linea);
          this.linea = undefined;
        }
        this.lineaRuta = L.polyline(ruta.puntos, { color: COLOR_RUTA, weight: 5 }).addTo(this.mapa);
        this.mapa.attributionControl.addAttribution('Ruta: © OSRM · © OpenStreetMap');
        this.distanciaKm.emit(ruta.kilometros);
        this.encuadrar();
      });
  }

  /** Cancela la ruta anterior y borra su línea para no mezclar recorridos de pares distintos. */
  private cancelarRuta(): void {
    this.generacion++;
    this.peticion?.unsubscribe();
    this.peticion = undefined;
    this.puntosRuta = null;
    if (this.lineaRuta) {
      this.mapa?.removeLayer(this.lineaRuta);
      this.lineaRuta = undefined;
    }
  }

  private actualizarLineaRecta(): void {
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

  /** Muestra el recorrido completo con margen, o el único punto que haya con zoom de ciudad. */
  private encuadrar(): void {
    if (!this.mapa) return;
    // Las referencias (la sucursal) entran en el encuadre: de nada sirve el pin si queda fuera.
    const referencias: Par[] = this.referencias().map((r) => [r.latitud, r.longitud]);
    if (this.puntosRuta?.length) {
      this.mapa.fitBounds(L.latLngBounds([...this.puntosRuta, ...referencias]).pad(0.12));
    } else if (this.origenActual && this.destinoActual) {
      this.mapa.fitBounds(L.latLngBounds([this.origenActual, this.destinoActual, ...referencias]).pad(0.25));
    } else if (this.origenActual ?? this.destinoActual) {
      this.mapa.setView((this.origenActual ?? this.destinoActual)!, 12);
    } else if (this.mostrarVacio()) {
      this.mapa.setView(CENTRO_GT, 7);
    }
  }

  private colocarMarcador(
    actual: L.Marker | undefined,
    punto: Par | null,
    texto: string,
    clase: string,
  ): L.Marker | undefined {
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
      className: `pin-recorrido ${clase}`,
      html: `<span>${texto}</span>`,
      iconSize: [26, 26],
      iconAnchor: [13, 13],
    });
    return L.marker(punto, { icon: icono, interactive: false, zIndexOffset: 1000 }).addTo(this.mapa);
  }

  /** Coordenadas válidas y dentro de Guatemala (evita pines en el mar por datos incompletos). */
  private punto(latitud: number | null, longitud: number | null): Par | null {
    if (latitud === null || longitud === null || !Number.isFinite(latitud) || !Number.isFinite(longitud)) {
      return null;
    }
    const punto: Par = [latitud, longitud];
    return LIMITES_MAPA.contains(punto) ? punto : null;
  }

  private mismos(a: Par | null, b: Par | null): boolean {
    if (!a || !b) return a === b;
    return a[0] === b[0] && a[1] === b[1];
  }

  private coordenadas([latitud, longitud]: Par): Coordenadas {
    return { latitud, longitud };
  }
}
