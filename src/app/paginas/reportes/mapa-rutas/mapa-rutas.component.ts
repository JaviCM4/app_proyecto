import { CurrencyPipe, DecimalPipe } from '@angular/common';
import { Component, ElementRef, OnDestroy, ViewChild, effect, inject, input } from '@angular/core';
import { Subscription, from, map, mergeMap } from 'rxjs';
import * as L from 'leaflet';
import { MapaRutas, RutaMapa } from '../../../core/models/reporte.model';
import { RuteoService } from '../../../core/services/ruteo.service';
import { agregarCapaBase } from '../../../shared/utils/capa-base-mapa';

/**
 * Mapa con las sucursales (puntos) y las rutas (recorrido origen → destino).
 * Primero dibuja cada ruta como línea recta y luego la reemplaza por el recorrido real por
 * carretera cuando el servicio de ruteo responde (las rutas atenuadas se quedan rectas para no
 * hacer una petición por cada una). Si se indica `resaltar`, solo se resaltan las rutas que salen
 * de esa sucursal.
 */
@Component({
  selector: 'app-mapa-rutas',
  standalone: true,
  imports: [DecimalPipe, CurrencyPipe],
  templateUrl: './mapa-rutas.component.html',
  styleUrl: './mapa-rutas.component.scss',
})
export class MapaRutasComponent implements OnDestroy {
  private readonly ruteo = inject(RuteoService);

  readonly datos = input<MapaRutas | null>(null);
  readonly resaltar = input<string>('');

  @ViewChild('contenedor', { static: true }) private contenedor!: ElementRef<HTMLDivElement>;
  private mapa?: L.Map;
  private generacion = 0;
  private peticiones = new Subscription();

  constructor() {
    effect(() => this.dibujar(this.datos(), this.resaltar()));
  }

  ngOnDestroy(): void {
    this.generacion++;
    this.peticiones.unsubscribe();
    this.mapa?.remove();
  }

  nombre(id: string): string {
    return this.datos()?.sucursales.find((s) => s.sucursalId === id)?.nombre ?? '—';
  }

  private dibujar(datos: MapaRutas | null, resaltar: string): void {
    const generacion = ++this.generacion;
    this.peticiones.unsubscribe();
    this.peticiones = new Subscription();
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
    agregarCapaBase(mapa);
    mapa.attributionControl.addAttribution('Rutas: © OSRM · © OpenStreetMap');

    const lineas = new Map<string, L.Polyline>();
    const porTrazar: Array<{ ruta: RutaMapa; origen: L.LatLngTuple; destino: L.LatLngTuple }> = [];
    const visibles: Array<{ origenId: string; destinoId: string }> = [];

    for (const r of datos.rutas) {
      const a = puntos.get(r.sucursalOrigenId);
      const b = puntos.get(r.sucursalDestinoId);
      if (!a || !b) continue;
      // La sucursal elegida en el filtro resalta sus rutas; las demás se dibujan atenuadas.
      const resaltada = !resaltar || r.sucursalOrigenId === resaltar;
      const linea = L.polyline([a, b], {
        color: resaltada ? '#2f6974' : '#9fb4b8',
        weight: resaltada ? 3 : 2,
        opacity: resaltada ? (r.activa ? 0.85 : 0.45) : 0.35,
        dashArray: r.activa ? undefined : '6 6',
      })
        .bindPopup(this.contenidoPopup(r))
        .addTo(mapa);
      lineas.set(r.rutaId, linea);
      // Solo se pide la carretera de las rutas visibles/resaltadas.
      if (resaltada) {
        porTrazar.push({ ruta: r, origen: a, destino: b });
        visibles.push({ origenId: r.sucursalOrigenId, destinoId: r.sucursalDestinoId });
      }
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

    // Origen (verde) y destino (rojo) de las rutas visibles. Se agrupan por sucursal para no
    // repetir el pin cuando varias rutas salen o llegan al mismo punto; si una sucursal es
    // origen y destino a la vez, se dibuja un pin combinado O/D.
    const origenes = new Set(visibles.map((v) => v.origenId));
    const destinos = new Set(visibles.map((v) => v.destinoId));
    for (const id of new Set([...origenes, ...destinos])) {
      const p = puntos.get(id);
      if (!p) continue;
      const esOrigen = origenes.has(id);
      const esDestino = destinos.has(id);
      const ambos = esOrigen && esDestino;
      const ancho = ambos ? 40 : 26;
      const icono = L.divIcon({
        className: `pin-ruta ${ambos ? 'pin-ambos' : esOrigen ? 'pin-origen' : 'pin-destino'}`,
        html: `<span>${ambos ? 'O/D' : esOrigen ? 'O' : 'D'}</span>`,
        iconSize: [ancho, 26],
        iconAnchor: [ancho / 2, 13],
      });
      // No interactivo: los clics pasan al círculo de la sucursal y abren su globo.
      L.marker(p, { icon: icono, interactive: false, zIndexOffset: 1000 }).addTo(mapa);
    }

    if (puntos.size > 0) mapa.fitBounds(L.latLngBounds([...puntos.values()]).pad(0.2));
    this.mapa = mapa;
    setTimeout(() => mapa.invalidateSize(), 50);

    // Pide las rutas reales con un máximo de 3 peticiones a la vez y las cambia cuando llegan.
    this.peticiones.add(
      from(porTrazar)
        .pipe(
          mergeMap(
            ({ ruta, origen, destino }) =>
              this.ruteo
                .calcular(
                  { latitud: origen[0], longitud: origen[1] },
                  { latitud: destino[0], longitud: destino[1] },
                )
                .pipe(map((calculada) => ({ ruta, calculada }))),
            3,
          ),
        )
        .subscribe(({ ruta, calculada }) => {
          if (generacion !== this.generacion || !this.mapa || !calculada) return;
          const linea = lineas.get(ruta.rutaId);
          if (!linea) return;
          linea.setLatLngs(calculada.puntos);
          linea.setPopupContent(this.contenidoPopup(ruta, calculada.kilometros));
        }),
    );
  }

  /**
   * Contenido del globo de una ruta. Si la distancia real por carretera difiere de la distancia
   * guardada en la ruta (que se escribe a mano), muestra las dos para que no confunda.
   */
  private contenidoPopup(r: RutaMapa, kmRuta?: number): string {
    const origen = r.origen ?? this.nombre(r.sucursalOrigenId);
    const destino = r.destino ?? this.nombre(r.sucursalDestinoId);
    const real = kmRuta !== undefined && Math.abs(kmRuta - r.distanciaKm) >= 1
      ? ` (ruta: ${kmRuta.toFixed(1)} km)`
      : '';
    return `<strong>${origen} → ${destino}</strong><br>${r.distanciaKm} km${real} · Q${Number(r.precioBoleto).toFixed(2)}`;
  }
}
