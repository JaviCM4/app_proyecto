import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { BusDisponible, FiltroServicios, ServicioTaller } from '../../../core/models/taller.model';
import { AuthService } from '../../../core/services/auth.service';
import { TallerService } from '../../../core/services/taller.service';
import { mensajeError } from '../../../core/utils/errores-http';
import { ZONA_GT, hoyGt } from '../../../core/utils/fechas';
import { ModalComponent } from '../../../shared/components/modal/modal.component';
import { PaginadorComponent } from '../../../shared/components/paginador/paginador.component';
import { ToastService } from '../../../shared/services/toast.service';
import { paginar } from '../../../shared/utils/paginacion';
import { ServicioFormularioComponent } from './servicio-formulario.component';

/** Servicios de taller: historial con filtros, detalle con líneas y registro (solo sucursal). */
@Component({
  selector: 'app-servicios-taller',
  standalone: true,
  imports: [FormsModule, CurrencyPipe, DatePipe, ModalComponent, PaginadorComponent, ServicioFormularioComponent],
  templateUrl: './servicios.component.html',
  styleUrl: './servicios.component.scss',
})
export class ServiciosComponent implements OnInit {
  private readonly taller = inject(TallerService);
  private readonly avisos = inject(ToastService);
  readonly auth = inject(AuthService);
  readonly zona = ZONA_GT;

  readonly puedeRegistrar = this.auth.tieneRol('ADMIN_SUCURSAL');

  private readonly servicios = signal<ServicioTaller[]>([]);
  readonly buses = signal<BusDisponible[]>([]);
  readonly cargando = signal(true);

  readonly busId = signal('');
  readonly desde = signal('');
  readonly hasta = signal('');
  readonly pagina = signal(1);
  readonly tamano = signal(10);

  readonly creando = signal(false);
  readonly enDetalle = signal<ServicioTaller | null>(null);
  readonly cargandoDetalle = signal(false);

  readonly paginaActual = computed(() => paginar(this.servicios(), this.pagina(), this.tamano()));

  ngOnInit(): void {
    this.taller.busesDisponibles(true).subscribe({
      next: (b) => this.buses.set(b),
      error: () => this.buses.set([]),
    });
    this.buscar();
  }

  placaDe(busId: string): string {
    return this.buses().find((b) => b.busId === busId)?.placa ?? '';
  }

  buscar(): void {
    this.cargando.set(true);
    const filtro: FiltroServicios = {
      busId: this.busId() || null,
      desde: this.desde() || null,
      hasta: this.hasta() || null,
    };
    this.taller.listar(filtro).subscribe({
      next: (lista) => {
        this.servicios.set(lista);
        this.pagina.set(1);
        this.cargando.set(false);
      },
      error: (e) => {
        this.cargando.set(false);
        this.avisos.error(mensajeError(e, 'No se pudieron cargar los servicios.'));
      },
    });
  }

  limpiar(): void {
    this.busId.set('');
    this.desde.set('');
    this.hasta.set('');
    this.buscar();
  }

  alGuardar(): void {
    this.creando.set(false);
    this.buscar();
  }

  ver(id: string): void {
    this.enDetalle.set(null);
    this.cargandoDetalle.set(true);
    this.taller.detalle(id).subscribe({
      next: (s) => {
        this.enDetalle.set(s);
        this.cargandoDetalle.set(false);
      },
      error: (e) => {
        this.cargandoDetalle.set(false);
        this.avisos.error(mensajeError(e, 'No se pudo abrir el servicio.'));
      },
    });
  }

  hoy(): string {
    return hoyGt();
  }
}
