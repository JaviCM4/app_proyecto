import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Perfil } from '../../../core/models/usuario.model';
import { AuthService } from '../../../core/services/auth.service';
import { UsuariosService } from '../../../core/services/usuarios.service';
import { marcarErroresServidor, mensajeError } from '../../../core/utils/errores-http';
import { AvatarComponent } from '../../../shared/components/avatar/avatar.component';
import { RolTextoPipe } from '../../../shared/pipes/rol-texto.pipe';
import { ToastService } from '../../../shared/services/toast.service';

/** Mis datos: foto, datos de solo lectura (correo y DPI) y los que sí se pueden editar. */
@Component({
  selector: 'app-perfil',
  standalone: true,
  imports: [ReactiveFormsModule, AvatarComponent, RolTextoPipe],
  templateUrl: './perfil.component.html',
  styleUrl: './perfil.component.scss',
})
export class PerfilComponent implements OnInit {
  private readonly usuarios = inject(UsuariosService);
  private readonly auth = inject(AuthService);
  private readonly avisos = inject(ToastService);

  readonly perfil = signal<Perfil | null>(null);
  readonly cargando = signal(true);
  readonly guardando = signal(false);
  readonly subiendoFoto = signal(false);

  /** Cuentas creadas con Google: llegan sin NIT, teléfono ni dirección (los pide la compra de boletos). */
  readonly incompleto = computed(() => {
    const p = this.perfil();
    return !!p && (!p.nit || !p.telefono || !p.direccion);
  });

  readonly form = inject(FormBuilder).nonNullable.group({
    nombres: ['', [Validators.required, Validators.maxLength(100)]],
    apellidos: ['', [Validators.required, Validators.maxLength(100)]],
    nit: ['', [Validators.required, Validators.maxLength(20)]],
    telefono: ['', [Validators.required, Validators.pattern(/^[0-9]{8,20}$/)]],
    direccion: ['', [Validators.required, Validators.maxLength(255)]],
  });

  ngOnInit(): void {
    this.usuarios.perfil().subscribe({
      next: (p) => this.mostrar(p),
      error: (e) => {
        this.cargando.set(false);
        this.avisos.error(mensajeError(e, 'No se pudo cargar tu perfil.'));
      },
    });
  }

  invalido(campo: keyof typeof this.form.controls): boolean {
    const c = this.form.controls[campo];
    return c.touched && c.invalid;
  }

  /** La foto viene de Google mientras la persona no suba una propia al sistema. */
  esFotoGoogle(p: Perfil): boolean {
    return !!p.fotoUrl && p.fotoUrl.includes('googleusercontent.com');
  }

  guardar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.guardando.set(true);
    const v = this.form.getRawValue();
    this.usuarios.actualizarPerfil({ ...v, nit: v.nit.trim().toUpperCase() }).subscribe({
      next: (p) => {
        this.guardando.set(false);
        this.mostrar(p);
        this.auth.actualizarUsuario({ nombre: `${p.nombres} ${p.apellidos}`.trim() });
        this.avisos.exito('Tus datos se guardaron.');
      },
      error: (e) => {
        this.guardando.set(false);
        marcarErroresServidor(this.form, e);
        this.avisos.error(mensajeError(e, 'No se pudieron guardar tus datos.'));
      },
    });
  }

  descartar(): void {
    const p = this.perfil();
    if (p) this.mostrar(p);
  }

  cambiarFoto(evento: Event): void {
    const entrada = evento.target as HTMLInputElement;
    const archivo = entrada.files?.[0];
    entrada.value = '';
    if (!archivo) return;
    if (archivo.size > 2 * 1024 * 1024) {
      this.avisos.error('La foto debe pesar máximo 2 MB.');
      return;
    }
    this.subiendoFoto.set(true);
    this.usuarios.subirFoto(archivo).subscribe({
      next: ({ fotoUrl }) =>
        this.usuarios.actualizarPerfil({ fotoUrl }).subscribe({
          next: (p) => {
            this.subiendoFoto.set(false);
            this.mostrar(p);
            this.auth.actualizarUsuario({ fotoUrl: p.fotoUrl });
            this.avisos.exito('Foto actualizada.');
          },
          error: (e) => {
            this.subiendoFoto.set(false);
            this.avisos.error(mensajeError(e, 'No se pudo guardar la foto.'));
          },
        }),
      error: (e) => {
        this.subiendoFoto.set(false);
        this.avisos.error(mensajeError(e, 'No se pudo subir la foto.'));
      },
    });
  }

  private mostrar(p: Perfil): void {
    this.perfil.set(p);
    this.form.reset({
      nombres: p.nombres,
      apellidos: p.apellidos,
      nit: p.nit ?? '',
      telefono: p.telefono ?? '',
      direccion: p.direccion ?? '',
    });
    // Si faltan datos, se marcan de una vez para que se vea qué completar.
    if (this.incompleto()) this.form.markAllAsTouched();
    this.cargando.set(false);
  }
}
