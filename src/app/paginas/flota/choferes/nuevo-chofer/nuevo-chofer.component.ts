import { Component, computed, effect, inject, input, output, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Chofer, NuevoChofer, TipoLicencia } from '../../../../core/models/chofer.model';
import { Sucursal } from '../../../../core/models/sucursal.model';
import { UsuarioBusqueda } from '../../../../core/models/usuario.model';
import { AuthService } from '../../../../core/services/auth.service';
import { ChoferesService } from '../../../../core/services/choferes.service';
import { SucursalesService } from '../../../../core/services/sucursales.service';
import { errorApi, marcarErroresServidor, mensajeError } from '../../../../core/utils/errores-http';
import { hoyGt } from '../../../../core/utils/fechas';
import { ModalComponent } from '../../../../shared/components/modal/modal.component';
import { ToastService } from '../../../../shared/services/toast.service';
import { CuentaPersonaComponent, ModoCuenta, cuentaElegidaValida } from '../../../personal/cuenta-persona/cuenta-persona.component';
import { grupoCuenta, valoresCuenta } from '../../../personal/datos-cuenta/cuenta.form';

/** Datos que Identity rechaza por estar repetidos → campo del grupo de la cuenta. */
const CONFLICTOS: Record<string, string> = {
  CORREO_EN_USO: 'cuenta.correo',
  DPI_EN_USO: 'cuenta.dpi',
  NIT_EN_USO: 'cuenta.nit',
};

const TIPOS_FOTO = ['image/jpeg', 'image/png', 'image/webp'];
const MAXIMO_FOTO = 2 * 1024 * 1024;

/**
 * Modal para registrar un chofer con una cuenta nueva o con una persona que ya tiene cuenta.
 * Si recibe `sucursalId` la sucursal queda fija; si no, el administrador del sistema la elige.
 * La foto es obligatoria; con una cuenta existente que ya tiene foto de perfil se puede omitir.
 * Lo usan Choferes y Personal.
 */
@Component({
  selector: 'app-nuevo-chofer',
  standalone: true,
  imports: [ReactiveFormsModule, ModalComponent, CuentaPersonaComponent],
  templateUrl: './nuevo-chofer.component.html',
  styleUrl: './nuevo-chofer.component.scss',
})
export class NuevoChoferComponent {
  private readonly servicio = inject(ChoferesService);
  private readonly sucursalesServicio = inject(SucursalesService);
  private readonly avisos = inject(ToastService);
  private readonly fb = inject(FormBuilder);

  readonly abierto = input(false);
  readonly sucursalId = input<string | null>(null);
  readonly creado = output<Chofer>();
  readonly cerrar = output<void>();

  private readonly auth = inject(AuthService);
  readonly esSistema = this.auth.tieneRol('ADMIN_SISTEMA');
  readonly tiposLicencia: TipoLicencia[] = ['A', 'B', 'C', 'M', 'E'];

  readonly sucursales = signal<Sucursal[]>([]);
  readonly enviando = signal(false);
  readonly modo = signal<ModoCuenta>('nueva');
  readonly existente = signal<UsuarioBusqueda | null>(null);
  readonly correoEnUso = signal<string | null>(null);
  readonly foto = signal<File | null>(null);
  /** Llave de idempotencia: la misma en un reintento por red; se renueva si el servidor rechaza. */
  private solicitudId = crypto.randomUUID();

  readonly form = this.fb.nonNullable.group({
    sucursalId: ['', Validators.required],
    numeroLicencia: ['', [Validators.required, Validators.minLength(4), Validators.maxLength(30), Validators.pattern(/^[A-Za-z0-9-]+$/)]],
    tipoLicencia: ['B' as TipoLicencia, Validators.required],
    fechaVencimientoLicencia: ['', Validators.required],
    salarioBaseViaje: [null as number | null, [Validators.required, Validators.min(0.01)]],
    fechaRegistro: [hoyGt(), Validators.required],
    cuenta: grupoCuenta(this.fb),
  });

  /** Foto de perfil de la cuenta elegida (se usa si no se sube otra). */
  readonly fotoDePerfil = computed(() => (this.modo() === 'existente' ? this.existente()?.fotoUrl ?? null : null));
  readonly fotoObligatoria = computed(() => !this.fotoDePerfil());

  readonly subtitulo = computed(() =>
    this.modo() === 'existente'
      ? 'Conserva su cuenta; le llegará un correo para que vuelva a iniciar sesión como piloto.'
      : 'Se crea su cuenta y le llega un correo para crear su contraseña.',
  );

