import * as L from 'leaflet';

/** Capa base de teselas sin API key. */
export interface CapaBase {
  url: string;
  attribution: string;
  maxZoom: number;
  subdominios?: string;
}

/**
 * Fuentes de teselas en orden de preferencia.
 * - OSM: se ve bien, pero su servidor bloquea peticiones desde IPs de nube
 *   (por ejemplo Azure) con 403 "Access blocked" / "tile usage policy".
 * - Esri: CDN sin API key que sí responde en despliegues en la nube.
 * No se usa CARTO: sus teselas raster ahora muestran "API KEY REQUIRED".
 */
export const CAPAS_BASE: CapaBase[] = [
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
 * Agrega la capa base de teselas al mapa. Si una fuente no carga (por ejemplo,
 * OSM bloquea la IP del despliegue en la nube), intenta con la siguiente.
 */
export function agregarCapaBase(mapa: L.Map, indice = 0): void {
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
    agregarCapaBase(mapa, indice + 1);
  });
  capa.addTo(mapa);
}
