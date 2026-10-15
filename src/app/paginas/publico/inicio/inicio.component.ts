import { CurrencyPipe, DatePipe } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { Sucursal } from '../../../core/models/sucursal.model';
import { Ruta, Viaje } from '../../../core/models/viaje.model';
import { AuthService } from '../../../core/services/auth.service';
import { SucursalesService } from '../../../core/services/sucursales.service';
import { ViajesService } from '../../../core/services/viajes.service';
import { mensajeError } from '../../../core/utils/errores-http';
import { ZONA_GT, hoyGt } from '../../../core/utils/fechas';
import { PaginadorComponent } from '../../../shared/components/paginador/paginador.component';
import { normalizar, paginar } from '../../../shared/utils/paginacion';
import { AsientosViajeComponent } from '../asientos-viaje/asientos-viaje.component';

interface Filtros {
  origenId: string;
  destinoId: string;
  desde: string;
  hasta: string;
  texto: string;
}

/** Página de inicio: viajes programados (datos públicos) con buscador por origen, destino y fechas. */
@Component({
  selector: 'app-inicio',
  standalone: true,
  imports: [FormsModule, RouterLink, DatePipe, CurrencyPipe, PaginadorComponent, AsientosViajeComponent],
  templateUrl: './inicio.component.html',
  styleUrl: './inicio.component.scss',
})
export class InicioComponent implements OnInit {
  private readonly viajesServicio = inject(ViajesService);
  private readonly sucursalesServicio = inject(SucursalesService);
  readonly auth = inject(AuthService);
  readonly zona = ZONA_GT;

  readonly sucursales = signal<Sucursal[]>([]);
  private readonly rutas = signal<Ruta[]>([]);
  private readonly viajes = signal<Viaje[]>([]);
  readonly cargando = signal(true);
  readonly error = signal('');

  filtros: Filtros = this.filtrosIniciales();
  /** Filtros que se aplicaron en la última búsqueda (los de la lista). */
  private readonly aplicados = signal<Filtros>(this.filtrosIniciales());

  readonly pagina = signal(1);
  readonly tamano = signal(10);
  readonly viajeSeleccionado = signal<Viaje | null>(null);

  /** Destino y texto se filtran aquí; origen y fechas los filtra el servidor. */
  readonly resultados = computed(() => {
    const { destinoId, texto } = this.aplicados();
    const rutasDestino = new Set(this.rutas().filter((r) => r.sucursalDestinoId === destinoId).map((r) => r.rutaId));
    const buscado = normalizar(texto);
    return this.viajes().filter(
      (v) =>
        (!destinoId || (v.rutaId !== null && rutasDestino.has(v.rutaId))) &&
        (!buscado || normalizar(`${v.origenNombre} ${v.destinoNombre} ${v.busPlaca ?? ''}`).includes(buscado)),
    );
  });

  readonly paginaActual = computed(() => paginar(this.resultados(), this.pagina(), this.tamano()));

  ngOnInit(): void {
    forkJoin({ sucursales: this.sucursalesServicio.listar(true), rutas: this.viajesServicio.rutas() }).subscribe({
      next: ({ sucursales, rutas }) => {
        this.sucursales.set(sucursales);
        this.rutas.set(rutas);
      },
      error: () => {
        /* Sin catálogos el buscador sigue funcionando por fecha y texto. */
      },
    });
    this.buscar();
  }

  buscar(): void {
    this.cargando.set(true);
    this.error.set('');
    const f = { ...this.filtros };
    this.viajesServicio.buscar({ sucursalId: f.origenId, desde: f.desde, hasta: f.hasta }).subscribe({
      next: (viajes) => {
        this.viajes.set(viajes);
        this.aplicados.set(f);
        this.pagina.set(1);
        this.cargando.set(false);
      },
      error: (e) => {
        this.viajes.set([]);
        this.error.set(mensajeError(e, 'No se pudieron cargar los viajes.'));
        this.cargando.set(false);
      },
    });
  }

  limpiar(): void {
    this.filtros = this.filtrosIniciales();
    this.buscar();
  }

  /** Cambia origen y destino de lugar. */
  invertir(): void {
    this.filtros = { ...this.filtros, origenId: this.filtros.destinoId, destinoId: this.filtros.origenId };
  }

  duracion(v: Viaje): string {
    const minutos = Math.round((Date.parse(v.fechaLlegadaEstimada) - Date.parse(v.fechaSalidaProgramada)) / 60000);
    const h = Math.floor(minutos / 60);
    const m = minutos % 60;
    return h > 0 ? `${h} h${m ? ` ${m} min` : ''}` : `${m} min`;
  }

  private filtrosIniciales(): Filtros {
    return { origenId: '', destinoId: '', desde: hoyGt(), hasta: '', texto: '' };
  }
}
