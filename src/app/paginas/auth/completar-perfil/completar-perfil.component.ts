import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { UsuariosService } from '../../../core/services/usuarios.service';
import { errorApi, marcarErroresServidor, mensajeError } from '../../../core/utils/errores-http';
import { AvatarComponent } from '../../../shared/components/avatar/avatar.component';
import { ToastService } from '../../../shared/services/toast.service';

/** Error del backend → campo donde se muestra. */
const CAMPOS: Record<string, 'dpi' | 'nit'> = { DPI_EN_USO: 'dpi', NIT_EN_USO: 'nit' };

/**
 * Cuenta nueva creada con Google: antes de entrar al portal debe completar DPI, teléfono y dirección
 * (el NIT es opcional). Mientras no lo haga, perfilCompletoGuard la trae siempre aquí.
 */
@Component({
  selector: 'app-completar-perfil',
  standalone: true,
  imports: [ReactiveFormsModule, AvatarComponent],
  templateUrl: './completar-perfil.component.html',
  styleUrl: './completar-perfil.component.scss',
})
export class CompletarPerfilComponent {
  readonly auth = inject(AuthService);
  private readonly usuarios = inject(UsuariosService);
  private readonly router = inject(Router);
  private readonly avisos = inject(ToastService);

  readonly enviando = signal(false);

  readonly form = inject(FormBuilder).nonNullable.group({
    dpi: ['', [Validators.required, Validators.pattern(/^[0-9]{13}$/)]],
    nit: ['', [Validators.maxLength(20)]],
    telefono: ['', [Validators.required, Validators.pattern(/^[0-9]{8,20}$/)]],
    direccion: ['', [Validators.required, Validators.maxLength(255)]],
  });

  invalido(campo: keyof typeof this.form.controls): boolean {
    const c = this.form.controls[campo];
    return c.touched && c.invalid;
  }

  errorServidor(campo: keyof typeof this.form.controls): string | null {
    return (this.form.controls[campo].errors?.['servidor'] as string | undefined) ?? null;
  }

  guardar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const v = this.form.getRawValue();
    this.enviando.set(true);
    this.usuarios
      .completarPerfil({ dpi: v.dpi.trim(), nit: v.nit.trim().toUpperCase(), telefono: v.telefono.trim(), direccion: v.direccion.trim() })
      .subscribe({
        next: () => this.listo(),
        error: (e) => {
          this.enviando.set(false);
          // Ya estaba completo (p. ej. en otra pestaña): se deja pasar.
          if (errorApi(e)?.codigo === 'PERFIL_YA_COMPLETO') {
            this.listo();
            return;
          }
          marcarErroresServidor(this.form, e);
          const cuerpo = errorApi(e);
          const campo = cuerpo ? CAMPOS[cuerpo.codigo] : undefined;
          if (campo) {
            this.form.controls[campo].setErrors({ servidor: cuerpo!.mensaje });
            this.form.controls[campo].markAsTouched();
          }
          this.avisos.error(mensajeError(e, 'No se pudieron guardar tus datos.'));
        },
      });
  }

  salir(): void {
    this.auth.cerrarSesion().subscribe(() => this.router.navigateByUrl('/'));
  }

  private listo(): void {
    this.auth.actualizarUsuario({ perfilCompleto: true });
    this.avisos.exito('¡Listo! Tu cuenta quedó completa.');
    this.router.navigateByUrl('/panel', { replaceUrl: true });
  }
}
