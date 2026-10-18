import { formatCurrency, formatDate, formatNumber } from '@angular/common';
import { Component, LOCALE_ID, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Bus } from '../../core/models/bus.model';
import { FilaReporte, MapaRutas } from '../../core/models/reporte.model';
import { Sucursal } from '../../core/models/sucursal.model';
import { Categoria } from '../../core/models/taller.model';
import { Ruta } from '../../core/models/viaje.model';
import { AuthService } from '../../core/services/auth.service';
import { BusesService } from '../../core/services/buses.service';
import { ReportesService } from '../../core/services/reportes.service';
import { SucursalesService } from '../../core/services/sucursales.service';
import { TallerService } from '../../core/services/taller.service';
import { ViajesService } from '../../core/services/viajes.service';
import { mensajeError } from '../../core/utils/errores-http';
import { PaginadorComponent } from '../../shared/components/paginador/paginador.component';
import { ToastService } from '../../shared/services/toast.service';
import { paginar } from '../../shared/utils/paginacion';
import { MapaRutasComponent } from './mapa-rutas/mapa-rutas.component';
import { Ambito, Columna, REPORTES, Reporte, TEXTO_ESTADO } from './reportes.config';

interface Filtros {
  desde: string;
  hasta: string;
  sucursalId: string;
  busId: string;
  rutaId: string;
  categoriaId: string;
  estado: string;
  limite: number;
}

/** Sección de una tabla agrupada (por categoría o por bus). */
interface Grupo {
  clave: string;
  filas: FilaReporte[];
  subtotal: number;
}

/**
 * Reportes en pestañas.
 * - Administrador del sistema: reportes del sistema y de cualquier sucursal.
 * - Administrador de sucursal: solo los de su sucursal.
 * Cada reporte se ve en pantalla y se descarga en PDF.
 */
@Component({
  selector: 'app-reportes',
  standalone: true,
  imports: [FormsModule, PaginadorComponent, MapaRutasComponent],
  templateUrl: './reportes.component.html',
  styleUrl: './reportes.component.scss',
})
export class ReportesComponent implements OnInit {
  private readonly servicio = inject(ReportesService);
  private readonly sucursalesServicio = inject(SucursalesService);
  private readonly busesServicio = inject(BusesService);
  private readonly viajesServicio = inject(ViajesService);
  private readonly tallerServicio = inject(TallerService);
  private readonly avisos = inject(ToastService);
  private readonly locale = inject(LOCALE_ID);
  private readonly auth = inject(AuthService);

  readonly esSistema = this.auth.tieneRol('ADMIN_SISTEMA');
  private readonly sucursalPropia = this.auth.usuario()?.sucursalId ?? '';

  readonly ambito = signal<Ambito>(this.esSistema ? 'sistema' : 'sucursal');
  readonly codigo = signal('');
  /** Sucursal de los reportes "por sucursal" (el admin de sucursal siempre ve la suya). */
  readonly sucursalReporte = signal(this.sucursalPropia);

  readonly sucursales = signal<Sucursal[]>([]);
  readonly buses = signal<Bus[]>([]);
  readonly categorias = signal<Categoria[]>([]);
  private readonly rutas = signal<Ruta[]>([]);

  filtros: Filtros = { desde: '', hasta: '', sucursalId: '', busId: '', rutaId: '', categoriaId: '', estado: '', limite: 10 };

  readonly filas = signal<FilaReporte[]>([]);
  readonly mapa = signal<MapaRutas | null>(null);
  readonly cargando = signal(false);
  readonly consultado = signal(false);
  readonly pagina = signal(1);
  readonly tamano = signal(10);

  readonly pestanas = computed(() => REPORTES.filter((r) => r.ambito === this.ambito()));
  readonly reporte = computed<Reporte | undefined>(() => REPORTES.find((r) => r.codigo === this.codigo()));
  readonly paginaActual = computed(() => paginar(this.filas(), this.pagina(), this.tamano()));

  /** Rutas que salen de la sucursal del reporte (para el filtro de ruta). */
  readonly rutasSucursal = computed(() => this.rutas().filter((r) => r.sucursalOrigenId === this.sucursalReporte()));

