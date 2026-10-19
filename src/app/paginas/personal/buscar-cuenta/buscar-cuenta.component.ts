import { Component, OnInit, computed, effect, inject, input, model, signal, untracked } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { PuestoAsignable, UsuarioAsignable, UsuarioBusqueda } from '../../../core/models/usuario.model';
import { UsuariosService } from '../../../core/services/usuarios.service';
import { mensajeError } from '../../../core/utils/errores-http';
import { AvatarComponent } from '../../../shared/components/avatar/avatar.component';
import { normalizar } from '../../../shared/utils/paginacion';

const CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
/** Filas que se pintan a la vez; el resto se alcanza escribiendo en el buscador. */
const MAXIMO_VISIBLE = 50;

/**
 * Elige una cuenta que ya existe para darle un puesto.
 * Se listan las cuentas activas que pueden tomar el `puesto` (Identity ya quitó las que no) y se filtran
 * al escribir; al elegir una se confirma con la búsqueda por correo, que dice si se puede asignar.
 * Si la persona no aparece se puede buscar su correo exacto para saber por qué.
 * La cuenta elegida queda en `seleccion` (null mientras no hay una).
 */
@Component({
  selector: 'app-buscar-cuenta',
  standalone: true,
  imports: [AvatarComponent],
  templateUrl: './buscar-cuenta.component.html',
  styleUrl: './buscar-cuenta.component.scss',
})
export class BuscarCuentaComponent implements OnInit {
  private readonly usuarios = inject(UsuariosService);

  readonly prefijo = input('buscar');
  /** Muestra si la cuenta elegida puede tomar el puesto (y por qué no). */
  readonly validarPersonal = input(true);
  /** Puesto que se va a asignar: decide las reglas con que Identity dice si la cuenta se puede asignar. */
  readonly puesto = input<PuestoAsignable>('PERSONAL');
  /** Si llega un correo (p. ej. "ese correo ya tiene cuenta"), se busca de una vez. */
  readonly correoInicial = input<string | null>(null);
  readonly seleccion = model<UsuarioBusqueda | null>(null);

  /** Si la lista no se pudo cargar se sigue pudiendo buscar por el correo exacto. */
  readonly conLista = signal(true);

  readonly correo = signal('');
  readonly buscando = signal(false);
  /** Correo de la fila que se está verificando. */
  readonly verificando = signal<string | null>(null);
  readonly aviso = signal<string | null>(null);
  readonly noExiste = signal(false);

  readonly cargandoLista = signal(false);
  private readonly cuentas = signal<UsuarioAsignable[]>([]);

  readonly coincidencias = computed(() => {
    const buscado = normalizar(this.correo());
    return this.cuentas().filter((u) => !buscado || normalizar(`${u.correo} ${u.nombreCompleto}`).includes(buscado));
  });
  readonly visibles = computed(() => this.coincidencias().slice(0, MAXIMO_VISIBLE));
  readonly ocultas = computed(() => this.coincidencias().length - this.visibles().length);
  /** Lo escrito es un correo completo que no está en la lista: se ofrece buscarlo para saber por qué. */
  readonly correoFueraDeLista = computed(() => {
    const correo = this.correo().trim().toLowerCase();
    return CORREO.test(correo) && !this.cuentas().some((u) => u.correo.toLowerCase() === correo) ? correo : null;
  });

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
    this.cargandoLista.set(true);
    this.usuarios.asignables(this.puesto()).subscribe({
      next: (lista) => {
        this.cuentas.set(lista);
        this.cargandoLista.set(false);
      },
      error: () => {
        this.cargandoLista.set(false);
        this.conLista.set(false);
      },
    });
  }

  /** Elegir una fila de la lista: se consulta la cuenta para confirmar que puede tomar el puesto. */
  elegir(cuenta: UsuarioAsignable): void {
    if (this.verificando()) return;
    this.aviso.set(null);
    this.noExiste.set(false);
    this.verificando.set(cuenta.correo);
    this.usuarios.buscarPorCorreo(cuenta.correo, this.puesto()).subscribe({
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

  /** Búsqueda por correo exacto (también para saber por qué una cuenta no aparece en la lista). */
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
    this.usuarios.buscarPorCorreo(correo, this.puesto()).subscribe({
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
   * Enter no envía el formulario que contiene al buscador: con lista elige la única coincidencia
   * (o busca el correo escrito si no está); sin lista busca el correo escrito.
   */
  alPresionarEnter(evento: Event): void {
    evento.preventDefault();
    const coincidencias = this.coincidencias();
    if (this.conLista() && coincidencias.length === 1) {
      this.elegir(coincidencias[0]);
    } else if (!this.conLista() || this.correoFueraDeLista()) {
      this.buscar();
    }
  }

  limpiar(): void {
    this.seleccion.set(null);
    this.correo.set('');
    this.noExiste.set(false);
    this.aviso.set(null);
  }
}
