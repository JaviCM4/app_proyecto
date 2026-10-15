import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ActualizarPerfil, EstadoUsuario, FiltroUsuarios, NuevoAdministradorSistema, Perfil, UsuarioDetalle, UsuarioResumen } from '../models/usuario.model';

/** Perfil propio y administración de usuarios (Identity). */
@Injectable({ providedIn: 'root' })
export class UsuariosService {
  private readonly http = inject(HttpClient);
  private readonly api = `${environment.apiUrl}/identity`;

  // ---------- Perfil propio (cualquier usuario con sesión) ----------

  perfil(): Observable<Perfil> {
    return this.http.get<Perfil>(`${this.api}/perfil`);
  }

  actualizarPerfil(datos: ActualizarPerfil): Observable<Perfil> {
    return this.http.put<Perfil>(`${this.api}/perfil`, datos);
  }

  /** Sube la foto (JPG, PNG o WEBP, máx. 2 MB) y devuelve su URL para guardarla en el perfil. */
  subirFoto(archivo: File): Observable<{ fotoUrl: string }> {
    const form = new FormData();
    form.append('archivo', archivo);
    return this.http.post<{ fotoUrl: string }>(`${this.api}/archivos/fotos`, form);
  }

  // ---------- Administración (administrador del sistema) ----------

  /** El servidor pagina por su cuenta; aquí se pide una página grande y se pagina en pantalla. */
  listar(filtro: FiltroUsuarios = {}): Observable<UsuarioResumen[]> {
    let params = new HttpParams().set('size', 2000).set('sort', 'correo,asc');
    for (const [clave, valor] of Object.entries(filtro)) {
      if (valor) params = params.set(clave, valor);
    }
    return this.http.get<UsuarioResumen[]>(`${this.api}/usuarios`, { params });
  }

  detalle(id: string): Observable<UsuarioDetalle> {
    return this.http.get<UsuarioDetalle>(`${this.api}/usuarios/${id}`);
  }

  /** Crea otro administrador del sistema; le llega un correo para activar su cuenta. */
  crearAdministrador(datos: NuevoAdministradorSistema): Observable<UsuarioDetalle> {
    return this.http.post<UsuarioDetalle>(`${this.api}/usuarios/administradores-sistema`, datos);
  }

  cambiarEstado(id: string, estado: EstadoUsuario): Observable<UsuarioDetalle> {
    return this.http.patch<UsuarioDetalle>(`${this.api}/usuarios/${id}/estado`, { estado });
  }
}
