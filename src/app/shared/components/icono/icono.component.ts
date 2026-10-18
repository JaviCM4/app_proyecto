import { Component, computed, input } from '@angular/core';

/** Íconos de línea simples (SVG) para el menú. Agrega aquí los que necesites. */
const ICONOS: Record<string, string> = {
  inicio: 'M3 10.5 12 3l9 7.5V21H3z M9 21v-6h6v6',
  sucursal: 'M4 21V8l8-5 8 5v13 M9 21v-5h6v5 M8 11h2 M14 11h2',
  bus: 'M5 17V6a3 3 0 0 1 3-3h8a3 3 0 0 1 3 3v11 M5 12h14 M7 17v3 M17 17v3 M8 15h.01 M16 15h.01',
  ruta: 'M6 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4z M18 9a2 2 0 1 0 0-4 2 2 0 0 0 0 4z M8 17h6a3 3 0 0 0 0-6h-4a3 3 0 0 1 0-6h6',
  boleto: 'M4 7h16v3a2 2 0 0 0 0 4v3H4v-3a2 2 0 0 0 0-4z M14 7v10',
  usuarios: 'M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z M3 21v-1a6 6 0 0 1 12 0v1 M17 11a3 3 0 1 0 0-6 M21 21v-1a5 5 0 0 0-3-4.6',
  reporte: 'M5 21V3h10l4 4v14z M9 17v-4 M12 17v-7 M15 17v-2',
  cartera: 'M3 7h18v12H3z M3 7l3-4h12l3 4 M16 13h2',
  perfil: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8z M4 21a8 8 0 0 1 16 0',
  taller: 'M14 7l3-3 3 3-3 3 M17 7l-9 9 M5 16l3 3 M3 21l3-3',
  menu: 'M4 6h16 M4 12h16 M4 18h16',
  candado: 'M6 11h12v10H6z M8 11V7a4 4 0 0 1 8 0v4 M12 15v2',
  tarifa: 'M4 20h16 M6 16l4-5 3 3 5-7 M15 7h3v3',
  mapa: 'M9 4 3 6v14l6-2 6 2 6-2V4l-6 2z M9 4v14 M15 6v14',
  pdf: 'M6 3h9l4 4v14H6z M14 3v5h5 M9 14h6 M9 17h4',
  salir: 'M15 4h4v16h-4 M10 8l-4 4 4 4 M6 12h10',
  sol: 'M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8z M12 2v2 M12 20v2 M2 12h2 M20 12h2 M4.9 4.9l1.4 1.4 M17.7 17.7l1.4 1.4 M4.9 19.1l1.4-1.4 M17.7 6.3l1.4-1.4',
  luna: 'M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z',
  taza: 'M4 9h12v5a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5z M16 11h1.5a2.5 2.5 0 0 1 0 5H16 M8 3v3 M12 3v3',
  monitor: 'M3 4h18v12H3z M8 20h8 M12 16v4',
};

@Component({
  selector: 'app-icono',
  standalone: true,
  templateUrl: './icono.component.html',
  styleUrl: './icono.component.scss',
})
export class IconoComponent {
  readonly nombre = input.required<string>();
  readonly tamano = input(18);
  readonly trazo = computed(() => ICONOS[this.nombre()] ?? ICONOS['inicio']);
}
