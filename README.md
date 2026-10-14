# Transporte Extraurbano — Frontend

Frontend en **Angular 19 standalone + Tailwind CSS 3** para el proyecto de transporte extraurbano.
El módulo **identity** está completo; el resto de módulos tiene su carpeta lista (ver "Estado por módulo").
Estructura inspirada en el frontend de referencia `Cinema-Frontend` (guards, interceptor JWT, servicios por dominio, vistas por rol).

## 1. Requisitos y cómo correrlo

- Node 22 + npm.
- Backend corriendo: API Gateway en `http://localhost:8080` (enruta cada prefijo a su microservicio).

```bash
npm install
npm start        # http://localhost:4200 (usa proxy.conf.json para /identity, /fleet, ...)
npm run build    # build de producción a dist/
```

- `src/environments/environment.ts` → `apiBaseUrl: 'http://localhost:8080'`. Si el gateway corre en otro host/puerto, cámbialo ahí.
- `proxy.conf.json` redirige al gateway en desarrollo. Si agregas un módulo nuevo, **agrega su prefijo al proxy** (ya vienen `/identity`, `/fleet`, `/trips`, `/sales`, `/maintenance`, `/reports`, `/notifications`).
- CORS: el gateway permite `http://localhost:4200` y `http://localhost:5173` (ver `GATEWAY_ALLOWED_ORIGINS` en el backend). Si corres el frontend en otro puerto, agrégalo allá.

## 2. Estado por módulo

| Módulo | Prefijo gateway → servicio | Estado |
|---|---|---|
| identity | `/identity/**` → `:8081` | ✅ Completo (auth, perfil, foto, cartera, usuarios, tarifas, internos) |
| fleet | `/fleet/**` → `:8082` | ⬜ Carpeta `features/fleet` lista |
| trips | `/trips/**` → `:8083` | ⬜ Carpeta `features/trips` lista |
| sales | `/sales/**` → `:8084` | ⬜ Carpeta `features/sales` lista |
| maintenance | `/maintenance/**` → `:8085` | ⬜ Carpeta `features/maintenance` lista |
| reports | `/reports/**` → `:8086` | ✅ Completo (pestañas por rol: RG1–RG6 ADMIN_SISTEMA, RS1–RS6 ADMIN_SUCURSAL con su sucursal; JSON en pantalla + PDF + mapa Leaflet en RG6) |
| notifications | `/notifications/**` → `:8087` | ⬜ Carpeta `features/notifications` lista |

Roles del sistema (los mismos del backend): `ADMIN_SISTEMA` · `ADMIN_SUCURSAL` · `CAJERO` · `CHOFER` · `CLIENTE` (+ `SERVICIO`, solo interno entre servicios).

## 3. Arquitectura (no cambiar sin acordarlo)

```
src/app/
  core/
    models/        # interfaces TS por módulo (identity.model.ts, fleet.model.ts, ...)
    services/      # un servicio por dominio, un método por endpoint (auth, usuarios, cartera, ...)
    guards/        # authGuard (sesión), guestGuard (solo invitados), roleGuard (por rol)
    interceptors/  # jwtInterceptor: adjunta Bearer y refresca el token una vez ante 401
  shared/          # navbar, toast (servicio + componente), mensaje-error.ts, estilos base
  features/
    public/        # home (pública)
    auth/          # login, registro, verificar-2fa, recuperar, restablecer
    dashboard/     # vistas con sesión del módulo identity
    fleet/ trips/ sales/ maintenance/ reports/ notifications/  # pendientes (cada una con su README)
```

Reglas:

- Componentes **standalone** con `loadComponent` (lazy) en `app.routes.ts`.
- Un servicio por dominio en `core/services`, con la URL base del gateway (`${environment.apiBaseUrl}/<prefijo>`).
- Formularios con `FormsModule` (template-driven), como los existentes.
- No agregar PrimeNG ni otras librerías UI: solo Tailwind + clases del §4.

## 4. Paleta y dónde aplicar cada color (`tailwind.config.js` + `src/styles.scss`)

