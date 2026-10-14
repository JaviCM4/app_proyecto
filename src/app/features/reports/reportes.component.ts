import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';
import { ReportsService } from '../../core/services/reports.service';
import { ToastService } from '../../shared/toast.service';
import { mensajeError } from '../../shared/mensaje-error';
import { MapaRutasResponse, SucursalMapaFila } from '../../core/models/reports.model';
import { MapaRutasComponent } from './mapa-rutas.component';
import {
  DefinicionReporte,
  ETIQUETAS_FILTRO,
  FiltroReporte,
  REPORTES_GLOBALES,
  REPORTES_SUCURSAL,
} from './reporte-config';

type Fila = Record<string, number | string | boolean | null>;

/**
 * Página única de reportes con pestañas (estilo v-tabs):
 * - ADMIN_SISTEMA → pestañas RG1–RG6 (globales).
 * - ADMIN_SUCURSAL → pestañas RS1–RS6 de SU sucursal (tomada de la sesión, sin pedir el ID).
 * Los filtros generales (fechas y demás) están fuera de las pestañas y aplican a la activa.
 * Cada endpoint responde JSON (ver en pantalla) o PDF (descargar), vía ?format=.
 */
@Component({
  selector: 'app-reportes',
  standalone: true,
  imports: [FormsModule, MapaRutasComponent],
  template: `
    <section class="mx-auto max-w-6xl px-4 py-8">
      <h1 class="page-title">Reportes {{ esSistema ? 'del sistema' : 'de mi sucursal' }}</h1>
      <p class="page-subtitle">
        Se alimentan de los eventos de los demás módulos. Si una tabla sale vacía, el módulo origen aún no ha publicado eventos.
      </p>

      <!-- Pestañas -->
      <div class="mt-4 flex flex-wrap gap-2" role="tablist" aria-label="Reportes">
        @for (r of reportes; track r.codigo) {
          <button type="button" role="tab" [attr.aria-selected]="codigo === r.codigo" [title]="r.codigo + ' · ' + r.descripcion"
            (click)="cambiarTab(r.codigo)"
            [class]="codigo === r.codigo ? 'btn-primary btn-sm' : 'btn-crema btn-sm'">
            {{ r.nombre }}
          </button>
        }
      </div>

      <!-- Filtros generales (fuera de las pestañas, aplican a la activa) -->
      <div class="card mt-4">
        <div class="flex flex-wrap items-center gap-3">
          <p class="w-full font-bold text-azul">{{ definicion?.codigo }} · {{ definicion?.nombre }}</p>
          <p class="page-subtitle w-full">{{ definicion?.descripcion }}</p>
          @for (f of filtrosDeLaTab; track f) {
            <div class="field !mb-0 min-w-40 flex-1">
              <label class="label" [for]="'g-' + f">{{ etiquetas[f] }}</label>
              @if (f === 'sucursalId' && opcionesSucursal.length) {
                <select class="input" id="g-sucursalId" [(ngModel)]="filtros['sucursalId']" (change)="alCambiarFiltroSucursal()">
                  <option value="">Todas las sucursales</option>
                  @for (s of opcionesSucursal; track s.sucursalId) {
                    <option [value]="s.sucursalId">{{ s.nombre }}</option>
                  }
                </select>
              } @else {
                <input class="input" [id]="'g-' + f" [(ngModel)]="filtros[f]"
                  [type]="f === 'desde' || f === 'hasta' ? 'date' : f === 'limite' ? 'number' : 'text'"
                  [placeholder]="f === 'limite' ? '10' : f === 'estado' ? 'ACTIVO' : f === 'sucursalId' ? 'UUID (opcional)' : ''" />
              }
            </div>
          }
        </div>
        <div class="mt-4 flex flex-wrap gap-3">
          <button type="button" class="btn-primary" (click)="ver()" [disabled]="cargando">
            {{ cargando ? 'Cargando…' : 'Ver en pantalla' }}
          </button>
          <button type="button" class="btn-menta" (click)="descargar()" [disabled]="cargando">
            Descargar PDF
          </button>
        </div>
      </div>

      <!-- RG6: mapa + tablas -->
      @if (esMapa && mapa) {
        <div class="mt-4">
          <app-mapa-rutas [datos]="mapa" [resaltarSucursalId]="filtros['sucursalId'] || undefined"></app-mapa-rutas>
        </div>
        <div class="card mt-4">
          <h2 class="font-bold text-azul">Sucursales ({{ mapa.sucursales.length }})</h2>
        </div>
        <div class="table-wrap mt-2">
          <table class="table">
            <thead><tr><th>Sucursal</th><th>Latitud</th><th>Longitud</th><th>Estado</th></tr></thead>
            <tbody>
              @for (s of mapa.sucursales; track s.sucursalId) {
                <tr><td>{{ s.nombre }}</td><td>{{ s.latitud }}</td><td>{{ s.longitud }}</td>
                <td><span [class]="claseEstado(s.activa ? 'ACTIVA' : 'INACTIVA')">{{ s.activa ? 'ACTIVA' : 'INACTIVA' }}</span></td></tr>
              } @empty {
                <tr><td colspan="4" class="!text-center text-cafe">Sin sucursales en la proyección: fleet aún no publica eventos.</td></tr>
              }
            </tbody>
          </table>
        </div>
        <div class="card mt-4">
          <h2 class="font-bold text-azul">Rutas ({{ mapa.rutas.length }})</h2>
        </div>
        <div class="table-wrap mt-2">
          <table class="table">
            <thead><tr><th>Origen</th><th>Destino</th><th>Km</th><th>Precio boleto (Q)</th><th>Estado</th></tr></thead>
            <tbody>
              @for (r of mapa.rutas; track r.rutaId) {
                <tr><td>{{ nombreSucursal(r.sucursalOrigenId, r.origen) }}</td><td>{{ nombreSucursal(r.sucursalDestinoId, r.destino) }}</td>
                <td>{{ r.distanciaKm }}</td><td>{{ dinero(r.precioBoleto) }}</td>
                <td><span [class]="claseEstado(r.activa ? 'ACTIVA' : 'INACTIVA')">{{ r.activa ? 'ACTIVA' : 'INACTIVA' }}</span></td></tr>
              } @empty {
                <tr><td colspan="5" class="!text-center text-cafe">Sin rutas en la proyección: trips aún no publica eventos.</td></tr>
              }
            </tbody>
          </table>
        </div>
      } @else if (consultado) {
        <div class="table-wrap mt-4">
          <table class="table">
            <thead><tr>
              @for (c of definicion?.columnas ?? []; track c.clave) { <th>{{ c.etiqueta }}</th> }
            </tr></thead>
            <tbody>
              @for (fila of filas; track $index) {
                <tr>
                  @for (c of definicion?.columnas ?? []; track c.clave) {
                    <td>
                      @if (c.formato === 'dinero') { {{ dinero(fila[c.clave]) }} }
                      @else if (c.formato === 'estado') { <span [class]="claseEstado(fila[c.clave])">{{ fila[c.clave] ?? '—' }}</span> }
                      @else { {{ fila[c.clave] ?? '—' }} }
                    </td>
                  }
                </tr>
              } @empty {
                <tr><td [attr.colspan]="(definicion?.columnas ?? []).length || 1" class="!text-center text-cafe">
                  Sin datos: revisa los filtros o que el módulo origen ya esté generando eventos.
                </td></tr>
              }
              @if (filas.length && (definicion?.totaliza?.length ?? 0)) {
                <tr class="font-bold">
                  @for (c of definicion?.columnas ?? []; track c.clave) {
                    <td>{{ totalColumna(c.clave) }}</td>
                  }
                </tr>
              }
            </tbody>
          </table>
        </div>
      }
    </section>
  `,
})
export class ReportesComponent implements OnInit {
  private readonly reportesSrv = inject(ReportsService);
  private readonly auth = inject(AuthService);
  private readonly avisos = inject(ToastService);

