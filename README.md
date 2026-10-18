# Frontend · Transporte Extraurbano

Angular 19 (componentes standalone). Todas las llamadas van al **API Gateway**, cuya URL sale del archivo `.env`.

## Arrancar

```bash
npm install
cp .env.example .env          # y ajusta API_GATEWAY_URL si hace falta
npm start                     # http://localhost:4200
```

- `npm start` y `npm run build` generan primero `src/environments/environment.ts` a partir del `.env`
  (script `scripts/generar-env.mjs`). Ese archivo es generado: no se edita a mano ni se sube a Git.
- Usa siempre `npm start` / `npm run build` (no `ng serve` directo) para que se genere el entorno.
- El puerto es **4200**. En el `.env` del backend debe estar `FRONTEND_URL=http://localhost:4200`: el gateway
  solo acepta CORS desde esa dirección y los correos de activación traen enlaces a
  `http://localhost:4200/restablecer?token=...`.

| Variable (`.env`) | Para qué |
|---|---|
| `API_GATEWAY_URL` | URL del gateway (local `http://localhost:8080`). |
| `APP_NOMBRE` | Nombre que se muestra en el encabezado y el menú. |

En Docker o en el pipeline se puede pasar como variable de entorno (`API_GATEWAY_URL=https://... npm run build`):
tiene prioridad sobre el `.env`.

## Estructura (MVC)

```
src/
├── styles.scss                 # solo importa las piezas de styles/
├── styles/                     # variables (paleta), base, botones, formularios, tablas, utilidades
├── environments/environment.ts # GENERADO desde .env
└── app/
    ├── app.routes.ts           # todas las rutas (público y panel)
    ├── core/                   # MODELO: datos y acceso al backend
    │   ├── models/             #   interfaces (Sucursal, Viaje, Sesion...)
    │   ├── services/           #   llamadas HTTP al gateway (un servicio por recurso)
    │   ├── guards/             #   auth (con sesión), invitado (sin sesión), rol
    │   ├── interceptors/       #   agrega el token y lo renueva si venció
    │   └── utils/              #   mensajes de error, fechas de Guatemala
    ├── shared/                 # piezas reutilizables
    │   ├── components/         #   modal, paginador, confirmación, avisos (toast), ícono, avatar, botón de Google
    │   ├── pipes/              #   rolTexto: ADMIN_SUCURSAL → "Administrador de sucursal"
    │   ├── constants/          #   nombres de roles, departamentos de Guatemala
    │   ├── services/           #   ToastService
    │   └── utils/              #   paginar() y normalizar() para buscar sin tildes
    ├── layout/                 # estructura de pantalla
    │   ├── publico/            #   encabezado con Entrar / Crear cuenta
    │   ├── privado/            #   panel: menú lateral + barra superior + contenido
    │   ├── menu-lateral/       #   menú plegable; opciones en menu.config.ts
    │   └── barra-superior/     #   botón de menú, usuario y cerrar sesión
    └── paginas/                # VISTA (.html/.scss) + CONTROLADOR (.ts)
        ├── publico/            #   inicio con viajes y mapa de asientos
        ├── auth/               #   login, registro, verificar código, recuperar, restablecer, regreso de Google
        ├── panel/              #   inicio del panel
        ├── cuenta/             #   perfil, seguridad, cartera y recarga (modal)
        ├── personal/           #   datos de cuenta, agregar personal, retirar / trasladar (modales)
        ├── sucursales/         #   lista, detalle (modal) y asistente por pasos con mapa
        ├── usuarios/           #   lista, detalle (modal) y nuevo administrador (modal)
        ├── tarifas/            #   tarifas de depreciación
        └── reportes/           #   reportes en pestañas (reportes.config.ts) y mapa de rutas
```

- **Modelo:** `core/models` (forma de los datos) y `core/services` (de dónde vienen).
- **Vista:** el `.html` y el `.scss` de cada componente. Nunca muestran rutas, métodos ni códigos técnicos.
- **Controlador:** el `.component.ts`: estado de la pantalla, validaciones y llamadas a los servicios.

