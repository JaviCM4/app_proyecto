import { Pipe, PipeTransform } from '@angular/core';
import { Rol } from '../../core/models/auth.model';
import { NOMBRE_ROL, ORDEN_ROL } from '../constants/roles';

/**
 * Convierte roles en texto: {{ 'ADMIN_SUCURSAL' | rolTexto }} → "Administrador de sucursal".
 * Con una lista los ordena y los une: {{ usuario.roles | rolTexto }}.
 * El rol Cliente se omite cuando hay otro rol (todas las cuentas lo tienen para usar la cartera).
 */
@Pipe({ name: 'rolTexto', standalone: true })
export class RolTextoPipe implements PipeTransform {
  transform(valor: Rol | Rol[] | null | undefined): string {
    if (!valor) return '';
    if (!Array.isArray(valor)) return NOMBRE_ROL[valor] ?? valor;
    const ordenados = ORDEN_ROL.filter((r) => valor.includes(r));
    const visibles = ordenados.length > 1 ? ordenados.filter((r) => r !== 'CLIENTE') : ordenados;
    return visibles.map((r) => NOMBRE_ROL[r]).join(', ');
  }
}