  esSistema = false;
  reportes: DefinicionReporte[] = [];
  codigo = '';
  /** Filtros generales compartidos por todas las pestañas (las fechas persisten al cambiar de tab). */
  filtros: Record<string, string> = { limite: '10' };
  /** Sucursal fija del admin de sucursal (de la sesión; nunca se pide por teclado). */
  sucursalPropia = '';
  /** Catálogo de sucursales para los combos de filtro (se carga una vez en modo sistema). */
  catalogoSucursales: SucursalMapaFila[] = [];
  filas: Fila[] = [];
  mapa: MapaRutasResponse | null = null;
  consultado = false;
  cargando = false;
  readonly etiquetas = ETIQUETAS_FILTRO;

  get definicion(): DefinicionReporte | undefined {
    return this.reportes.find((r) => r.codigo === this.codigo);
  }

  get filtrosDeLaTab(): FiltroReporte[] {
    // En modo sucursal el ID va en la ruta, no se muestra ni se pide.
    return (this.definicion?.filtros ?? []).filter((f) => this.esSistema || f !== 'sucursalId');
  }

  get esMapa(): boolean {
    return (this.definicion?.columnas.length ?? 1) === 0;
  }

  /** Opciones del combo de sucursal: catálogo general + las de la última consulta (sin duplicar). */
  get opcionesSucursal(): SucursalMapaFila[] {
    const mapa = new Map<string, SucursalMapaFila>();
    for (const s of [...this.catalogoSucursales, ...(this.mapa?.sucursales ?? [])]) {
      if (!mapa.has(s.sucursalId)) mapa.set(s.sucursalId, s);
    }
    return [...mapa.values()];
  }

