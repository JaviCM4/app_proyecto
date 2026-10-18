import { AfterViewInit, Component, ElementRef, OnDestroy, ViewChild, effect, input, output } from '@angular/core';
import * as L from 'leaflet';
import { agregarCapaBase } from '../../utils/capa-base-mapa';

/** Centro y límites del mapa: Guatemala. */
const CENTRO_GT: L.LatLngTuple = [15.6, -90.25];
const LIMITES_GT = L.latLngBounds([13.4, -92.6], [18.1, -88.0]);

export interface Coordenadas {
  latitud: number;
  longitud: number;
}

/**
 * Mapa de Guatemala para elegir un punto con un clic (o arrastrando el marcador).
 * Devuelve la latitud y longitud redondeadas a 6 decimales.
 */
@Component({
  selector: 'app-selector-ubicacion',
  standalone: true,
  templateUrl: './selector-ubicacion.component.html',
  styleUrl: './selector-ubicacion.component.scss',
})
export class SelectorUbicacionComponent implements AfterViewInit, OnDestroy {
  readonly latitud = input<number | null>(null);
  readonly longitud = input<number | null>(null);
  readonly cambio = output<Coordenadas>();

  @ViewChild('contenedor', { static: true }) private contenedor!: ElementRef<HTMLDivElement>;
  private mapa?: L.Map;
  private marcador?: L.Marker;
  private observador?: ResizeObserver;

  constructor() {
    // Si las coordenadas cambian desde afuera (al escribirlas), se mueve el marcador.
    effect(() => this.colocar(this.latitud(), this.longitud(), false));
  }

  ngAfterViewInit(): void {
    this.mapa = L.map(this.contenedor.nativeElement, { maxBounds: LIMITES_GT.pad(0.3), minZoom: 6 }).setView(CENTRO_GT, 7);
    agregarCapaBase(this.mapa);
    this.mapa.on('click', (e: L.LeafletMouseEvent) => this.elegir(e.latlng));
    this.colocar(this.latitud(), this.longitud(), true);

    // El mapa está dentro de un modal: se reajusta cuando cambia de tamaño o se vuelve visible.
    this.observador = new ResizeObserver(() => this.mapa?.invalidateSize());
    this.observador.observe(this.contenedor.nativeElement);
  }

  ngOnDestroy(): void {
    this.observador?.disconnect();
    this.mapa?.remove();
  }

  private elegir(punto: L.LatLng): void {
    const latitud = Math.round(punto.lat * 1e6) / 1e6;
    const longitud = Math.round(punto.lng * 1e6) / 1e6;
    this.colocar(latitud, longitud, false);
    this.cambio.emit({ latitud, longitud });
  }

  private colocar(latitud: number | null, longitud: number | null, centrar: boolean): void {
    if (!this.mapa || latitud === null || longitud === null || !Number.isFinite(latitud) || !Number.isFinite(longitud)) return;
    const punto: L.LatLngTuple = [latitud, longitud];
    if (!this.marcador) {
      // Marcador dibujado con HTML (no depende de las imágenes por defecto de Leaflet).
      const icono = L.divIcon({ className: 'pin-ubicacion', html: '<span></span>', iconSize: [22, 22], iconAnchor: [11, 22] });
      this.marcador = L.marker(punto, { icon: icono, draggable: true }).addTo(this.mapa);
      this.marcador.on('dragend', () => this.elegir(this.marcador!.getLatLng()));
    } else {
      this.marcador.setLatLng(punto);
    }
    if (centrar) this.mapa.setView(punto, 12);
  }
}
