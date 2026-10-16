import { FormBuilder, Validators } from '@angular/forms';

/**
 * Grupo de campos de la cuenta que se crea en Identity (administrador de sucursal, cajero o piloto).
 * Se usa en "Nueva sucursal" y en "Agregar administrador".
 */
export function grupoCuenta(fb: FormBuilder) {
  return fb.nonNullable.group({
    nombres: ['', [Validators.required, Validators.maxLength(100)]],
    apellidos: ['', [Validators.required, Validators.maxLength(100)]],
    correo: ['', [Validators.required, Validators.email, Validators.maxLength(150)]],
    dpi: ['', [Validators.required, Validators.pattern(/^[0-9]{13}$/)]],
    nit: ['', [Validators.required, Validators.maxLength(20)]],
    telefono: ['', [Validators.required, Validators.pattern(/^[0-9]{8,20}$/)]],
    direccion: ['', [Validators.required, Validators.maxLength(255)]],
  });
}

export type GrupoCuenta = ReturnType<typeof grupoCuenta>;

/** Valores listos para enviar (sin espacios de más, NIT en mayúsculas). */
export function valoresCuenta(grupo: GrupoCuenta) {
  const v = grupo.getRawValue();
  return { ...v, correo: v.correo.trim(), nit: v.nit.trim().toUpperCase(), nombres: v.nombres.trim(), apellidos: v.apellidos.trim() };
}