  ngOnInit(): void {
    this.esSistema = this.auth.tieneRol('ADMIN_SISTEMA');
    this.reportes = this.esSistema ? REPORTES_GLOBALES : REPORTES_SUCURSAL;
    this.codigo = this.reportes[0].codigo;
    this.sucursalPropia = this.auth.getUsuario()?.sucursalId ?? '';
    if (!this.esSistema && !this.sucursalPropia) {
      this.avisos.error('Tu usuario no tiene sucursal asignada. Pide a un administrador que la configure.');
    }
    if (this.esSistema) {
      // Catálogo para los combos "filtrar por sucursal" de los reportes globales.
      this.reportesSrv.json<MapaRutasResponse>('/mapa-rutas', {}).subscribe({
        next: (res) => (this.catalogoSucursales = res?.sucursales ?? []),
        error: () => (this.catalogoSucursales = []),
      });
    }
  }

  cambiarTab(codigo: string): void {
    this.codigo = codigo;
    this.filas = [];
    this.mapa = null;
    this.consultado = false;
    // El mapa se carga solo al entrar a su pestaña para que se vea de inmediato.
    if (this.esMapa) this.ver();
  }

  /** Al elegir sucursal en el combo del mapa se recarga filtrando por su origen. */
  alElegirSucursalMapa(): void {
    if (this.consultado || this.filtros['sucursalId']) this.ver();
  }

  /** Al elegir sucursal en un combo de filtro: en el mapa recarga, en los demás solo filtra. */
  alCambiarFiltroSucursal(): void {
    if (this.esMapa) this.alElegirSucursalMapa();
  }

  private static ES_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  /** Nombre de sucursal para mostrar: prefiere el catálogo cargado si el dato viene como UUID. */
  nombreSucursal(id: string | null | undefined, reserva?: string | null): string {
    const porId = (this.mapa?.sucursales ?? []).find((s) => s.sucursalId === id)?.nombre;
    if (reserva && !ReportesComponent.ES_UUID.test(reserva)) return reserva;
    return porId ?? reserva ?? id ?? '—';
  }

  private rutaActual(): string {
    const sucursalRuta = this.esSistema ? (this.filtros['sucursalId'] ?? '') : this.sucursalPropia;
    return this.definicion?.ruta(sucursalRuta) ?? '';
  }

  private params(): Record<string, string | undefined> {
    const p: Record<string, string | undefined> = {};
    for (const f of this.definicion?.filtros ?? []) {
      // El ID de sucursal del admin de sucursal viaja en la ruta, no en query.
      if (!this.esSistema && f === 'sucursalId') continue;
      p[f] = this.filtros[f] || undefined;
    }
    return p;
  }

  private sucursalLista(): boolean {
    if (this.esSistema) return true;
    if (!this.sucursalPropia) {
      this.avisos.error('Tu usuario no tiene sucursal asignada.');
      return false;
    }
    return true;
  }

  ver(): void {
    if (!this.definicion || !this.sucursalLista()) return;
    this.cargando = true;
    this.reportesSrv.json<unknown>(this.rutaActual(), this.params()).subscribe({
      next: (res) => {
        this.cargando = false;
        this.consultado = true;
        if (this.esMapa) {
          this.mapa = res as MapaRutasResponse;
          this.avisos.info(`${this.mapa.sucursales.length} sucursales, ${this.mapa.rutas.length} rutas.`);
        } else {
          this.filas = (res as Fila[]) ?? [];
          this.avisos.success(`${this.filas.length} filas.`);
        }
      },
      error: (e) => {
        this.cargando = false;
        this.avisos.error(mensajeError(e, 'No se pudo cargar el reporte.'));
      },
    });
  }

  descargar(): void {
    if (!this.definicion || !this.sucursalLista()) return;
    this.cargando = true;
    this.reportesSrv.pdf(this.rutaActual(), this.params(), `${this.codigo.toLowerCase()}.pdf`).subscribe({
      next: (pdf) => {
        this.cargando = false;
        this.reportesSrv.descargarPdf(pdf);
        this.avisos.success(`PDF descargado: ${pdf.nombre}`);
      },
      error: (e) => {
        this.cargando = false;
        this.avisos.error(mensajeError(e, 'No se pudo generar el PDF.'));
      },
    });
  }

  dinero(v: number | string | boolean | null): string {
    const n = Number(v ?? 0);
    return Number.isFinite(n) ? n.toFixed(2) : '0.00';
  }

  claseEstado(v: number | string | boolean | null): string {
    const s = String(v ?? '').toUpperCase();
    if (s.includes('ACTIV')) return 'badge-activo';
    if (s.includes('BLOQ')) return 'badge-bloqueado';
    return 'badge-inactivo';
  }

  totalColumna(clave: string): string {
    if (!this.definicion?.totaliza?.includes(clave)) {
      return clave === this.definicion?.columnas[0].clave ? 'Total' : '';
    }
    const total = this.filas.reduce((acc, f) => acc + Number(f[clave] ?? 0), 0);
    const esDinero = this.definicion.columnas.find((c) => c.clave === clave)?.formato === 'dinero';
    return esDinero ? total.toFixed(2) : String(Math.round(total * 100) / 100);
  }
}
