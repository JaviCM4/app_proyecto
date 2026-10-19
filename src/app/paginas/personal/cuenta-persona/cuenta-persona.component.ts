import { Component, effect, inject, input, model } from '@angular/core';
import { UsuarioBusqueda } from '../../../core/models/usuario.model';
import { AuthService } from '../../../core/services/auth.service';
import { BuscarCuentaComponent } from '../buscar-cuenta/buscar-cuenta.component';
import { DatosCuentaComponent } from '../datos-cuenta/datos-cuenta.component';
import { GrupoCuenta } from '../datos-cuenta/cuenta.form';

export type ModoCuenta = 'nueva' | 'existente';

/**
 * Cuenta de la persona que se asigna a una sucursal: crearle una cuenta nueva o elegir a alguien que ya
 * se registró (de la lista de cuentas, o por correo si quien asigna no puede verla). Con "ya tiene cuenta" el grupo de datos se deshabilita, así no
 * bloquea la validación del formulario padre.
 */
@Component({
  selector: 'app-cuenta-persona',
  standalone: true,
  imports: [DatosCuentaComponent, BuscarCuentaComponent],
  templateUrl: './cuenta-persona.component.html',
  styleUrl: './cuenta-persona.component.scss',
})
export class CuentaPersonaComponent {
  readonly grupo = input.required<GrupoCuenta>();
  readonly prefijo = input('cuenta');
  readonly modo = model<ModoCuenta>('nueva');
  readonly existente = model<UsuarioBusqueda | null>(null);
  /** Correo que el servidor rechazó por estar en uso: se ofrece asignar esa cuenta. */
  readonly correoEnUso = input<string | null>(null);

  readonly ayudaExistente = inject(AuthService).tieneRol('ADMIN_SISTEMA')
    ? 'Ya se registró en la plataforma: elígela de la lista.'
    : 'Ya se registró en la plataforma: búscala por su correo.';

  /** Correo con el que se abre la búsqueda cuando se elige "Asignar esa cuenta". */
  correoParaBuscar: string | null = null;

  constructor() {
    effect(() => {
      const grupo = this.grupo();
      if (this.modo() === 'existente') grupo.disable({ emitEvent: false });
      else grupo.enable({ emitEvent: false });
    });
  }

  cambiar(modo: ModoCuenta): void {
    if (modo === this.modo()) return;
    this.correoParaBuscar = null;
    this.existente.set(null);
    this.modo.set(modo);
  }

  usarCuentaExistente(correo: string): void {
    this.correoParaBuscar = correo;
    this.existente.set(null);
    this.modo.set('existente');
  }
}

/** ¿Se puede enviar? Cuenta nueva: lo valida el formulario. Existente: debe haber una cuenta apta elegida. */
export function cuentaElegidaValida(modo: ModoCuenta, existente: UsuarioBusqueda | null): boolean {
  return modo === 'nueva' || (!!existente && existente.puedeSerPersonal);
}
