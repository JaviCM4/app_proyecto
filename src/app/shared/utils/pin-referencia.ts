import * as L from 'leaflet';

/** Punto fijo que se dibuja de referencia sobre un mapa, como una sucursal. */
export interface PuntoReferencia {
  nombre: string;
  latitud: number;
  longitud: number;
}

/**
 * Pin de ubicación con forma de gota, como los de un mapa de verdad: la punta señala el lugar
 * exacto y el círculo blanco de adentro lo hace visible sobre cualquier tesela. El color sale de
 * `currentColor`, así que lo decide el CSS y acompaña al tema claro u oscuro.
 */
const PIN = `
<svg viewBox="0 0 24 34" width="30" height="42" aria-hidden="true" focusable="false">
  <path d="M12 33.2C12 33.2 22.6 21.2 22.6 12.6 22.6 6.7 17.8 1.9 12 1.9S1.4 6.7 1.4 12.6C1.4 21.2 12 33.2 12 33.2z"
        fill="currentColor" stroke="#ffffff" stroke-width="1.8" stroke-linejoin="round"/>
  <circle cx="12" cy="12.4" r="4.3" fill="#ffffff"/>
</svg>`;

/**
 * Icono de los puntos de referencia. El ancla va en la punta (abajo al centro) para que el pin
 * apunte a la coordenada y no quede centrado sobre ella.
 */
export function iconoReferencia(): L.DivIcon {
  return L.divIcon({
    className: 'punto-referencia',
    html: PIN,
    iconSize: [30, 42],
    iconAnchor: [15, 42],
    tooltipAnchor: [0, -38],
  });
}

/** Capa con un pin por cada punto, con su nombre al pasar el cursor o al tocarlo. */
export function capaDeReferencias(puntos: PuntoReferencia[]): L.LayerGroup {
  const icono = iconoReferencia();
  return L.layerGroup(
    puntos.map((p) => L.marker([p.latitud, p.longitud], { icon: icono, interactive: true, keyboard: false })
      .bindTooltip(p.nombre, { direction: 'top' })),
  );
}
