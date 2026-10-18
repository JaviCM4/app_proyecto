import { Component, computed, effect, inject, input, output, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Observable } from 'rxjs';
import { NuevaSucursal, Sucursal } from '../../../core/models/sucursal.model';
import { UsuarioBusqueda } from '../../../core/models/usuario.model';
import { SucursalesService } from '../../../core/services/sucursales.service';
import { errorApi, marcarErroresServidor, mensajeError } from '../../../core/utils/errores-http';
import { hoyGt } from '../../../core/utils/fechas';
import { ModalComponent } from '../../../shared/components/modal/modal.component';
import { Coordenadas, SelectorUbicacionComponent } from '../../../shared/components/selector-ubicacion/selector-ubicacion.component';
import { DEPARTAMENTOS_GT } from '../../../shared/constants/departamentos';
import { ToastService } from '../../../shared/services/toast.service';
import { CuentaPersonaComponent, ModoCuenta, cuentaElegidaValida } from '../../personal/cuenta-persona/cuenta-persona.component';
import { grupoCuenta, valoresCuenta } from '../../personal/datos-cuenta/cuenta.form';

interface Paso {
  titulo: string;
  campos: string[];
}

/** Datos que el backend rechaza por estar repetidos → campo del formulario donde se marca. */
const CONFLICTOS: Record<string, string> = {
  CORREO_EN_USO: 'adminInicial.correo',
  DPI_EN_USO: 'adminInicial.dpi',
  NIT_EN_USO: 'adminInicial.nit',
};

/**
 * Asistente por pasos para crear una sucursal (datos → ubicación en el mapa → administrador)
 * o editarla (datos → ubicación; el código y el administrador no se cambian aquí).
 * El administrador inicial puede ser una cuenta nueva o alguien que ya se registró en la plataforma.
 */
@Component({
  selector: 'app-sucursal-formulario',
  standalone: true,
  imports: [ReactiveFormsModule, ModalComponent, SelectorUbicacionComponent, CuentaPersonaComponent],
  templateUrl: './sucursal-formulario.component.html',
  styleUrl: './sucursal-formulario.component.scss',
})
export class SucursalFormularioComponent {
  private readonly servicio = inject(SucursalesService);
  private readonly avisos = inject(ToastService);
  private readonly fb = inject(FormBuilder);

  readonly abierto = input(false);
  readonly sucursal = input<Sucursal | null>(null);
  readonly guardada = output<void>();
  readonly cerrar = output<void>();

  readonly departamentos = DEPARTAMENTOS_GT;
  readonly enviando = signal(false);
  readonly paso = signal(0);
  readonly modo = signal<ModoCuenta>('nueva');
  readonly existente = signal<UsuarioBusqueda | null>(null);
  readonly correoEnUso = signal<string | null>(null);
  /** Llave de idempotencia del alta del administrador; se renueva si el servidor rechaza. */
  private solicitudId = crypto.randomUUID();

  readonly form = this.fb.nonNullable.group({
    codigo: ['', [Validators.required, Validators.maxLength(10), Validators.pattern(/^[A-Za-z0-9_-]+$/)]],
    nombre: ['', [Validators.required, Validators.maxLength(100)]],
    departamento: ['', Validators.required],
    municipio: ['', [Validators.required, Validators.maxLength(60)]],
    direccion: ['', [Validators.required, Validators.maxLength(255)]],
    telefono: ['', [Validators.maxLength(20), Validators.pattern(/^[0-9]*$/)]],
    latitud: [null as number | null, [Validators.required, Validators.min(-90), Validators.max(90)]],
    longitud: [null as number | null, [Validators.required, Validators.min(-180), Validators.max(180)]],
    fechaAsignacion: [hoyGt(), Validators.required],
    adminInicial: grupoCuenta(this.fb),
  });

  readonly esNueva = computed(() => this.sucursal() === null);

  readonly pasos = computed<Paso[]>(() => {
    const base: Paso[] = [
      { titulo: 'Datos de la sucursal', campos: ['codigo', 'nombre', 'departamento', 'municipio', 'direccion', 'telefono'] },
      { titulo: 'Ubicación', campos: ['latitud', 'longitud'] },
    ];
    return this.esNueva() ? [...base, { titulo: 'Administrador', campos: ['adminInicial', 'fechaAsignacion'] }] : base;
  });

  readonly esUltimo = computed(() => this.paso() === this.pasos().length - 1);

  constructor() {
    effect(() => {
      if (!this.abierto()) return;
      const s = this.sucursal();
      this.paso.set(0);
      this.modo.set('nueva');
      this.existente.set(null);
      this.correoEnUso.set(null);
      this.solicitudId = crypto.randomUUID();
      this.form.reset();
      this.form.enable();
      if (s) {
        this.form.patchValue({ ...s, telefono: s.telefono ?? '' });
        this.form.controls.codigo.disable();
        this.form.controls.fechaAsignacion.disable();
        this.form.controls.adminInicial.disable();
      } else {
        this.form.controls.fechaAsignacion.setValue(hoyGt());
      }
    });
  }

  invalido(ruta: string): boolean {
    const c = this.form.get(ruta);
    return !!c && c.touched && c.invalid;
  }

