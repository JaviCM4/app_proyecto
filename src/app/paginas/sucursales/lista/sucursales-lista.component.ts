import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Sucursal } from '../../../core/models/sucursal.model';
import { SucursalesService } from '../../../core/services/sucursales.service';
import { mensajeError } from '../../../core/utils/errores-http';
import { ConfirmacionComponent } from '../../../shared/components/confirmacion/confirmacion.component';
import { PaginadorComponent } from '../../../shared/components/paginador/paginador.component';
import { ToastService } from '../../../shared/services/toast.service';
import { normalizar, paginar } from '../../../shared/utils/paginacion';
import { SucursalDetalleComponent } from '../detalle/sucursal-detalle.component';
import { SucursalFormularioComponent } from '../formulario/sucursal-formulario.component';

type FiltroEstado = 'todas' | 'activas' | 'inactivas';

/** Administración de sucursales: lista con búsqueda y paginación, nueva, editar y activar/desactivar. */
@Component({
  selector: 'app-sucursales-lista',
  standalone: true,
  imports: [FormsModule, PaginadorComponent, ConfirmacionComponent, SucursalFormularioComponent, SucursalDetalleComponent],
  templateUrl: './sucursales-lista.component.html',
  styleUrl: './sucursales-lista.component.scss',
})
export class SucursalesListaComponent implements OnInit {
  private readonly servicio = inject(SucursalesService);
  private readonly avisos = inject(ToastService);

  private readonly sucursales = signal<Sucursal[]>([]);
  readonly cargando = signal(true);

  readonly texto = signal('');
  readonly estado = signal<FiltroEstado>('todas');
  readonly pagina = signal(1);
  readonly tamano = signal(10);

  /** Modal de nueva/edición: undefined = cerrado, null = nueva, Sucursal = editar. */
  readonly enFormulario = signal<Sucursal | null | undefined>(undefined);
  /** Sucursal abierta en el detalle (datos y personal). */
  readonly enDetalle = signal<Sucursal | null>(null);
  /** Sucursal a la que se le cambiará el estado (abre la confirmación). */
  readonly porCambiar = signal<Sucursal | null>(null);
  readonly cambiando = signal(false);

  readonly filtradas = computed(() => {
    const buscado = normalizar(this.texto());
    const estado = this.estado();
    return this.sucursales().filter(
      (s) =>
        (estado === 'todas' || s.activa === (estado === 'activas')) &&
        (!buscado || normalizar(`${s.codigo} ${s.nombre} ${s.municipio} ${s.departamento}`).includes(buscado)),
    );
  });

  readonly paginaActual = computed(() => paginar(this.filtradas(), this.pagina(), this.tamano()));

  ngOnInit(): void {
    this.cargar();
  }

  cargar(): void {
    this.cargando.set(true);
    this.servicio.listar().subscribe({
      next: (lista) => {
        this.sucursales.set(lista);
        this.cargando.set(false);
      },
      error: (e) => {
        this.cargando.set(false);
        this.avisos.error(mensajeError(e, 'No se pudieron cargar las sucursales.'));
      },
    });
  }

  filtrar(texto: string): void {
    this.texto.set(texto);
    this.pagina.set(1);
  }

  cambiarFiltroEstado(estado: FiltroEstado): void {
    this.estado.set(estado);
    this.pagina.set(1);
  }

  alGuardar(): void {
    this.enFormulario.set(undefined);
    this.enDetalle.set(null);
    this.cargar();
  }

  /** Desde el detalle se puede pasar a editar la sucursal. */
  editarDesdeDetalle(s: Sucursal): void {
    this.enDetalle.set(null);
    this.enFormulario.set(s);
  }

  confirmarCambioEstado(): void {
    const s = this.porCambiar();
    if (!s) return;
    this.cambiando.set(true);
    this.servicio.cambiarEstado(s.sucursalId, !s.activa, s.version).subscribe({
      next: (actualizada) => {
        this.sucursales.update((lista) => lista.map((x) => (x.sucursalId === actualizada.sucursalId ? actualizada : x)));
        this.avisos.exito(actualizada.activa ? 'Sucursal activada.' : 'Sucursal desactivada.');
        this.cambiando.set(false);
        this.porCambiar.set(null);
      },
      error: (e) => {
        this.cambiando.set(false);
        this.porCambiar.set(null);
        this.avisos.error(mensajeError(e, 'No se pudo cambiar el estado.'));
      },
    });
  }
}
