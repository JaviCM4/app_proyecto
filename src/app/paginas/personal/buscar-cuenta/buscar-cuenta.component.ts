import { Component, effect, inject, input, model, signal, untracked } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { UsuarioBusqueda } from '../../../core/models/usuario.model';
import { UsuariosService } from '../../../core/services/usuarios.service';
import { mensajeError } from '../../../core/utils/errores-http';
import { AvatarComponent } from '../../../shared/components/avatar/avatar.component';

const CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Busca una cuenta que ya existe por su correo exacto y muestra a quién pertenece.
 * La cuenta encontrada queda en `seleccion` (null mientras no hay una).
 * Con `validarPersonal` se indica si puede ser administrador de sucursal o cajero (y por qué no).
 */
@Component({
  selector: 'app-buscar-cuenta',
  standalone: true,
  imports: [AvatarComponent],
  templateUrl: './buscar-cuenta.component.html',
  styleUrl: './buscar-cuenta.component.scss',
})
export class BuscarCuentaComponent {
  private readonly usuarios = inject(UsuariosService);

  readonly prefijo = input('buscar');
  readonly validarPersonal = input(true);
  /** Si llega un correo (p. ej. "ese correo ya tiene cuenta"), se busca de una vez. */
  readonly correoInicial = input<string | null>(null);
  readonly seleccion = model<UsuarioBusqueda | null>(null);

  readonly correo = signal('');
  readonly buscando = signal(false);
  readonly aviso = signal<string | null>(null);
  readonly noExiste = signal(false);

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

  /** Enter busca en vez de enviar el formulario que contiene al buscador. */
  alPresionarEnter(evento: Event): void {
    evento.preventDefault();
    this.buscar();
  }

  limpiar(): void {
    this.seleccion.set(null);
    this.correo.set('');
    this.noExiste.set(false);
    this.aviso.set(null);
  }
}
