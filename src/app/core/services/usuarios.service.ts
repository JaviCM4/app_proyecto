import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  ActualizarPerfil,
  CompletarPerfil,
  EstadoUsuario,
  FiltroUsuarios,
  NuevoAdministradorSistema,
  Perfil,
  UsuarioBusqueda,
  UsuarioDetalle,
  UsuarioResumen,
} from '../models/usuario.model';

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

  /** Cuenta creada con Google: guarda DPI, teléfono, dirección y NIT (opcional) para poder usar el portal. */
  completarPerfil(datos: CompletarPerfil): Observable<Perfil> {
    return this.http.put<Perfil>(`${this.api}/perfil/completar`, datos);
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

  /** Le da el rol de administrador del sistema a una cuenta que ya existe (le llega un correo de aviso). */
  hacerAdministradorSistema(id: string): Observable<UsuarioDetalle> {
    return this.http.post<UsuarioDetalle>(`${this.api}/usuarios/${id}/administrador-sistema`, null);
  }

  /**
   * Busca una cuenta por su correo exacto (administrador del sistema o de sucursal), para asignarle un
   * puesto sin crearle otra cuenta. 404 si no hay ninguna cuenta con ese correo.
   */
  buscarPorCorreo(correo: string): Observable<UsuarioBusqueda> {
    return this.http.get<UsuarioBusqueda>(`${this.api}/usuarios/por-correo`, {
      params: new HttpParams().set('correo', correo.trim()),
    });
  }

  cambiarEstado(id: string, estado: EstadoUsuario): Observable<UsuarioDetalle> {
    return this.http.patch<UsuarioDetalle>(`${this.api}/usuarios/${id}/estado`, { estado });
  }
}
