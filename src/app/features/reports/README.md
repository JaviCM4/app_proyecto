# Módulo reports (pendiente)

Prefijo en el gateway: `/reports/**` → `http://localhost:8086`.

> Ojo: el prefijo del gateway es `/reports`, no `/reporting`.

## Cómo implementarlo (ver README principal, sección "Agregar un módulo nuevo")

1. Crear el modelo en `src/app/core/models/reports.model.ts` a partir de los DTOs del backend
   (`reporting-service/.../dtos` y respuestas de sus controladores).
2. Crear `src/app/core/services/reports.service.ts` con un método por endpoint.
   Si un endpoint devuelve PDF/Excel (`Content-Disposition`), pida la respuesta como `blob`:
   `this.http.get(url, { params, responseType: 'blob' })` y descárguelo creando un `objectURL`.
3. Crear las vistas aquí (standalone + `loadComponent`), p. ej. `ingresos.component.ts`.
4. Registrar las rutas en `src/app/app.routes.ts` con `authGuard` (+ `roleGuard` según el rol que pida el backend con `@RequiereRol`).
5. Agregar el enlace en `src/app/shared/navbar.component.ts` solo si el rol lo usa.

Roles del sistema: `ADMIN_SISTEMA` · `ADMIN_SUCURSAL` · `CAJERO` · `CHOFER` · `CLIENTE`.
