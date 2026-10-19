import { Component, OnInit, computed, effect, inject, input, model, signal, untracked } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { UsuarioBusqueda, UsuarioResumen } from '../../../core/models/usuario.model';
import { AuthService } from '../../../core/services/auth.service';
import { UsuariosService } from '../../../core/services/usuarios.service';
import { mensajeError } from '../../../core/utils/errores-http';
import { AvatarComponent } from '../../../shared/components/avatar/avatar.component';
import { RolTextoPipe } from '../../../shared/pipes/rol-texto.pipe';
import { normalizar } from '../../../shared/utils/paginacion';

const CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
/** Filas que se pintan a la vez; el resto se alcanza escribiendo en el buscador. */
const MAXIMO_VISIBLE = 50;

/**
 * Elige una cuenta que ya existe y muestra a quién pertenece.
 * - Administrador del sistema: se listan las cuentas activas (correo y nombre) y se filtran al escribir;
 *   al elegir una se consulta si puede tomar el puesto.
 * - Administrador de sucursal: no puede ver la lista de usuarios, así que busca por el correo exacto.
 * La cuenta elegida queda en `seleccion` (null mientras no hay una).
 * Con `validarPersonal` se indica si puede ser administrador de sucursal o cajero (y por qué no).
 */
@Component({
  selector: 'app-buscar-cuenta',
  standalone: true,
  imports: [AvatarComponent, RolTextoPipe],
  templateUrl: './buscar-cuenta.component.html',
  styleUrl: './buscar-cuenta.component.scss',
})
export class BuscarCuentaComponent implements OnInit {
  private readonly usuarios = inject(UsuariosService);

  readonly prefijo = input('buscar');
  readonly validarPersonal = input(true);
  /** Si llega un correo (p. ej. "ese correo ya tiene cuenta"), se busca de una vez. */
  readonly correoInicial = input<string | null>(null);
  readonly seleccion = model<UsuarioBusqueda | null>(null);

  /** Solo el administrador del sistema puede listar las cuentas. */
  readonly conLista = signal(inject(AuthService).tieneRol('ADMIN_SISTEMA'));

  readonly correo = signal('');
  readonly buscando = signal(false);
  /** Correo de la fila que se está verificando. */
  readonly verificando = signal<string | null>(null);
  readonly aviso = signal<string | null>(null);
  readonly noExiste = signal(false);

  readonly cargandoLista = signal(false);
  private readonly cuentas = signal<UsuarioResumen[]>([]);

  readonly coincidencias = computed(() => {
    const buscado = normalizar(this.correo());
    return this.cuentas().filter((u) => !buscado || normalizar(`${u.correo} ${u.nombre}`).includes(buscado));
  });
  readonly visibles = computed(() => this.coincidencias().slice(0, MAXIMO_VISIBLE));
  readonly ocultas = computed(() => this.coincidencias().length - this.visibles().length);

  constructor() {
    effect(() => {
      const inicial = this.correoInicial();
      if (inicial) {
        untracked(() => {
          this.correo.set(inicial);
          this.buscar();
        });
      }
    });
  }

  ngOnInit(): void {
    if (this.conLista()) this.cargarCuentas();
  }

  private cargarCuentas(): void {
    this.cargandoLista.set(true);
    this.usuarios.listar({ estado: 'ACTIVO' }).subscribe({
      next: (lista) => {
        this.cuentas.set(lista);
        this.cargandoLista.set(false);
      },
      // Sin lista se sigue pudiendo buscar por el correo exacto.
      error: () => {
        this.cargandoLista.set(false);
        this.conLista.set(false);
      },
    });
  }

  /** Elegir una fila de la lista: se consulta la cuenta para saber si puede tomar el puesto. */
  elegir(cuenta: UsuarioResumen): void {
    if (this.verificando()) return;
    this.aviso.set(null);
    this.noExiste.set(false);
    this.verificando.set(cuenta.correo);
    this.usuarios.buscarPorCorreo(cuenta.correo).subscribe({
      next: (encontrada) => {
        this.verificando.set(null);
        this.seleccion.set(encontrada);
      },
      error: (e) => {
        this.verificando.set(null);
        this.aviso.set(mensajeError(e, 'No se pudo consultar la cuenta.'));
      },
    });
  }

  /** Búsqueda por correo exacto. */
  buscar(): void {
    const correo = this.correo().trim().toLowerCase();
    this.aviso.set(null);
    this.noExiste.set(false);
    if (!CORREO.test(correo)) {
      this.aviso.set('Escribe el correo completo con el que la persona se registró.');
      return;
    }
    this.buscando.set(true);
    this.seleccion.set(null);
    this.usuarios.buscarPorCorreo(correo).subscribe({
      next: (cuenta) => {
        this.buscando.set(false);
        this.seleccion.set(cuenta);
      },
      error: (e) => {
        this.buscando.set(false);
        if (e instanceof HttpErrorResponse && e.status === 404) {
          this.noExiste.set(true);
        } else {
          this.aviso.set(mensajeError(e, 'No se pudo buscar la cuenta.'));
        }
      },
    });
  }

  alEscribir(valor: string): void {
    this.correo.set(valor);
    if (this.seleccion()) this.seleccion.set(null);
    this.noExiste.set(false);
    this.aviso.set(null);
  }

  /**
   * Enter no envía el formulario que contiene al buscador: con lista elige la única coincidencia,
   * sin lista busca el correo escrito.
   */
  alPresionarEnter(evento: Event): void {
    evento.preventDefault();
    if (!this.conLista()) {
      this.buscar();
      return;
    }
    const coincidencias = this.coincidencias();
    if (coincidencias.length === 1) this.elegir(coincidencias[0]);
  }

  limpiar(): void {
    this.seleccion.set(null);
    this.correo.set('');
    this.noExiste.set(false);
    this.aviso.set(null);
  }
}
