# Módulo trips (pendiente)

Prefijo en el gateway: `/trips/**` → `http://localhost:8083`.

## Cómo implementarlo (ver README principal, sección "Agregar un módulo nuevo")

1. Crear el modelo en `src/app/core/models/trips.model.ts` a partir de los DTOs del backend
   (`trips-service/.../dtos` y respuestas de sus controladores).
2. Crear `src/app/core/services/trips.service.ts` con un método por endpoint.
3. Crear las vistas aquí (standalone + `loadComponent`), p. ej. `rutas.component.ts`, `viajes.component.ts`.
4. Registrar las rutas en `src/app/app.routes.ts` con `authGuard` (+ `roleGuard` según el rol que pida el backend con `@RequiereRol`).
5. Agregar el enlace en `src/app/shared/navbar.component.ts` solo si el rol lo usa.

Roles del sistema: `ADMIN_SISTEMA` · `ADMIN_SUCURSAL` · `CAJERO` · `CHOFER` · `CLIENTE`.