  constructor() {
    effect(() => {
      if (!this.abierto()) return;
      this.modo.set('nueva');
      this.existente.set(null);
      this.correoEnUso.set(null);
      this.foto.set(null);
      this.solicitudId = crypto.randomUUID();
      this.form.reset({
        sucursalId: this.sucursalId() || (this.esSistema ? '' : this.auth.usuario()?.sucursalId ?? ''),
        numeroLicencia: '',
        tipoLicencia: 'B',
        fechaVencimientoLicencia: '',
        salarioBaseViaje: null,
        fechaRegistro: hoyGt(),
      });
      this.form.enable();
      if (this.sucursalId() || !this.esSistema) this.form.controls.sucursalId.disable();
      this.sucursalesServicio.listar(true).subscribe({ next: (s) => this.sucursales.set(s) });
    });
  }

  nombreSucursal(id: string | null): string {
    return this.sucursales().find((s) => s.sucursalId === id)?.nombre ?? '';
  }

  invalido(ruta: string): boolean {
    const c = this.form.get(ruta);
    return !!c && c.touched && c.invalid;
  }

  errorServidor(ruta: string): string | null {
    return (this.form.get(ruta)?.errors?.['servidor'] as string | undefined) ?? null;
  }

  alElegirFoto(evento: Event): void {
    const input = evento.target as HTMLInputElement;
    const archivo = input.files?.[0] ?? null;
    if (archivo && (!TIPOS_FOTO.includes(archivo.type) || archivo.size > MAXIMO_FOTO)) {
      this.avisos.error('La foto debe ser JPG, PNG o WEBP y pesar máximo 2 MB.');
      input.value = '';
      this.foto.set(null);
      return;
    }
    this.foto.set(archivo);
  }

  guardar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    if (!cuentaElegidaValida(this.modo(), this.existente())) {
      this.avisos.error('Busca y elige una cuenta que se pueda asignar como chofer.');
      return;
    }
    if (this.form.controls.fechaVencimientoLicencia.value <= hoyGt()) {
      this.form.controls.fechaVencimientoLicencia.setErrors({ futura: true });
      this.form.controls.fechaVencimientoLicencia.markAsTouched();
      this.avisos.error('La licencia debe vencer en una fecha futura.');
      return;
    }
    const archivo = this.foto();
    if (!archivo && this.fotoObligatoria()) {
      this.avisos.error('Sube la foto del chofer.');
      return;
    }
    this.enviando.set(true);
    if (!archivo) {
      this.registrar(null);
      return;
    }
    this.servicio.subirFoto(archivo).subscribe({
      next: (r) => this.registrar(r.fotoUrl),
      error: (e) => {
        this.enviando.set(false);
        this.avisos.error(mensajeError(e, 'No se pudo subir la foto.'));
      },
    });
  }

  private registrar(fotoUrl: string | null): void {
    const v = this.form.getRawValue();
    const existente = this.modo() === 'existente' ? this.existente() : null;
    const datos: NuevoChofer = {
      sucursalId: v.sucursalId,
      numeroLicencia: v.numeroLicencia.trim().toUpperCase(),
      tipoLicencia: v.tipoLicencia,
      fechaVencimientoLicencia: v.fechaVencimientoLicencia,
      salarioBaseViaje: Number(v.salarioBaseViaje),
      fechaRegistro: v.fechaRegistro,
    };
    if (existente) {
      datos.usuarioExistente = { solicitudId: this.solicitudId, usuarioId: existente.usuarioId, ...(fotoUrl ? { fotoUrl } : {}) };
    } else {
      datos.cuenta = { ...valoresCuenta(this.form.controls.cuenta), solicitudId: this.solicitudId, ...(fotoUrl ? { fotoUrl } : {}) };
    }

    this.correoEnUso.set(null);
    this.servicio.crear(datos).subscribe({
      next: (c) => {
        this.enviando.set(false);
        this.avisos.exito(
          existente
            ? `${c.nombreCompleto} quedó registrado como piloto. Le llegará un correo para que vuelva a iniciar sesión.`
            : `${c.nombreCompleto} quedó registrado como piloto. Le llegará un correo para activar su cuenta.`,
        );
        this.creado.emit(c);
      },
      error: (e) => {
        this.enviando.set(false);
        this.solicitudId = crypto.randomUUID();
        this.mostrarError(e, v.cuenta.correo ?? '');
      },
    });
  }

  private mostrarError(e: unknown, correo: string): void {
    marcarErroresServidor(this.form, e);
    const cuerpo = errorApi(e);
    const campo = cuerpo ? CONFLICTOS[cuerpo.codigo] : undefined;
    if (campo) {
      this.form.get(campo)?.setErrors({ servidor: cuerpo!.mensaje });
      this.form.get(campo)?.markAsTouched();
    }
    if (cuerpo?.codigo === 'CORREO_EN_USO') this.correoEnUso.set(correo.trim().toLowerCase());
    this.avisos.error(mensajeError(e, 'No se pudo registrar el chofer.'));
  }
}
