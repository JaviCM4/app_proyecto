import { Component, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { UsuariosService } from '../../core/services/usuarios.service';
import { ToastService } from '../../shared/toast.service';
import { UsuarioDetalleResponse, UsuarioListaResponse } from '../../core/models/identity.model';
import { mensajeError } from '../../shared/mensaje-error';

@Component({
  selector: 'app-usuarios',
  standalone: true,
  imports: [FormsModule],
  template: `
    <section class="mx-auto max-w-6xl px-4 py-8">
      <h1 class="page-title">Usuarios</h1>
      <p class="page-subtitle">GET /identity/usuarios?rol&amp;estado&amp;q · POST administradores-sistema · GET/PATCH /identity/usuarios/:id.</p>

      <div class="card mt-4">
        <div class="grid gap-3 md:grid-cols-4">
          <div class="field !mb-0">
            <label class="label" for="fRol">Rol</label>
            <select class="input" id="fRol" [(ngModel)]="filtros.rol" (change)="cargar()">
              <option value="">Todos</option>
              <option>ADMIN_SISTEMA</option>
              <option>ADMIN_SUCURSAL</option>
              <option>CAJERO</option>
              <option>CHOFER</option>
              <option>CLIENTE</option>
            </select>
          </div>
          <div class="field !mb-0">
            <label class="label" for="fEstado">Estado</label>
            <select class="input" id="fEstado" [(ngModel)]="filtros.estado" (change)="cargar()">
              <option value="">Todos</option>
              <option>ACTIVO</option>
              <option>INACTIVO</option>
              <option>BLOQUEADO</option>
            </select>
          </div>
          <div class="field !mb-0 md:col-span-2">
            <label class="label" for="fQ">Buscar</label>
            <div class="flex gap-2">
              <input class="input" id="fQ" [(ngModel)]="filtros.q" placeholder="Correo, nombre o NIT" (keyup.enter)="cargar()" />
              <button type="button" class="btn-primary" (click)="cargar()">Filtrar</button>
            </div>
          </div>
        </div>
      </div>

      @if (error) { <div class="card mt-4"><p class="error-text">{{ error }}</p></div> }

      <div class="table-wrap mt-4">
        <table class="table">
          <thead><tr><th>Nombre</th><th>Correo</th><th>Roles</th><th>Estado</th><th></th></tr></thead>
          <tbody>
            @for (u of lista; track u.usuarioId) {
              <tr>
                <td>{{ u.nombre }}</td>
                <td>{{ u.correo }}</td>
                <td>{{ rolesTexto(u) }}</td>
                <td>
                  <span [class]="u.estado === 'ACTIVO' ? 'badge-activo' : u.estado === 'BLOQUEADO' ? 'badge-bloqueado' : 'badge-inactivo'">
                    {{ u.estado }}
                  </span>
                </td>
                <td><button type="button" class="btn-crema btn-sm" (click)="ver(u.usuarioId)">Ver</button></td>
              </tr>
            } @empty {
              <tr><td colspan="5" class="!text-center text-cafe">Sin resultados.</td></tr>
            }
          </tbody>
        </table>
      </div>

      @if (detalle) {
        <div class="fixed inset-0 z-50 flex items-center justify-center bg-azul-oscuro/60 p-4" (click)="cerrarDetalle()">
          <div class="card w-full max-w-lg" (click)="$event.stopPropagation()" role="dialog" aria-modal="true" aria-label="Detalle de usuario">
            <div class="flex items-start justify-between gap-3">
              <div>
                <p class="text-sm font-bold uppercase tracking-widest text-menta-oscuro">Detalle</p>
                <h2 class="text-xl font-bold text-azul">{{ detalle.nombres }} {{ detalle.apellidos }}</h2>
                <p class="text-sm text-cafe">{{ detalle.correo }}</p>
              </div>
              <button type="button" (click)="cerrarDetalle()" class="btn-crema btn-sm" aria-label="Cerrar detalle">✕</button>
            </div>
            <dl class="mt-4 grid grid-cols-2 gap-3 text-sm">
              <div class="rounded-xl bg-crema p-3"><dt class="font-semibold text-azul">NIT</dt><dd class="text-cafe">{{ detalle.nit }}</dd></div>
              <div class="rounded-xl bg-crema p-3"><dt class="font-semibold text-azul">DPI</dt><dd class="text-cafe">{{ detalle.dpi }}</dd></div>
              <div class="rounded-xl bg-crema p-3"><dt class="font-semibold text-azul">Teléfono</dt><dd class="text-cafe">{{ detalle.telefono }}</dd></div>
              <div class="rounded-xl bg-crema p-3"><dt class="font-semibold text-azul">Dirección</dt><dd class="text-cafe">{{ detalle.direccion }}</dd></div>
            </dl>
            <p class="mt-4 text-sm">Estado actual:
              <span [class]="detalle.estado === 'ACTIVO' ? 'badge-activo' : detalle.estado === 'BLOQUEADO' ? 'badge-bloqueado' : 'badge-inactivo'">{{ detalle.estado }}</span>
            </p>
            <div class="mt-4 flex flex-wrap gap-2">
              <button type="button" class="btn-menta btn-sm" (click)="cambiarEstado('ACTIVO')">Activar</button>
              <button type="button" class="btn-cafe btn-sm" (click)="cambiarEstado('INACTIVO')">Inactivar</button>
              <button type="button" class="btn-danger btn-sm" (click)="cambiarEstado('BLOQUEADO')">Bloquear</button>
              <button type="button" class="btn-crema btn-sm ml-auto" (click)="cerrarDetalle()">Cerrar</button>
            </div>
          </div>
        </div>
      }

      <div class="card mt-4">
        <h2 class="font-bold text-azul">Crear administrador del sistema</h2>
        <p class="page-subtitle">POST /identity/usuarios/administradores-sistema.</p>
        <form class="mt-4 grid gap-x-4 md:grid-cols-2" (ngSubmit)="crearAdmin()" #f="ngForm">
          <div class="field"><label class="label" for="aNombres">Nombres</label><input class="input" id="aNombres" name="aNombres" required maxlength="100" [(ngModel)]="admin.nombres" /></div>
          <div class="field"><label class="label" for="aApellidos">Apellidos</label><input class="input" id="aApellidos" name="aApellidos" required maxlength="100" [(ngModel)]="admin.apellidos" /></div>
          <div class="field"><label class="label" for="aCorreo">Correo</label><input class="input" id="aCorreo" name="aCorreo" type="email" required [(ngModel)]="admin.correo" /></div>
          <div class="field"><label class="label" for="aNit">NIT</label><input class="input" id="aNit" name="aNit" required maxlength="20" [(ngModel)]="admin.nit" /></div>
          <div class="field"><label class="label" for="aDpi">DPI (13 dígitos)</label><input class="input" id="aDpi" name="aDpi" required pattern="^[0-9]{13}$" [(ngModel)]="admin.dpi" /></div>
          <div class="field"><label class="label" for="aTel">Teléfono</label><input class="input" id="aTel" name="aTel" required maxlength="20" [(ngModel)]="admin.telefono" /></div>
          <div class="field md:col-span-2"><label class="label" for="aDir">Dirección</label><input class="input" id="aDir" name="aDir" required maxlength="255" [(ngModel)]="admin.direccion" /></div>
          <div class="md:col-span-2">
            <button type="submit" class="btn-primary w-full" [disabled]="creando || f.invalid">{{ creando ? 'Creando…' : 'Crear administrador' }}</button>
          </div>
        </form>
      </div>
    </section>
  `,
})
export class UsuariosComponent implements OnInit {
  private readonly usuarios = inject(UsuariosService);
  private readonly avisos = inject(ToastService);

  lista: UsuarioListaResponse[] = [];
  detalle: UsuarioDetalleResponse | null = null;
  filtros = { rol: '', estado: '', q: '' };
  error = '';

  admin = { correo: '', nombres: '', apellidos: '', nit: '', dpi: '', telefono: '', direccion: '' };
  creando = false;

  ngOnInit(): void {
    this.cargar();
  }

  rolesTexto(u: UsuarioListaResponse): string {
    return u.roles.join(', ');
  }

  cargar(): void {
    this.error = '';
    this.usuarios.listar(this.filtros.rol || undefined, this.filtros.estado || undefined, this.filtros.q || undefined).subscribe({
      next: (res) => (this.lista = res),
      error: (e) => (this.error = mensajeError(e, 'No se pudo listar usuarios.')),
    });
  }

  ver(id: string): void {
    this.usuarios.detalle(id).subscribe({
      next: (res) => (this.detalle = res),
      error: (e) => this.avisos.error(mensajeError(e, 'No se pudo cargar el detalle.')),
    });
  }

  cerrarDetalle(): void {
    this.detalle = null;
  }

  cambiarEstado(estado: 'ACTIVO' | 'INACTIVO' | 'BLOQUEADO'): void {
    if (!this.detalle) return;
    this.usuarios.cambiarEstado(this.detalle.usuarioId, estado).subscribe({
      next: (res) => {
        this.detalle = res;
        this.avisos.success(`Usuario ${estado.toLowerCase()}.`);
        this.cargar();
      },
      error: (e) => this.avisos.error(mensajeError(e, 'No se pudo cambiar el estado.')),
    });
  }

  crearAdmin(): void {
    this.creando = true;
    this.usuarios.crearAdministrador({ ...this.admin, correo: this.admin.correo.trim() }).subscribe({
      next: () => {
        this.creando = false;
        this.avisos.success('Administrador creado.');
        this.admin = { correo: '', nombres: '', apellidos: '', nit: '', dpi: '', telefono: '', direccion: '' };
        this.cargar();
      },
      error: (e) => {
        this.creando = false;
        this.avisos.error(mensajeError(e, 'No se pudo crear el administrador.'));
      },
    });
  }
}
