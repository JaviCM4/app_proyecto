# Módulo sales (pendiente)

Prefijo en el gateway: `/sales/**` → `http://localhost:8084`.

## Cómo implementarlo (ver README principal, sección "Agregar un módulo nuevo")

1. Crear el modelo en `src/app/core/models/sales.model.ts` a partir de los DTOs del backend
   (`sales-service/.../dtos` y respuestas de sus controladores).
2. Crear `src/app/core/services/sales.service.ts` con un método por endpoint.
3. Crear las vistas aquí (standalone + `loadComponent`), p. ej. `viajes.component.ts`, `asientos.component.ts`, `mis-boletos.component.ts`.
4. Registrar las rutas en `src/app/app.routes.ts` con `authGuard` (+ `roleGuard` según el rol que pida el backend con `@RequiereRol`).
5. Agregar el enlace en `src/app/shared/navbar.component.ts` solo si el rol lo usa.

Roles del sistema: `ADMIN_SISTEMA` · `ADMIN_SUCURSAL` · `CAJERO` · `CHOFER` · `CLIENTE`.
