import { DatePipe } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { PersonalSucursal, Sucursal } from '../../../core/models/sucursal.model';
import { AuthService } from '../../../core/services/auth.service';
import { PersonalService } from '../../../core/services/personal.service';
import { SucursalesService } from '../../../core/services/sucursales.service';
import { mensajeError } from '../../../core/utils/errores-http';
import { PaginadorComponent } from '../../../shared/components/paginador/paginador.component';
import { NOMBRE_ROL } from '../../../shared/constants/roles';
import { ToastService } from '../../../shared/services/toast.service';
import { normalizar, paginar } from '../../../shared/utils/paginacion';
import { AccionPersonal, AccionPersonalComponent } from '../../personal/accion-personal/accion-personal.component';
import { AgregarPersonalComponent } from '../../personal/agregar-personal/agregar-personal.component';

type FiltroActivo = 'todos' | 'activos' | 'inactivos';

/** Personal de la sucursal (administradores y cajeros): lista, agregar, retirar y reintegrar. */
@Component({
  selector: 'app-personal',
  standalone: true,
  imports: [FormsModule, DatePipe, PaginadorComponent, AgregarPersonalComponent, AccionPersonalComponent],
  templateUrl: './personal.component.html',
  styleUrl: './personal.component.scss',
})
export class PersonalComponent implements OnInit {
  private readonly servicio = inject(PersonalService);
  private readonly sucursalesServicio = inject(SucursalesService);
  private readonly auth = inject(AuthService);
  private readonly avisos = inject(ToastService);

  readonly esSistema = this.auth.tieneRol('ADMIN_SISTEMA');
  readonly sucursalPropia = this.auth.usuario()?.sucursalId ?? '';

  readonly sucursales = signal<Sucursal[]>([]);
  /** Sucursal del personal (el admin de sucursal siempre ve la suya). */
  readonly sucursalSel = signal(this.sucursalPropia);

  private readonly personas = signal<PersonalSucursal[]>([]);
  readonly cargando = signal(true);

  readonly texto = signal('');
  readonly filtro = signal<FiltroActivo>('todos');
  readonly pagina = signal(1);
  readonly tamano = signal(10);

  readonly agregando = signal(false);
  readonly enAccion = signal<{ persona: PersonalSucursal; accion: AccionPersonal } | null>(null);
  readonly nombreRol = NOMBRE_ROL;

  readonly filtrados = computed(() => {
    const buscado = normalizar(this.texto());
    const filtro = this.filtro();
    return this.personas().filter(
      (p) =>
        (filtro === 'todos' || p.activo === (filtro === 'activos')) &&
        (!buscado || normalizar(`${p.nombreCompleto} ${p.correo}`).includes(buscado)),
    );
  });

  readonly paginaActual = computed(() => paginar(this.filtrados(), this.pagina(), this.tamano()));

  ngOnInit(): void {
    this.sucursalesServicio.listar(true).subscribe({ next: (s) => this.sucursales.set(s) });
    this.cargar();
  }

  sucursalEfectiva(): string {
    return this.esSistema ? this.sucursalSel() : this.sucursalPropia;
  }

  cargar(sucursalId = this.sucursalEfectiva()): void {
    if (!sucursalId) {
      this.personas.set([]);
      this.cargando.set(false);
      if (!this.esSistema) this.avisos.error('Tu cuenta no tiene una sucursal asignada.');
      return;
    }
    this.cargando.set(true);
    this.servicio.listar(sucursalId).subscribe({
      next: (lista) => {
        this.personas.set(lista);
        this.cargando.set(false);
      },
      error: (e) => {
        this.cargando.set(false);
        this.avisos.error(mensajeError(e, 'No se pudo cargar el personal.'));
      },
    });
  }

  filtrar(texto: string): void {
    this.texto.set(texto);
    this.pagina.set(1);
  }

  cambiarFiltro(filtro: FiltroActivo): void {
    this.filtro.set(filtro);
    this.pagina.set(1);
  }

  alCambiarSucursal(id: string): void {
    this.sucursalSel.set(id);
    this.pagina.set(1);
    this.cargar(id);
  }

  /**
   * Reintegrar solo se ofrece en la fila más reciente de cada persona que no esté activa
   * (si ya trabaja en otra sucursal, Fleet lo rechaza y se muestra el aviso).
   */
  esUltimaAsignacion(p: PersonalSucursal): boolean {
    const suyas = this.personas().filter((x) => x.usuarioId === p.usuarioId);
    if (suyas.some((x) => x.activo)) return false;
    return suyas.every((x) => x.fechaAsignacion <= p.fechaAsignacion);
  }

  alTerminarAccion(): void {
    this.enAccion.set(null);
    this.agregando.set(false);
    this.cargar();
  }
}