| Color | Hex | Dónde se usa |
|---|---|---|
| `azul` / `azul-oscuro` | `#1B3A6B` / `#12294D` | Navbar, encabezados de tabla (`.table thead th`), títulos (`.page-title`), botones primarios, texto base |
| `cafe` | `#6B4A2F` | Subtítulos (`.page-subtitle`), hints (`.hint`, `.label` secundaria), botones secundarios, texto de detalle en toasts |
| `menta` / `menta-oscuro` | `#5ED3A7` / `#2FA67E` | Acentos y éxito: logo, badges activos (`.badge-activo`), foco de inputs (`.input:focus`), botón de acción principal alternativa |
| `crema` / `crema-oscuro` | `#FAF3E7` / `#EFE3CE` | Fondo de la app (body), filas pares de tabla, tarjetas de datos, hover suave |

Fondo global: crema con dos brillos radiales (menta arriba-izquierda, azul abajo-derecha). No poner fondos blancos planos a página completa: el contenido va en `.card`.

## 5. Botones (una sola forma en todo el proyecto)

Base `.btn` (misma en todos lados: `rounded-xl`, `px-5 py-2.5`, `text-sm font-semibold`, anillo de foco y `active:scale`). **Solo cambia el color**:

| Clase | Color | Uso |
|---|---|---|
| `.btn-primary` | azul | Acción principal del formulario (Entrar, Guardar, Filtrar) |
| `.btn-menta` | menta | Acción principal alternativa / crear (Registrarme, Crear tarifa, Recargar) |
| `.btn-cafe` | café | Acciones secundarias con peso (Enviar enlace, Cerrar sesión, Inactivar) |
| `.btn-crema` | blanco/borde azul | Acciones terciarias (Ver, Cerrar, Cambiar foto) |
| `.btn-ghost` | transparente | Enlaces-acción discretos |
| `.btn-danger` | rojo | Acciones destructivas/bloqueo (Bloquear) |
| `.btn-sm` | — | Modificador de tamaño para tablas y menús |

Un submit por formulario, siempre `w-full`. En tablas, botones `btn-sm`.

## 6. Formularios, tablas y demás piezas (`src/styles.scss`)

- Campo: `<div class="field"><label class="label">…</label><input class="input">…</div>`; ayuda con `.hint`, error de validación con `.error-text`.
- Contenedor: `.card`; título `.page-title` + descripción `.page-subtitle` (aquí se documenta el endpoint que usa la vista, p. ej. `POST /identity/auth/login`).
- Listados: `.table-wrap > table.table` (encabezado azul, filas pares crema). Filtros encima, en `.card` con grid.
- Estados de usuario: `.badge-activo` / `.badge-inactivo` / `.badge-bloqueado`.
- Modal (ver `usuarios.component.ts`): overlay `fixed inset-0 z-50 … bg-azul-oscuro/60`, tarjeta `.card max-w-lg`, cierra con ✕, botón Cerrar o clic en el fondo (`(click)="$event.stopPropagation()"` en la tarjeta).
- No creen CSS por componente salvo casos puntuales: todo va en `styles.scss` con `@layer components`.

## 7. Toasts (avisos emergentes)

Equivalente al `p-toast` + `MessageService` del proyecto de referencia, implementado con Tailwind (sin PrimeNG).
Render global: `<app-toast></app-toast>` ya está en `app.component.ts` (arriba a la derecha, `z-[100]`, auto-cierre, botón ×).

```ts
import { ToastService } from '../../shared/toast.service';

private readonly avisos = inject(ToastService);

this.avisos.success('Perfil actualizado.');            // borde menta, 4 s
this.avisos.error(mensajeError(e, 'No se pudo guardar.')); // borde rojo, 5 s
this.avisos.info('Te enviamos un código al correo.');  // borde azul, 3.5 s
// Firmas: success(detail, summary='Éxito', life=4000) · error(detail, summary='Error', life=5000) · info(...)
```

Reglas:

- Todo resultado de una acción (crear, guardar, cambiar estado, recargar, login, etc.) avisa con toast.
- Los errores HTTP se traducen con `mensajeError(e, 'texto por defecto')` de `shared/mensaje-error.ts` (usa el `mensaje` del backend si viene; si no, texto según status).
- No dupliquen el aviso inline + toast: usen toast y quiten el `<p class="error-text">` / éxito inline del formulario.
- Los errores de carga inicial de página (listas, perfil) pueden quedarse inline en su `.card` si la vista queda vacía sin ellos.

## 8. Agregar un módulo nuevo (paso a paso, ejemplo fleet)

