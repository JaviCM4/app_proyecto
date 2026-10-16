import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { Categoria } from '../../../core/models/taller.model';
import { AuthService } from '../../../core/services/auth.service';
import { TallerService } from '../../../core/services/taller.service';
import { marcarErroresServidor, mensajeError } from '../../../core/utils/errores-http';
import { ConfirmacionComponent } from '../../../shared/components/confirmacion/confirmacion.component';
import { ModalComponent } from '../../../shared/components/modal/modal.component';
import { PaginadorComponent } from '../../../shared/components/paginador/paginador.component';
import { ToastService } from '../../../shared/services/toast.service';
import { normalizar, paginar } from '../../../shared/utils/paginacion';

/** Catálogo de categorías de gasto: todos las ven, solo el sistema las crea y edita. */
@Component({
  selector: 'app-categorias',
  standalone: true,
  imports: [FormsModule, ReactiveFormsModule, ModalComponent, ConfirmacionComponent, PaginadorComponent],
  templateUrl: './categorias.component.html',
  styleUrl: './categorias.component.scss',
})
export class CategoriasComponent implements OnInit {
  private readonly taller = inject(TallerService);
  private readonly avisos = inject(ToastService);
  private readonly fb = inject(FormBuilder);

  readonly puedeEditar = inject(AuthService).tieneRol('ADMIN_SISTEMA');

  private readonly categorias = signal<Categoria[]>([]);
  readonly cargando = signal(true);
  readonly texto = signal('');
  readonly pagina = signal(1);
  readonly tamano = signal(10);

  readonly enFormulario = signal<Categoria | null | undefined>(undefined);
  readonly porCambiar = signal<Categoria | null>(null);
  readonly enviando = signal(false);

  readonly form = this.fb.nonNullable.group({
    nombre: ['', [Validators.required, Validators.maxLength(60)]],
    descripcion: [''],
    activa: [true],
  });

  readonly filtradas = computed(() => {
    const b = normalizar(this.texto());
    return this.categorias().filter((c) => !b || normalizar(`${c.nombre} ${c.descripcion ?? ''}`).includes(b));
  });
  readonly paginaActual = computed(() => paginar(this.filtradas(), this.pagina(), this.tamano()));

  ngOnInit(): void {
    this.cargar();
  }

  cargar(): void {
    this.cargando.set(true);
    this.taller.categorias(null).subscribe({
      next: (lista) => {
        this.categorias.set(lista);
        this.cargando.set(false);
      },
      error: (e) => {
        this.cargando.set(false);
        this.avisos.error(mensajeError(e, 'No se pudieron cargar las categorías.'));
      },
    });
  }

  abrirNueva(): void {
    this.form.reset({ nombre: '', descripcion: '', activa: true });
    this.enFormulario.set(null);
  }

  abrirEditar(c: Categoria): void {
    this.form.reset({ nombre: c.nombre, descripcion: c.descripcion ?? '', activa: c.activa });
    this.enFormulario.set(c);
  }

  guardar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const f = this.form.getRawValue();
    const datos = { nombre: f.nombre.trim(), descripcion: f.descripcion.trim() || null, activa: f.activa };
    const actual = this.enFormulario();
    this.enviando.set(true);
    const peticion =
      actual == null
        ? this.taller.crearCategoria(datos)
        : this.taller.actualizarCategoria(actual.categoriaId, datos);
    peticion.subscribe({
      next: () => {
        this.enviando.set(false);
        this.enFormulario.set(undefined);
        this.avisos.exito(actual == null ? 'Categoría creada.' : 'Categoría actualizada.');
        this.cargar();
      },
      error: (e) => {
        this.enviando.set(false);
        marcarErroresServidor(this.form, e);
        this.avisos.error(mensajeError(e, 'No se pudo guardar la categoría.'));
      },
    });
  }

  confirmarCambio(c: Categoria): void {
    this.porCambiar.set(c);
  }

  ejecutarCambio(): void {
    const c = this.porCambiar();
    if (!c) return;
    this.porCambiar.set(null);
    this.taller.actualizarCategoria(c.categoriaId, { nombre: c.nombre, descripcion: c.descripcion, activa: !c.activa }).subscribe({
      next: () => {
        this.porCambiar.set(null);
        this.avisos.exito(c.activa ? 'Categoría desactivada.' : 'Categoría activada.');
        this.cargar();
      },
      error: (e) => {
        this.porCambiar.set(null);
        this.avisos.error(mensajeError(e, 'No se pudo cambiar el estado.'));
      },
    });
  }
}
