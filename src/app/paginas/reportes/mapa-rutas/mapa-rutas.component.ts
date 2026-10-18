import { DecimalPipe } from '@angular/common';
import { Component, ElementRef, OnDestroy, ViewChild, effect, input } from '@angular/core';
import * as L from 'leaflet';
import { MapaRutas } from '../../../core/models/reporte.model';

/** Capa base de teselas sin API key. */
interface CapaBase {
  url: string;
  attribution: string;
  maxZoom: number;
  subdominios?: string;
}

/**
 * Fuentes de teselas en orden de preferencia.
 * OSM se intenta primero (se ve mejor en local), pero su servidor bloquea
 * peticiones desde proveedores de nube como Azure (403 "Access blocked",
 * "not following the tile usage policy"), así que se cae a Esri si falla.
 */
const CAPAS_BASE: CapaBase[] = [
  {
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    subdominios: 'abc',
    maxZoom: 19,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  },
  {
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}',
    maxZoom: 19,
    attribution: 'Teselas &copy; Esri &mdash; Esri, HERE, Garmin, OpenStreetMap contributors',
  },
];

/**
 * Mapa con las sucursales (puntos) y las rutas (líneas origen → destino).
 * Si se indica `resaltar`, solo se dibujan las rutas que salen de esa sucursal.
 */
@Component({
  selector: 'app-mapa-rutas',
  standalone: true,
  imports: [DecimalPipe],
  templateUrl: './mapa-rutas.component.html',
  styleUrl: './mapa-rutas.component.scss',
})
export class MapaRutasComponent implements OnDestroy {
  readonly datos = input<MapaRutas | null>(null);
  readonly resaltar = input<string>('');

  @ViewChild('contenedor', { static: true }) private contenedor!: ElementRef<HTMLDivElement>;
  private mapa?: L.Map;

  constructor() {
    effect(() => this.dibujar(this.datos(), this.resaltar()));
  }

  ngOnDestroy(): void {
    this.mapa?.remove();
  }

  nombre(id: string): string {
    return this.datos()?.sucursales.find((s) => s.sucursalId === id)?.nombre ?? '—';
  }

  /**
   * Agrega la capa base de teselas. Si una fuente no carga (por ejemplo, OSM
   * bloquea la IP del despliegue en la nube), intenta con la siguiente.
   */
  private agregarCapaBase(mapa: L.Map, indice = 0): void {
    const def = CAPAS_BASE[indice];
    if (!def) return;
    const capa = L.tileLayer(def.url, {
      subdomains: def.subdominios ?? 'abc',
      maxZoom: def.maxZoom,
      attribution: def.attribution,
      referrerPolicy: 'strict-origin-when-cross-origin',
    });
    let errores = 0;
    capa.on('tileerror', () => {
      if (++errores < 3) return;
      capa.off();
      mapa.removeLayer(capa);
      this.agregarCapaBase(mapa, indice + 1);
    });
    capa.addTo(mapa);
  }

  private dibujar(datos: MapaRutas | null, resaltar: string): void {
    this.mapa?.remove();
    this.mapa = undefined;
    if (!datos || !this.contenedor) return;

    const puntos = new Map<string, L.LatLngTuple>();
    for (const s of datos.sucursales) {
      if (Number.isFinite(s.latitud) && Number.isFinite(s.longitud) && !(s.latitud === 0 && s.longitud === 0)) {
        puntos.set(s.sucursalId, [s.latitud, s.longitud]);
      }
    }

    const mapa = L.map(this.contenedor.nativeElement).setView([15.5, -90.3], 7);
    this.agregarCapaBase(mapa);

    for (const r of datos.rutas) {
      const a = puntos.get(r.sucursalOrigenId);
      const b = puntos.get(r.sucursalDestinoId);
      if (!a || !b) continue;
      // La sucursal elegida en el filtro resalta sus rutas; las demás se dibujan atenuadas.
      const resaltada = !resaltar || r.sucursalOrigenId === resaltar;
      L.polyline([a, b], {
        color: resaltada ? '#2f6974' : '#9fb4b8',
        weight: resaltada ? 3 : 2,
        opacity: resaltada ? (r.activa ? 0.85 : 0.45) : 0.35,
        dashArray: r.activa ? undefined : '6 6',
      })
        .bindPopup(`<strong>${r.origen ?? this.nombre(r.sucursalOrigenId)} → ${r.destino ?? this.nombre(r.sucursalDestinoId)}</strong><br>${r.distanciaKm} km · Q${Number(r.precioBoleto).toFixed(2)}`)
        .addTo(mapa);
    }

    for (const s of datos.sucursales) {
      const p = puntos.get(s.sucursalId);
      if (!p) continue;
      L.circleMarker(p, {
        radius: s.sucursalId === resaltar ? 10 : 7,
        color: '#2f6974',
        weight: 2,
        fillColor: s.sucursalId === resaltar ? '#e8a87c' : s.activa ? '#ffffff' : '#c9d6d9',
        fillOpacity: 1,
      })
        .bindPopup(`<strong>${s.nombre}</strong><br>${s.activa ? 'Activa' : 'Inactiva'}`)
        .addTo(mapa);
    }

    if (puntos.size > 0) mapa.fitBounds(L.latLngBounds([...puntos.values()]).pad(0.2));
    this.mapa = mapa;
    setTimeout(() => mapa.invalidateSize(), 50);
  }
}
