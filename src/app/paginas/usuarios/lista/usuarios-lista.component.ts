import { DatePipe } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Rol } from '../../../core/models/auth.model';
import { EstadoUsuario, UsuarioResumen } from '../../../core/models/usuario.model';
import { UsuariosService } from '../../../core/services/usuarios.service';
import { mensajeError } from '../../../core/utils/errores-http';
import { PaginadorComponent } from '../../../shared/components/paginador/paginador.component';
import { ESTADO_USUARIO } from '../../../shared/constants/estados';
import { NOMBRE_ROL, ORDEN_ROL } from '../../../shared/constants/roles';
import { RolTextoPipe } from '../../../shared/pipes/rol-texto.pipe';
import { ToastService } from '../../../shared/services/toast.service';
import { normalizar, paginar } from '../../../shared/utils/paginacion';
import { UsuarioDetalleComponent } from '../detalle/usuario-detalle.component';
import { NuevoAdminComponent } from '../nuevo-admin/nuevo-admin.component';
import { AgregarPersonalComponent } from '../../personal/agregar-personal/agregar-personal.component';

/** Usuarios del sistema: búsqueda, detalle, estado de la cuenta y nuevos administradores del sistema. */
@Component({
  selector: 'app-usuarios-lista',
  standalone: true,
  imports: [FormsModule, DatePipe, RolTextoPipe, PaginadorComponent, UsuarioDetalleComponent, NuevoAdminComponent, AgregarPersonalComponent],
  templateUrl: './usuarios-lista.component.html',
})
export class UsuariosListaComponent implements OnInit {
  private readonly servicio = inject(UsuariosService);
  private readonly avisos = inject(ToastService);

  readonly roles = ORDEN_ROL.map((r) => ({ valor: r, texto: NOMBRE_ROL[r] }));
  readonly estados = ESTADO_USUARIO;

  private readonly usuarios = signal<UsuarioResumen[]>([]);
  readonly cargando = signal(true);
  readonly rol = signal<Rol | ''>('');
  readonly estado = signal<EstadoUsuario | ''>('');
  readonly texto = signal('');
  readonly pagina = signal(1);
  readonly tamano = signal(10);

  readonly seleccionado = signal<string | null>(null);
  readonly creando = signal(false);
  readonly agregandoPersonal = signal(false);

  readonly filtrados = computed(() => {
    const buscado = normalizar(this.texto());
    return this.usuarios().filter((u) => !buscado || normalizar(`${u.nombre} ${u.correo} ${u.nit}`).includes(buscado));
  });
  readonly paginaActual = computed(() => paginar(this.filtrados(), this.pagina(), this.tamano()));

  ngOnInit(): void {
    this.cargar();
  }

  /** Rol y estado los filtra el servidor; el texto se busca en pantalla. */
  cargar(): void {
    this.cargando.set(true);
    this.servicio.listar({ rol: this.rol(), estado: this.estado() }).subscribe({
      next: (lista) => {
        this.usuarios.set(lista);
        this.pagina.set(1);
        this.cargando.set(false);
      },
      error: (e) => {
        this.cargando.set(false);
        this.avisos.error(mensajeError(e, 'No se pudieron cargar los usuarios.'));
      },
    });
  }

  cambiarRol(rol: Rol | ''): void {
    this.rol.set(rol);
    this.cargar();
  }

  cambiarEstado(estado: EstadoUsuario | ''): void {
    this.estado.set(estado);
    this.cargar();
  }

  buscar(texto: string): void {
    this.texto.set(texto);
    this.pagina.set(1);
  }

  alCrear(): void {
    this.creando.set(false);
    this.agregandoPersonal.set(false);
    this.cargar();
  }
}
