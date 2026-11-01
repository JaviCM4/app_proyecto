import { TestBed } from '@angular/core/testing';
import { AvisosMenuService } from './avisos-menu.service';

/**
 * Pruebas unitarias de AvisosMenuService.
 * Regla: cada cambio de pendientes avisa al menú para que vuelva a contar.
 */

const EMISIONES_ESPERADAS = 2;

describe('AvisosMenuService', () => {
  let servicio: AvisosMenuService;

  beforeEach(() => {
    // Arrange
    TestBed.configureTestingModule({});
    servicio = TestBed.inject(AvisosMenuService);
  });

  it('emite un aviso cada vez que se pide refrescar', () => {
    // Arrange
    let emisiones = 0;
    servicio.cambios$.subscribe(() => emisiones++);

    // Act
    servicio.refrescar();
    servicio.refrescar();

    // Assert
    expect(emisiones).toBe(EMISIONES_ESPERADAS);
  });

  it('no emite nada si nadie pide refrescar', () => {
    // Arrange
    let emisiones = 0;
    servicio.cambios$.subscribe(() => emisiones++);

    // Act
    // (sin llamadas a refrescar)

    // Assert
    expect(emisiones).toBe(0);
  });
});