  /** Fila de totales (se suma sobre todas las filas, no solo la página). */
  readonly totales = computed(() => {
    const r = this.reporte();
    if (!r?.totaliza?.length || this.filas().length === 0) return null;
    const total: FilaReporte = {};
    for (const clave of r.totaliza) total[clave] = this.filas().reduce((a, f) => a + Number(f[clave] ?? 0), 0);
    return total;
  });

  /** true = la tabla se muestra en secciones (por categoría o por bus) con subtotales. */
  readonly agrupado = computed(() => !!this.reporte()?.agrupar);

  /** Secciones de la tabla agrupada: los valores distintos de la clave de agrupación. */
  readonly grupos = computed<Grupo[]>(() => {
    const ag = this.reporte()?.agrupar;
    if (!ag) return [];
    const mapa = new Map<string, FilaReporte[]>();
    for (const fila of this.filas()) {
      const clave = String(fila[ag.por] ?? '—');
      const existente = mapa.get(clave);
      if (existente) existente.push(fila);
      else mapa.set(clave, [fila]);
    }
    return [...mapa.entries()].map(([clave, filas]) => ({
      clave,
      filas,
      subtotal: filas.reduce((a, f) => a + Number(f[ag.subtotal] ?? 0), 0),
    }));
  });

  /** Columnas que se muestran dentro de cada sección (sin la columna de agrupación). */
  readonly columnasGrupo = computed<Columna[]>(() => {
    const r = this.reporte();
    if (!r) return [];
    const por = r.agrupar?.por;
    return por ? r.columnas.filter((c) => c.clave !== por) : r.columnas;
  });

  /** Suma del gran total de la tabla agrupada. */
  readonly totalGeneral = computed(() => {
    const clave = this.reporte()?.agrupar?.subtotal;
    if (!clave) return 0;
    return this.filas().reduce((a, f) => a + Number(f[clave] ?? 0), 0);
  });

  ngOnInit(): void {
    this.sucursalesServicio.listar().subscribe({ next: (s) => this.sucursales.set(s) });
    this.viajesServicio.rutas(false).subscribe({ next: (r) => this.rutas.set(r) });
    // Categorías de taller por si el reporte activo filtra por categoría (ADMIN_SISTEMA/ADMIN_SUCURSAL).
    this.tallerServicio.categorias().subscribe({
      next: (c) => this.categorias.set(c),
      error: () => this.categorias.set([]),
    });
    if (!this.esSistema && !this.sucursalPropia) {
      this.avisos.error('Tu cuenta no tiene una sucursal asignada.');
    }
    this.cargarBuses();
    this.elegir(this.pestanas()[0].codigo);
  }

  usa(filtro: string): boolean {
    return this.reporte()?.filtros.includes(filtro as never) ?? false;
  }

  cambiarAmbito(ambito: Ambito): void {
    this.ambito.set(ambito);
    this.elegir(this.pestanas()[0].codigo);
  }

  cambiarSucursalReporte(id: string): void {
    this.sucursalReporte.set(id);
    this.filtros = { ...this.filtros, busId: '', rutaId: '' };
    this.cargarBuses();
    this.ver();
  }

  /** En los reportes del sistema, la lista de buses depende de la sucursal elegida en el filtro. */
  alCambiarSucursalFiltro(): void {
    this.filtros.busId = '';
    this.cargarBuses();
    if (this.reporte()?.esMapa) this.ver();
  }

  elegir(codigo: string): void {
    this.codigo.set(codigo);
    this.filtros = { ...this.filtros, busId: '', rutaId: '', categoriaId: '', estado: '' };
    this.filas.set([]);
    this.mapa.set(null);
    this.consultado.set(false);
    this.ver();
  }

  ver(): void {
    const r = this.reporte();
    if (!r || !this.listo() || !this.rangoFechasValido()) return;
    this.cargando.set(true);
    this.servicio.datos<unknown>(r.ruta(this.sucursalReporte()), this.parametros(r)).subscribe({
      next: (json) => {
        if (r.esMapa) this.mapa.set(json as MapaRutas);
        else this.filas.set(r.aplanar(json));
        this.pagina.set(1);
        this.consultado.set(true);
        this.cargando.set(false);
      },
      error: (e) => {
        this.cargando.set(false);
        this.avisos.error(mensajeError(e, 'No se pudo cargar el reporte.'));
      },
    });
  }

