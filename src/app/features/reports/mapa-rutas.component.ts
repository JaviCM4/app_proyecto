import { Component, Input, OnChanges, OnDestroy, AfterViewInit, ElementRef, ViewChild } from '@angular/core';
import * as L from 'leaflet';
import { MapaRutasResponse } from '../../core/models/reports.model';

/**
 * Mapa de rutas con Leaflet (RG6): sucursales como marcadores y rutas como líneas
 * origen → destino. Si se indica `resaltarSucursalId`, solo se dibujan las rutas
 * cuyo origen es esa sucursal y su marcador se resalta en menta.
 */
@Component({
  selector: 'app-mapa-rutas',
  standalone: true,
  template: `
    @if (tieneCoordenadas) {
      <div #mapa class="h-[480px] w-full overflow-hidden rounded-2xl border border-azul/15"></div>
    } @else {
      <div class="card"><p class="text-sm text-cafe">
        Las sucursales aún no tienen coordenadas registradas, así que el mapa no se puede dibujar.
        Abajo están las tablas con los datos.
      </p></div>
    }
  `,
})
export class MapaRutasComponent implements AfterViewInit, OnChanges, OnDestroy {
  @Input() datos: MapaRutasResponse | null = null;
  @Input() resaltarSucursalId?: string;

  private mapaEl?: ElementRef<HTMLDivElement>;

  @ViewChild('mapa') set mapaRef(el: ElementRef<HTMLDivElement> | undefined) {
    this.mapaEl = el;
    if (el) this.dibujar();
  }

  private map?: L.Map;
  tieneCoordenadas = false;

  ngAfterViewInit(): void {
    // La inicialización la dispara el setter de mapaRef cuando aparece el div.
  }

  ngOnChanges(): void {
    this.tieneCoordenadas = this.hayCoordenadas(this.datos);
    // Si el div ya existe (cambió el filtro o los datos), se redibuja.
    if (this.mapaEl) this.dibujar();
  }

  ngOnDestroy(): void {
    this.map?.remove();
    this.map = undefined;
  }

  private static readonly ES_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  /** Nombre a mostrar: si el dato viene como UUID se resuelve con el catálogo de sucursales. */
  private nombrePara(valor: string | undefined, id: string, nombres: Map<string, string>): string {
    if (valor && !MapaRutasComponent.ES_UUID.test(valor)) return valor;
    return nombres.get(id) ?? valor ?? id;
  }

  private hayCoordenadas(datos: MapaRutasResponse | null): boolean {
    if (!datos) return false;
    return datos.sucursales.some((s) => this.coord(s.latitud, s.longitud) !== null);
  }

  private coord(lat: unknown, lng: unknown): [number, number] | null {
    const la = Number(lat);
    const ln = Number(lng);
    if (!Number.isFinite(la) || !Number.isFinite(ln)) return null;
    if (la === 0 && ln === 0) return null; // sin capturar
    if (la === -90 && ln === -180) return null; // placeholder de captura (polo sur)
    if (la < -90 || la > 90 || ln < -180 || ln > 180) return null;
    return [la, ln];
  }

  private dibujar(): void {
    this.map?.remove();
    this.map = undefined;
    if (!this.datos || !this.mapaEl) return;

    const porId = new Map<string, [number, number]>();
    const nombres = new Map<string, string>();
    for (const s of this.datos.sucursales) {
      const c = this.coord(s.latitud, s.longitud);
      nombres.set(s.sucursalId, s.nombre);
      if (c) porId.set(s.sucursalId, c);
    }
    if (porId.size === 0) return;

    const map = L.map(this.mapaEl.nativeElement).setView([14.6, -90.5], 7);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 18,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(map);

    for (const [id, c] of porId) {
      const resaltada = this.resaltarSucursalId === id;
      L.circleMarker(c, {
        radius: resaltada ? 11 : 8,
        color: '#12294D',
        weight: 2,
        fillColor: resaltada ? '#5ED3A7' : '#3E63A3',
        fillOpacity: 0.95,
      })
        .bindPopup(`<strong>${nombres.get(id) ?? 'Sucursal'}</strong>`)
        .addTo(map);
    }

    const puntos: [number, number][] = [...porId.values()];
    for (const r of this.datos.rutas) {
      const a = porId.get(r.sucursalOrigenId);
      const b = porId.get(r.sucursalDestinoId);
      if (!a || !b) continue;
      if (this.resaltarSucursalId && r.sucursalOrigenId !== this.resaltarSucursalId) continue;
      L.polyline([a, b], {
        color: this.resaltarSucursalId ? '#2FA67E' : '#1B3A6B',
        weight: 3,
        opacity: 0.85,
      })
        .bindPopup(
          `<strong>${this.nombrePara(r.origen, r.sucursalOrigenId, nombres)} → ${this.nombrePara(r.destino, r.sucursalDestinoId, nombres)}</strong><br>` +
          `${r.distanciaKm} km · Q ${Number(r.precioBoleto ?? 0).toFixed(2)} · ${r.activa ? 'Activa' : 'Inactiva'}`,
        )
        .addTo(map);
    }

    map.fitBounds(L.latLngBounds(puntos).pad(0.2));
    this.map = map;
    setTimeout(() => map.invalidateSize(), 100);
  }
}
