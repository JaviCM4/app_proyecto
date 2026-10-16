import { Component, input } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { GrupoCuenta } from './cuenta.form';

/** Campos de la cuenta de una persona (nombres, correo, DPI...). Recibe el grupo del formulario padre. */
@Component({
  selector: 'app-datos-cuenta',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './datos-cuenta.component.html',
  styleUrl: './datos-cuenta.component.scss',
})
export class DatosCuentaComponent {
  readonly grupo = input.required<GrupoCuenta>();
  /** Prefijo para los id de los campos (cuando hay dos formularios en la misma página). */
  readonly prefijo = input('cuenta');

  invalido(campo: string): boolean {
    const c = this.grupo().get(campo);
    return !!c && c.touched && c.invalid;
  }

  errorServidor(campo: string): string | null {
    return (this.grupo().get(campo)?.errors?.['servidor'] as string | undefined) ?? null;
  }
}