  descargar(): void {
    const r = this.reporte();
    if (!r || !this.listo() || !this.rangoFechasValido()) return;
    this.cargando.set(true);
    this.servicio.pdf(r.ruta(this.sucursalReporte()), this.parametros(r), `${r.codigo}.pdf`).subscribe({
      next: (pdf) => {
        this.cargando.set(false);
        this.servicio.guardar(pdf);
      },
      error: (e) => {
        this.cargando.set(false);
        this.avisos.error(mensajeError(e, 'No se pudo generar el PDF.'));
      },
    });
  }

  limpiar(): void {
    this.filtros = { desde: '', hasta: '', sucursalId: '', busId: '', rutaId: '', categoriaId: '', estado: '', limite: 10 };
    this.cargarBuses();
    this.ver();
  }

  /** Texto de una celda según el formato de la columna. */
  valor(fila: FilaReporte, columna: Columna): string {
    const v = fila[columna.clave];
    if (v === null || v === undefined || v === '') return '—';
    switch (columna.formato) {
      case 'dinero':
        return formatCurrency(Number(v), this.locale, 'Q', 'GTQ', '1.2-2');
      case 'numero':
        return formatNumber(Number(v), this.locale, '1.0-2');
      case 'fecha': {
        const texto = String(v);
        return texto.length === 10
          ? formatDate(texto, 'dd/MM/yyyy', this.locale, 'UTC')
          : formatDate(texto, 'dd/MM/yyyy HH:mm', this.locale, '-0600');
      }
      case 'estado':
        return TEXTO_ESTADO[String(v)] ?? String(v);
      default:
        return String(v);
    }
  }

  esNegativo(fila: FilaReporte, columna: Columna): boolean {
    return columna.formato === 'dinero' && Number(fila[columna.clave]) < 0;
  }

  /** Monto en quetzales (subtotales y total general de las tablas agrupadas). */
  textoMonto(monto: number): string {
    return formatCurrency(monto, this.locale, 'Q', 'GTQ', '1.2-2');
  }

  private listo(): boolean {
    if (this.reporte()?.ambito === 'sucursal' && !this.sucursalReporte()) {
      if (this.esSistema) return false; // falta elegir la sucursal
      this.avisos.error('Tu cuenta no tiene una sucursal asignada.');
      return false;
    }
    return true;
  }

  private parametros(r: Reporte): Record<string, string | number> {
    const f = this.filtros;
    const p: Record<string, string | number> = {};
    if (r.filtros.includes('fechas')) Object.assign(p, { desde: f.desde, hasta: f.hasta });
    if (r.filtros.includes('sucursal')) p['sucursalId'] = f.sucursalId;
    if (r.filtros.includes('bus')) p['busId'] = f.busId;
    if (r.filtros.includes('ruta')) p['rutaId'] = f.rutaId;
    if (r.filtros.includes('categoria')) p['categoriaId'] = f.categoriaId;
    if (r.filtros.includes('estadoBus') || r.filtros.includes('estadoChofer')) p['estado'] = f.estado;
    if (r.filtros.includes('limite')) p['limite'] = f.limite;
    return p;
  }

  /** El rango de fechas debe ser coherente (desde ≤ hasta) antes de pedir el reporte. */
  private rangoFechasValido(): boolean {
    const { desde, hasta } = this.filtros;
    if (this.usa('fechas') && desde && hasta && desde > hasta) {
      this.avisos.error('La fecha inicial no puede ser posterior a la fecha final.');
      return false;
    }
    return true;
  }

  private cargarBuses(): void {
    const sucursal = this.ambito() === 'sucursal' ? this.sucursalReporte() : this.filtros.sucursalId;
    if (!this.esSistema && !this.sucursalPropia) return;
    this.busesServicio.listar(this.esSistema ? sucursal : null).subscribe({
      next: (b) => this.buses.set(b),
      error: () => this.buses.set([]),
    });
  }
}
