import { DatePipe, DecimalPipe } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { Bus, EstadoBus } from '../../../core/models/bus.model';
import { Chofer } from '../../../core/models/chofer.model';
import { PersonalSucursal, Sucursal } from '../../../core/models/sucursal.model';
import { AuthService } from '../../../core/services/auth.service';
import { BusesService } from '../../../core/services/buses.service';
import { ChoferesService } from '../../../core/services/choferes.service';
import { PersonalService } from '../../../core/services/personal.service';
import { SucursalesService } from '../../../core/services/sucursales.service';
import { mensajeError } from '../../../core/utils/errores-http';
import { hoyGt } from '../../../core/utils/fechas';
import { AvatarComponent } from '../../../shared/components/avatar/avatar.component';
import { IconoComponent } from '../../../shared/components/icono/icono.component';
import { SelectorUbicacionComponent } from '../../../shared/components/selector-ubicacion/selector-ubicacion.component';
import { NOMBRE_ROL } from '../../../shared/constants/roles';
import { ToastService } from '../../../shared/services/toast.service';

/** Días antes del vencimiento en que una licencia se marca como "por vencer". */
const DIAS_AVISO_LICENCIA = 30;

interface Acceso {
  texto: string;
  ruta: string;
  icono: string;
}

/**
 * Página del administrador de sucursal: los datos de la sucursal que tiene a cargo, su equipo y un resumen
 * de la flota (buses por estado y pilotos), con accesos a la operación.
 */
@Component({
  selector: 'app-mi-sucursal',
  standalone: true,
  imports: [DatePipe, DecimalPipe, RouterLink, AvatarComponent, IconoComponent, SelectorUbicacionComponent],
  templateUrl: './mi-sucursal.component.html',
  styleUrl: './mi-sucursal.component.scss',
})
export class MiSucursalComponent implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly sucursales = inject(SucursalesService);
  private readonly personalServicio = inject(PersonalService);
  private readonly busesServicio = inject(BusesService);
  private readonly choferesServicio = inject(ChoferesService);
  private readonly avisos = inject(ToastService);

  readonly sucursalId = this.auth.usuario()?.sucursalId ?? null;
  readonly usuarioId = this.auth.usuario()?.usuarioId ?? '';
  readonly nombreRol = NOMBRE_ROL;

  readonly sucursal = signal<Sucursal | null>(null);
  readonly personal = signal<PersonalSucursal[]>([]);
  readonly buses = signal<Bus[]>([]);
  readonly choferes = signal<Chofer[]>([]);
  readonly cargando = signal(true);

  readonly accesos: Acceso[] = [
    { texto: 'Buses', ruta: '/panel/buses', icono: 'bus' },
    { texto: 'Choferes', ruta: '/panel/choferes', icono: 'perfil' },
    { texto: 'Personal', ruta: '/panel/personal', icono: 'usuarios' },
    { texto: 'Viajes', ruta: '/panel/viajes', icono: 'ruta' },
    { texto: 'Vender boletos', ruta: '/panel/mostrador', icono: 'boleto' },
    { texto: 'Reportes', ruta: '/panel/reportes', icono: 'reporte' },
  ];

  readonly equipo = computed(() =>
    [...this.personal()].sort((a, b) => (a.rol === b.rol ? a.nombreCompleto.localeCompare(b.nombreCompleto) : a.rol === 'ADMIN_SUCURSAL' ? -1 : 1)),
  );
  readonly administradores = computed(() => this.personal().filter((p) => p.rol === 'ADMIN_SUCURSAL').length);
  readonly cajeros = computed(() => this.personal().filter((p) => p.rol === 'CAJERO').length);

  readonly flota = computed(() => {
    const cuenta = (e: EstadoBus) => this.buses().filter((b) => b.estado === e).length;
    return {
      total: this.buses().filter((b) => b.estado !== 'INACTIVO').length,
      activos: cuenta('ACTIVO'),
      enRuta: cuenta('EN_RUTA'),
      enTaller: cuenta('EN_TALLER'),
    };
  });

  readonly pilotos = computed(() => {
    const activos = this.choferes().filter((c) => c.estado === 'ACTIVO');
    const limite = hoyGt(DIAS_AVISO_LICENCIA);
    const hoy = hoyGt();
    return {
      activos: activos.length,
      vencidas: activos.filter((c) => c.fechaVencimientoLicencia < hoy).length,
      porVencer: activos.filter((c) => c.fechaVencimientoLicencia >= hoy && c.fechaVencimientoLicencia <= limite).length,
    };
  });

  ngOnInit(): void {
    if (!this.sucursalId) {
      this.cargando.set(false);
      return;
    }
    const id = this.sucursalId;
    this.sucursales.obtener(id).subscribe({
      next: (s) => this.sucursal.set(s),
      error: (e) => {
        this.cargando.set(false);
        this.avisos.error(mensajeError(e, 'No se pudo cargar tu sucursal.'));
      },
    });
    // Cada lista por separado: si una falla, el resto de la página se muestra igual.
    forkJoin({
      personal: this.personalServicio.listar(id, undefined, true).pipe(catchError(() => of([] as PersonalSucursal[]))),
      buses: this.busesServicio.listar(id).pipe(catchError(() => of([] as Bus[]))),
      choferes: this.choferesServicio.listar(id).pipe(catchError(() => of([] as Chofer[]))),
    }).subscribe(({ personal, buses, choferes }) => {
      this.personal.set(personal);
      this.buses.set(buses);
      this.choferes.set(choferes);
      this.cargando.set(false);
    });
  }
}

