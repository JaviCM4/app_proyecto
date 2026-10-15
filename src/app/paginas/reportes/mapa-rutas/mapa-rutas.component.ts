import { DecimalPipe } from '@angular/common';
import { Component, ElementRef, OnDestroy, ViewChild, effect, input } from '@angular/core';
import * as L from 'leaflet';
import { MapaRutas } from '../../../core/models/reporte.model';

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
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 18,
      attribution: '&copy; OpenStreetMap',
    }).addTo(mapa);

    for (const r of datos.rutas) {
      const a = puntos.get(r.sucursalOrigenId);
      const b = puntos.get(r.sucursalDestinoId);
      if (!a || !b || (resaltar && r.sucursalOrigenId !== resaltar)) continue;
      L.polyline([a, b], { color: '#3a7f8c', weight: 3, opacity: r.activa ? 0.8 : 0.3, dashArray: r.activa ? undefined : '6 6' })
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
