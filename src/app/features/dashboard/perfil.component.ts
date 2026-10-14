import { Component, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ArchivosService } from '../../core/services/archivos.service';
import { UsuariosService } from '../../core/services/usuarios.service';
import { ToastService } from '../../shared/toast.service';
import { PerfilResponse } from '../../core/models/identity.model';
import { mensajeError } from '../../shared/mensaje-error';

@Component({
  selector: 'app-perfil',
  standalone: true,
  imports: [FormsModule],
  template: `
    <section class="mx-auto max-w-2xl px-4 py-8">
      <h1 class="page-title">Mi perfil</h1>
      <p class="page-subtitle">GET /identity/perfil · PUT /identity/perfil · foto vía POST /identity/archivos/fotos.</p>
      @if (cargandoPerfil) {
        <div class="card mt-4"><p class="text-sm text-cafe">Cargando perfil…</p></div>
      } @else if (perfil) {
        <div class="card mt-4">
          <div class="flex items-center gap-4">
            @if (perfil.fotoUrl) {
              <img [src]="perfil.fotoUrl" alt="Foto de perfil" class="h-20 w-20 rounded-2xl border border-azul/20 object-cover" />
            } @else {
              <div class="flex h-20 w-20 items-center justify-center rounded-2xl bg-menta-claro text-2xl font-black text-azul">
                {{ perfil.nombres[0] + perfil.apellidos[0] }}
              </div>
            }
            <div>
              <p class="font-bold text-azul">{{ perfil.nombres }} {{ perfil.apellidos }}</p>
              <p class="text-sm text-cafe">{{ perfil.correo }} · DPI {{ perfil.dpi }}</p>
              <label class="btn-crema btn-sm mt-2 cursor-pointer">
                {{ subiendoFoto ? 'Subiendo…' : 'Cambiar foto' }}
                <input type="file" accept="image/*" class="hidden" (change)="subirFoto($event)" [disabled]="subiendoFoto" />
              </label>
            </div>
          </div>
          <form class="mt-6 grid gap-x-4 md:grid-cols-2" (ngSubmit)="guardar()" #f="ngForm">
            <div class="field">
              <label class="label" for="nombres">Nombres</label>
              <input class="input" id="nombres" name="nombres" maxlength="100" [(ngModel)]="edicion.nombres" />
            </div>
            <div class="field">
              <label class="label" for="apellidos">Apellidos</label>
              <input class="input" id="apellidos" name="apellidos" maxlength="100" [(ngModel)]="edicion.apellidos" />
            </div>
            <div class="field">
              <label class="label" for="nit">NIT</label>
              <input class="input" id="nit" name="nit" maxlength="20" [(ngModel)]="edicion.nit" />
            </div>
            <div class="field">
              <label class="label" for="telefono">Teléfono</label>
              <input class="input" id="telefono" name="telefono" maxlength="20" [(ngModel)]="edicion.telefono" />
            </div>
            <div class="field md:col-span-2">
              <label class="label" for="direccion">Dirección</label>
              <input class="input" id="direccion" name="direccion" maxlength="255" [(ngModel)]="edicion.direccion" />
            </div>
            <div class="md:col-span-2">
              <button type="submit" class="btn-primary w-full" [disabled]="guardando || f.invalid">
                {{ guardando ? 'Guardando…' : 'Guardar cambios' }}
              </button>
            </div>
          </form>
        </div>
      } @else if (error) {
        <div class="card mt-4"><p class="error-text">{{ error }}</p></div>
      }
    </section>
  `,
})
export class PerfilComponent implements OnInit {
  private readonly usuarios = inject(UsuariosService);
  private readonly archivos = inject(ArchivosService);
  private readonly avisos = inject(ToastService);

  perfil: PerfilResponse | null = null;
  edicion = { nombres: '', apellidos: '', nit: '', telefono: '', direccion: '' };
  cargandoPerfil = true;
  guardando = false;
  subiendoFoto = false;
  error = '';

  ngOnInit(): void {
    this.usuarios.verPerfil().subscribe({
      next: (p) => {
        this.perfil = p;
        this.edicion = { nombres: p.nombres ?? '', apellidos: p.apellidos ?? '', nit: p.nit ?? '', telefono: p.telefono ?? '', direccion: p.direccion ?? '' };
        this.cargandoPerfil = false;
      },
      error: (e) => {
        this.error = mensajeError(e, 'No se pudo cargar el perfil.');
        this.cargandoPerfil = false;
      },
    });
  }

  guardar(): void {
    this.guardando = true;
    this.usuarios.actualizarPerfil(this.edicion).subscribe({
      next: (p) => {
        this.guardando = false;
        this.perfil = p;
        this.avisos.success('Perfil actualizado.');
      },
      error: (e) => {
        this.guardando = false;
        this.avisos.error(mensajeError(e, 'No se pudo actualizar el perfil.'));
      },
    });
  }

  subirFoto(evento: Event): void {
    const archivo = (evento.target as HTMLInputElement).files?.[0];
    if (!archivo || !this.perfil) return;
    this.subiendoFoto = true;
    this.archivos.subirFoto(archivo).subscribe({
      next: (res) => {
        this.usuarios.actualizarPerfil({ fotoUrl: res.fotoUrl }).subscribe({
          next: (p) => {
            this.subiendoFoto = false;
            this.perfil = p;
            this.avisos.success('Foto actualizada.');
          },
          error: (e) => {
            this.subiendoFoto = false;
            this.avisos.error(mensajeError(e, 'Foto subida pero no se pudo guardar en el perfil.'));
          },
        });
      },
      error: (e) => {
        this.subiendoFoto = false;
        this.avisos.error(mensajeError(e, 'No se pudo subir la foto (máx. 2MB).'));
      },
    });
  }
}
