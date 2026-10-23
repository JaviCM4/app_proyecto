import { AfterViewInit, Component, ElementRef, OnDestroy, ViewChild, computed, inject, input } from '@angular/core';
import { Subscription } from 'rxjs';
import * as L from 'leaflet';
import { RuteoService } from '../../../core/services/ruteo.service';
import { agregarCapaBase } from '../../utils/capa-base-mapa';

const CENTRO_GT: L.LatLngTuple = [15.6, -90.25];
const LIMITES_GT = L.latLngBounds([13.4, -92.6], [18.1, -88.0]);
const COLOR_RUTA = '#2563eb';

export interface Coordenadas {
  latitud: number;
  longitud: number;
}

/**
 * Mapa de solo lectura con el recorrido de un alquiler o de un viaje: origen (O, verde) y
 * destino (D, rojo). Primero dibuja la línea recta punteada y, cuando el servicio de ruteo
 * responde, la reemplaza por el recorrido real por carretera. Si el servicio falla, la línea
 * recta se queda como respaldo. Si no hay coordenadas (solicitudes viejas), avisa.
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

  readonly tienePuntos = computed(() =>
    this.hayCoordenadas(this.origenLatitud(), this.origenLongitud())
    || this.hayCoordenadas(this.destinoLatitud(), this.destinoLongitud()),
  );

  @ViewChild('contenedor', { static: true }) private contenedor!: ElementRef<HTMLDivElement>;
  private mapa?: L.Map;
  private linea?: L.Polyline;
  private observador?: ResizeObserver;
  private peticion?: Subscription;
  private puntosRuta: L.LatLngTuple[] | null = null;

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
      this.linea = L.polyline([origen, destino], { color: COLOR_RUTA, weight: 4, dashArray: '7 6' })
        .addTo(this.mapa);
      this.trazarPorCarretera(origen, destino);
    }
    this.encuadrar(origen, destino);

    // Dentro de un modal el mapa nace con tamaño 0 (o cambia al pasar de celular a PC): al tomar su
    // tamaño real se recalcula y se vuelve a encuadrar el recorrido, si no queda con el zoom de todo el país.
    this.observador = new ResizeObserver(() => {
      if (!this.mapa || this.contenedor.nativeElement.clientWidth === 0) return;
      this.mapa.invalidateSize();
      this.encuadrar(origen, destino);
    });
    this.observador.observe(this.contenedor.nativeElement);
  }

  /** Pide la ruta real por carretera y reemplaza la línea recta cuando llega. */
  private trazarPorCarretera(origen: L.LatLngTuple, destino: L.LatLngTuple): void {
    this.peticion = this.ruteo
      .calcular(this.coordenadas(origen), this.coordenadas(destino))
      .subscribe((ruta) => {
        if (!ruta || !this.mapa) return;
        this.puntosRuta = ruta.puntos;
        if (this.linea) this.mapa.removeLayer(this.linea);
        this.linea = L.polyline(ruta.puntos, { color: COLOR_RUTA, weight: 5 }).addTo(this.mapa);
        this.mapa.attributionControl.addAttribution('Ruta: © OSRM · © OpenStreetMap');
        this.encuadrar(origen, destino);
      });
  }

  /** Muestra el recorrido completo con margen, o el único punto que haya con zoom de ciudad. */
  private encuadrar(origen: L.LatLngTuple | null, destino: L.LatLngTuple | null): void {
    if (!this.mapa) return;
    if (this.puntosRuta?.length) {
      this.mapa.fitBounds(L.latLngBounds(this.puntosRuta).pad(0.12));
    } else if (origen && destino) {
      this.mapa.fitBounds(L.latLngBounds(origen, destino).pad(0.35));
    } else if (origen ?? destino) {
      this.mapa.setView((origen ?? destino)!, 12);
    }
  }

  ngOnDestroy(): void {
    this.peticion?.unsubscribe();
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
    L.marker(punto, { icon: icono, interactive: false, zIndexOffset: 1000 }).addTo(this.mapa!);
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

  private coordenadas([latitud, longitud]: L.LatLngTuple): Coordenadas {
    return { latitud, longitud };
  }
}
