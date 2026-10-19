import { AfterViewInit, Component, ElementRef, OnDestroy, ViewChild, computed, input } from '@angular/core';
import * as L from 'leaflet';
import { agregarCapaBase } from '../../utils/capa-base-mapa';

const CENTRO_GT: L.LatLngTuple = [15.6, -90.25];
const LIMITES_GT = L.latLngBounds([13.4, -92.6], [18.1, -88.0]);
const COLOR_RUTA = '#2563eb';

export interface Coordenadas {
  latitud: number;
  longitud: number;
}

/**
 * Mapa de solo lectura con el recorrido de un alquiler: origen (O, verde) y destino (D, rojo)
 * unidos por una línea. Si el cliente no marcó las coordenadas (solicitudes viejas), avisa.
 */
@Component({
  selector: 'app-mapa-recorrido',
  standalone: true,
  templateUrl: './mapa-recorrido.component.html',
  styleUrl: './mapa-recorrido.component.scss',
})
export class MapaRecorridoComponent implements AfterViewInit, OnDestroy {
  readonly origenLatitud = input<number | null>(null);
  readonly origenLongitud = input<number | null>(null);
  readonly destinoLatitud = input<number | null>(null);
  readonly destinoLongitud = input<number | null>(null);
  readonly origen = input('Origen');
  readonly destino = input('Destino');
  readonly alto = input(240);

  readonly tienePuntos = computed(() =>
    this.hayCoordenadas(this.origenLatitud(), this.origenLongitud())
    || this.hayCoordenadas(this.destinoLatitud(), this.destinoLongitud()),
  );

  @ViewChild('contenedor', { static: true }) private contenedor!: ElementRef<HTMLDivElement>;
  private mapa?: L.Map;
  private observador?: ResizeObserver;

  ngAfterViewInit(): void {
    const origen = this.punto(this.origenLatitud(), this.origenLongitud());
    const destino = this.punto(this.destinoLatitud(), this.destinoLongitud());
    if (!origen && !destino) return;

    this.mapa = L.map(this.contenedor.nativeElement, {
      maxBounds: LIMITES_GT.pad(0.3),
      minZoom: 6,
      scrollWheelZoom: false,
    }).setView(CENTRO_GT, 7);
    agregarCapaBase(this.mapa);

    if (origen) this.marcador(origen, 'O', 'pin-origen');
    if (destino) this.marcador(destino, 'D', 'pin-destino');
    if (origen && destino) {
      L.polyline([origen, destino], { color: COLOR_RUTA, weight: 4, dashArray: '7 6' }).addTo(this.mapa);
      this.mapa.fitBounds(L.latLngBounds(origen, destino).pad(0.35));
    } else {
      this.mapa.setView((origen ?? destino)!, 12);
    }

    this.observador = new ResizeObserver(() => this.mapa?.invalidateSize());
    this.observador.observe(this.contenedor.nativeElement);
  }

  ngOnDestroy(): void {
    this.observador?.disconnect();
    this.mapa?.remove();
  }

  private marcador(punto: L.LatLngTuple, texto: string, clase: string): void {
    const icono = L.divIcon({
      className: `pin-recorrido ${clase}`,
      html: `<span>${texto}</span>`,
      iconSize: [26, 26],
      iconAnchor: [13, 13],
    });
    L.marker(punto, { icon: icono, interactive: false }).addTo(this.mapa!);
  }

  private hayCoordenadas(latitud: number | null, longitud: number | null): boolean {
    return latitud !== null && longitud !== null && Number.isFinite(latitud) && Number.isFinite(longitud);
  }

  private punto(latitud: number | null, longitud: number | null): L.LatLngTuple | null {
    if (latitud === null || longitud === null || !Number.isFinite(latitud) || !Number.isFinite(longitud)) {
      return null;
    }
    return [latitud, longitud];
  }
}