Cada componente tiene sus 3 archivos (`.ts`, `.html`, `.scss`).

## Convenciones de pantalla

- **Listas:** filtros arriba, tabla, y `<app-paginador>` abajo. Los servicios devuelven la lista completa y se
  pagina en el navegador con `paginar(lista, pagina, tamano)`.
- **Crear / editar:** botón “+ Nuevo…” que abre un modal (`<app-modal>`) con el formulario.
- **Acciones peligrosas** (desactivar, eliminar, cancelar): `<app-confirmacion>` antes de hacerlas.
- **Errores:** `mensajeError(e)` muestra el mensaje del backend (ya viene en español) y
  `marcarErroresServidor(form, e)` marca en rojo los campos que el backend rechazó.
- **Roles:** siempre con el pipe `rolTexto`, nunca el código.
- **Fechas:** se muestran en hora de Guatemala (`date: '...' : zona`, con `zona = ZONA_GT`).
- **Colores:** solo los de `styles/_variables.scss` (grises y un acento). Clases globales: `btn`, `btn primario`,
  `btn peligro`, `control`, `campo`, `tabla`, `tarjeta`, `insignia`.

## Agregar una pantalla nueva (ejemplo: Buses)

1. Modelo: `core/models/bus.model.ts` y servicio `core/services/buses.service.ts`.
2. Página: `paginas/buses/lista/` (`.ts`, `.html`, `.scss`) y `paginas/buses/formulario/` (modal), copiando el
   patrón de `paginas/sucursales`.
3. Ruta en `app.routes.ts` dentro de `panel`, con `canActivate: [rolGuard]` y `data: { roles: [...] }`.
4. Opción en `layout/menu-lateral/menu.config.ts` con los mismos roles.

## Pantallas y roles

El menú (`layout/menu-lateral/menu.config.ts`) y las rutas (`app.routes.ts`, `data.roles`) usan los mismos roles.
Las vistas dependen de los roles de la cuenta, y **todas las cuentas tienen también el rol Cliente**: cualquiera
puede comprar boletos, usar su billetera y ver sus compras y alquileres.

| Rol | Ve en el menú |
|---|---|
| Administrador del sistema | Administración (Sucursales, Usuarios, Billetera del sistema, Tarifas, Precio de alquiler, Categorías de gasto), Reportes |
| Administrador de sucursal | Mi sucursal, Operación (Buses, Choferes, Personal, Rutas, Viajes, Alquileres), Taller, Reportes, Ventanilla |
| Cajero | Ventanilla (Vender boletos, Solicitar alquiler en mostrador, Ventas, Órdenes de alquiler) |
| Piloto | Mis viajes (registrar salida y llegada) |
| Todos (rol Cliente) | Mis compras (Billetera digital, Comprar boletos, Mis compras, Solicitar alquiler, Mis alquileres), Mi perfil, Seguridad |

- El cajero no ve "Solicitar alquiler" como cliente (`excepto: ['CAJERO']`): en el backend, un alquiler que pide un
  cajero siempre es de mostrador.
- Al asignar personal (nueva sucursal, agregar personal) se puede crear una **cuenta nueva** o elegir a alguien que
  **ya tiene cuenta** (búsqueda por correo exacto, `GET /identity/usuarios/por-correo`). Lo mismo al agregar un
  administrador del sistema, y en el detalle de un usuario está "Hacer administrador del sistema".
- Quien recibe un rol nuevo debe cerrar sesión y volver a entrar (le llega un correo): el token vigente no lo tiene.
- **Billetera del sistema** (`/panel/billetera-sistema`, API `/wallet/sistema`): solo consulta. El botón "Retirar
  fondos" explica dónde se integraría la transferencia bancaria; no llama al backend.

