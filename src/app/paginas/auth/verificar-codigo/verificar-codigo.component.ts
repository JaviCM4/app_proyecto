import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { mensajeError } from '../../../core/utils/errores-http';
import { limpiarRegreso, regresoPendiente } from '../../../core/utils/regreso';
import { ToastService } from '../../../shared/services/toast.service';

/** Segundo paso del login cuando la cuenta tiene verificación en dos pasos. */
@Component({
  selector: 'app-verificar-codigo',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './verificar-codigo.component.html',
})
export class VerificarCodigoComponent implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly avisos = inject(ToastService);
  readonly enviando = signal(false);
  correo = '';

  readonly form = inject(FormBuilder).nonNullable.group({
    codigo: ['', [Validators.required, Validators.pattern(/^[0-9]{6}$/)]],
  });

  ngOnInit(): void {
    if (!this.auth.desafio) {
      this.router.navigateByUrl('/login');
      return;
    }
    this.correo = this.auth.desafio.correo;
  }

  verificar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.enviando.set(true);
    this.auth.verificarCodigo(this.correo, this.form.getRawValue().codigo).subscribe({
      next: () => {
        const destino = regresoPendiente();
        limpiarRegreso();
        this.router.navigateByUrl(destino);
      },
      error: (e) => {
        this.enviando.set(false);
        this.avisos.error(mensajeError(e, 'El código no es válido.'));
      },
    });
  }
}