  errorServidor(ruta: string): string | null {
    return (this.form.get(ruta)?.errors?.['servidor'] as string | undefined) ?? null;
  }

  alElegirUbicacion(c: Coordenadas): void {
    this.form.patchValue({ latitud: c.latitud, longitud: c.longitud });
    this.form.controls.latitud.markAsDirty();
  }

  /** Avanza solo si los campos del paso actual son válidos. */
  siguiente(): void {
    if (!this.pasoValido(this.paso())) return;
    if (this.esUltimo()) {
      this.guardar();
    } else {
      this.paso.update((p) => p + 1);
    }
  }

  anterior(): void {
    this.paso.update((p) => Math.max(0, p - 1));
  }

  /** Se puede saltar a un paso anterior o al siguiente si los previos están completos. */
  irA(indice: number): void {
    for (let i = 0; i < indice; i++) {
      if (!this.pasoValido(i)) return;
    }
    this.paso.set(indice);
  }

  private pasoValido(indice: number): boolean {
    const controles = this.pasos()[indice].campos.map((c) => this.form.get(c)!);
    controles.forEach((c) => c.markAllAsTouched());
    const valido = controles.every((c) => c.valid || c.disabled);
    if (!valido && indice === 1) this.avisos.error('Marca la ubicación de la sucursal en el mapa.');
    if (valido && indice === 2 && !cuentaElegidaValida(this.modo(), this.existente())) {
      this.avisos.error('Busca y elige la cuenta de quien administrará la sucursal.');
      return false;
    }
    return valido;
  }

  private guardar(): void {
    this.enviando.set(true);
    const v = this.form.getRawValue();
    const datos = {
      nombre: v.nombre.trim(),
      departamento: v.departamento,
      municipio: v.municipio.trim(),
      direccion: v.direccion.trim(),
      telefono: v.telefono.trim() || null,
      latitud: Number(v.latitud),
      longitud: Number(v.longitud),
    };
    const s = this.sucursal();
    const existente = this.modo() === 'existente' ? this.existente() : null;
    const nueva: NuevaSucursal = { ...datos, codigo: v.codigo.trim().toUpperCase(), fechaAsignacion: v.fechaAsignacion };
    if (existente) nueva.adminExistente = { solicitudId: this.solicitudId, usuarioId: existente.usuarioId };
    else nueva.adminInicial = { ...valoresCuenta(this.form.controls.adminInicial), solicitudId: this.solicitudId };
    const peticion: Observable<unknown> = s
      ? this.servicio.actualizar(s.sucursalId, { ...datos, version: s.version })
      : this.servicio.crear(nueva);

    this.correoEnUso.set(null);
    peticion.subscribe({
      next: () => {
        this.enviando.set(false);
        this.avisos.exito(
          s
            ? 'Sucursal actualizada.'
            : existente
              ? `Sucursal creada. ${existente.nombreCompleto} quedó como administrador y le llegará un correo de aviso.`
              : `Sucursal creada. Se envió un correo a ${v.adminInicial.correo} para activar la cuenta del administrador.`,
        );
        this.guardada.emit();
      },
      error: (e) => {
        this.enviando.set(false);
        this.solicitudId = crypto.randomUUID();
        this.mostrarError(e);
        if (errorApi(e)?.codigo === 'CORREO_EN_USO') this.correoEnUso.set(v.adminInicial.correo.trim().toLowerCase());
      },
    });
  }

  /** Marca el campo con problema y regresa al paso donde está. */
  private mostrarError(e: unknown): void {
    marcarErroresServidor(this.form, e);
    const cuerpo = errorApi(e);
    const campo = cuerpo ? CONFLICTOS[cuerpo.codigo] : undefined;
    if (campo) {
      this.form.get(campo)?.setErrors({ servidor: cuerpo!.mensaje });
      this.form.get(campo)?.markAsTouched();
    }
    const rutas = [...(cuerpo?.errores ?? []).map((x) => x.campo ?? ''), campo ?? ''];
    if (cuerpo?.codigo === 'SUCURSAL_DUPLICADA') this.paso.set(0);
    else if (rutas.some((r) => r.startsWith('adminInicial') || r.startsWith('adminExistente'))) this.paso.set(2);
    else if (cuerpo && esErrorDeCuenta(cuerpo.codigo)) this.paso.set(2);
    else if (rutas.some((r) => r === 'latitud' || r === 'longitud')) this.paso.set(1);
    else if (rutas.some((r) => r)) this.paso.set(0);
    this.avisos.error(mensajeError(e, 'No se pudo guardar la sucursal.'));
  }
}

/** Rechazos de Identity o Fleet sobre la cuenta elegida: se regresa al paso del administrador. */
function esErrorDeCuenta(codigo: string): boolean {
  return [
    'CUENTA_REQUERIDA', 'USUARIO_NO_EXISTE', 'CUENTA_INACTIVA', 'CUENTA_BLOQUEADA', 'ES_CHOFER',
    'ES_ADMIN_SISTEMA', 'YA_ES_PERSONAL', 'PERSONAL_EN_OTRA_SUCURSAL',
  ].includes(codigo);
}