1. **Modelo** `src/app/core/models/fleet.model.ts`: interfaces a partir de los records/DTOs del backend (`fleet-service/.../dtos`) y lo que devuelven sus `@RestController` (fíjense en `@RequestMapping` + método para la URL y verbo exactos).
2. **Servicio** `src/app/core/services/fleet.service.ts` (`providedIn: 'root'`), un método por endpoint:
   ```ts
   private readonly http = inject(HttpClient);
   private readonly base = `${environment.apiBaseUrl}/fleet`;
   listar(): Observable<Sucursal[]> {
     return this.http.get<Sucursal[]>(`${this.base}/sucursales`);
   }
   ```
   Query params con `HttpParams`; subida de archivos con `FormData`; descargas (PDF/Excel) con `{ responseType: 'blob' }` y descarga vía `objectURL` (ver nota de reports en su README).
3. **Vistas** en `src/app/features/fleet/` (p. ej. `sucursales.component.ts`): standalone, `imports: [FormsModule]`, plantilla con `.card`, `.table`, `.btn-*` y toasts. Borren el `README.md` de la carpeta cuando haya vistas reales.
4. **Rutas** en `src/app/app.routes.ts` con lazy load:
   ```ts
   { path: 'dashboard/fleet/sucursales', canActivate: [authGuard, roleGuard],
     data: { roles: ['ADMIN_SISTEMA'] },
     loadComponent: () => import('./features/fleet/sucursales.component').then((m) => m.SucursalesComponent) },
   ```
   Los roles salen del `@RequiereRol` del controlador backend. Las rutas públicas van con `guestGuard` o sin guard según el caso.
5. **Navbar** (`shared/navbar.component.ts`): agreguen el enlace dentro del `@if` del rol correspondiente. No agreguen enlaces de un módulo a roles que no lo usan.
6. **Proxy**: si el prefijo no está en `proxy.conf.json`, agréguenlo (`"/fleet": { "target": "http://localhost:8080", ... }`).
7. Verifiquen con `npm run build` antes de entregar.

## 9. Endpoints de identity ya implementados (referencia)

| Vista / servicio | Endpoints |
|---|---|
| Registro | `POST /identity/auth/registro` |
| Login | `POST /identity/auth/login` (200 sesión / 202 reto 2FA) |
| Verificar 2FA | `POST /identity/auth/login/verificar` |
| Recuperar / Restablecer | `POST /identity/auth/recuperar`, `POST /identity/auth/restablecer` |
| Seguridad | `PUT /identity/auth/contrasena`, `PUT /identity/auth/doble-factor`, `POST /identity/auth/cerrar-sesion`, `POST /identity/auth/refrescar` (auto en interceptor) |
| Mi perfil + foto | `GET/PUT /identity/perfil`, `POST /identity/archivos/fotos` (multipart `archivo`) |
| Mi cartera (CLIENTE) | `GET /identity/cartera`, `POST /identity/cartera/recargas`, `GET /identity/cartera/movimientos?desde&hasta` |
| Usuarios (ADMIN_SISTEMA) | `GET /identity/usuarios?rol&estado&q`, `POST /identity/usuarios/administradores-sistema`, `GET /identity/usuarios/:id`, `PATCH /identity/usuarios/:id/estado` |
| Tarifas (ADMIN_SISTEMA / ADMIN_SUCURSAL) | `GET /identity/tarifas-depreciacion`, `GET ?vigenteEn=YYYY-MM-DD`, `POST` crear |
| Internos (rol SERVICIO) | `InternoService`: `POST /identity/interno/cuentas-personal`, `GET /identity/interno/sucursales/:id/administradores`, `GET /identity/interno/usuarios/:id/contacto` |

Rutas UI: `/`, `/login`, `/registro`, `/verificar-2fa`, `/recuperar`, `/restablecer`, `/dashboard`, `/dashboard/perfil`, `/dashboard/seguridad`, `/dashboard/cartera` (CLIENTE), `/dashboard/usuarios` (ADMIN_SISTEMA), `/dashboard/tarifas` (ADMIN_SISTEMA, ADMIN_SUCURSAL), `/dashboard/reportes` (pestañas: RG1–RG6 solo ADMIN_SISTEMA, RS1–RS6 con sucursal de la sesión para ADMIN_SUCURSAL).