Perfil, Seguridad y Billetera digital también están en el menú que se abre al hacer clic en el usuario (arriba a la derecha).

## Entrar con Google

Los clientes pueden crear su cuenta o entrar con Google (botón en **Entrar** y en **Crear cuenta**). Todo el
intercambio con Google lo hace Identity; el front nunca ve el código ni las credenciales de Google:

1. `app-boton-google` pide `GET /identity/auth/oauth2/google/url` y manda el navegador a esa URL de Google.
2. Google regresa al backend (`/identity/auth/oauth2/google/callback`) y el backend redirige al front:
   `OAUTH_FRONTEND_URL/oauth/google/callback?ticket=...` (o `?error=CODIGO`).
3. `paginas/auth/google-callback` cambia el ticket (`POST /identity/auth/oauth2/canjear`) por la sesión. Si la
   cuenta tiene verificación en dos pasos, sigue a `/verificar` igual que el login normal.
4. Las cuentas nuevas de Google llegan sin NIT, teléfono ni dirección: se abre **Mi perfil** con un aviso para
   completarlos (sin NIT no se puede comprar).

**Foto:** `app-avatar` muestra la foto del perfil; si la cuenta se creó con Google y no ha subido una propia, es la de
Google. Si no hay foto o no carga, muestra las iniciales. Al subir una foto en Mi perfil, reemplaza la de Google.

**Logo del botón:** es el logo oficial que Google publica para "Sign in with Google"
(`https://developers.google.com/static/identity/images/g-logo.png`, de la
[guía de marca](https://developers.google.com/identity/branding-guidelines)); no se guarda en el proyecto. Si no carga,
el botón se muestra solo con el texto.

Las cuentas de Google no tienen contraseña; si la persona quiere una, usa “¿Olvidaste tu contraseña?”.

En el backend (`.env`): `GOOGLE_OAUTH_CLIENT_ID`, `GOOGLE_OAUTH_CLIENT_SECRET`,
`GOOGLE_OAUTH_REDIRECT_URI=http://localhost:8080/identity/auth/oauth2/google/callback` y
`OAUTH_FRONTEND_URL=http://localhost:4200`. Sin client id el botón muestra “no disponible” y lo demás sigue igual.

## Colores

La paleta está en `src/styles/_variables.scss`: verde azulado suave como color principal (`--primario`), fondos
claros, un toque cálido (`--acento`) y estados en tonos pastel. Para cambiar el color del sistema basta con cambiar
las variables `--primario*`.

## Ventas (boletos y alquileres)

Paginas: `compras/` (cliente: comprar con mapa seleccionable + `mis-compras` con pago de ordenes con cartera)
y `ventas/` (ventanilla: mostrador, listado de ventas con cancelar, ordenes con pago en efectivo).
Servicios: `core/services/ventas.service.ts` y `core/services/ordenes-alquiler.service.ts`.

Las compras en linea y los pagos con cartera son asincronos: el POST devuelve 202
pendiente y el front consulta cada 2 s con `seguirHastaFin(id)` hasta el estado final
(`CONFIRMADA`/`PAGADA` o rechazo). La ventanilla (efectivo) es inmediata.

## Temas (claro, oscuro, cálido)

Arriba a la derecha (junto a la foto, y en el encabezado público) están los botones de tema: **claro**,
**oscuro**, **cálido** (tonos sepia) y **como el sistema** (sigue el modo claro/oscuro del sistema operativo).

- La elección se guarda en el navegador (`localStorage`, clave `tema`); si no se puede guardar, dura la sesión.
- `core/services/tema.service.ts` pone `data-tema` en `<html>`; un script en `index.html` lo aplica antes de que
  cargue Angular para que no parpadee en claro.
- Los colores de cada tema están en `styles/_variables.scss`. Los componentes usan siempre `var(--...)`:
  para un tema nuevo basta con agregar un bloque `:root[data-tema='nuevo'] { ... }` y su botón en
  `shared/components/selector-tema`.

