import { fakeAsync, TestBed, tick } from '@angular/core/testing';
import { ToastService } from './toast.service';

/**
 * Pruebas unitarias de ToastService.
 * Regla: los avisos se apilan, se pueden cerrar y se retiran solos.
 */

const TEXTO_EXITO = 'Boleto vendido.';
const TEXTO_ERROR = 'No se pudo guardar.';
const TEXTO_INFO = 'Tu acceso cambió.';
const DURACION_EXITO_MS = 4000;
const DURACION_ERROR_MS = 6000;

describe('ToastService', () => {
  let servicio: ToastService;

  beforeEach(() => {
    // Arrange
    TestBed.configureTestingModule({});
    servicio = TestBed.inject(ToastService);
  });

  it('agrega un aviso de éxito', () => {
    // Arrange
    const texto = TEXTO_EXITO;

    // Act
    servicio.exito(texto);

    // Assert
    expect(servicio.avisos().length).toBe(1);
    expect(servicio.avisos()[0].tipo).toBe('exito');
    expect(servicio.avisos()[0].texto).toBe(TEXTO_EXITO);
  });

  it('agrega un aviso de error', () => {
    // Arrange
    const texto = TEXTO_ERROR;

    // Act
    servicio.error(texto);

    // Assert
    expect(servicio.avisos()[0].tipo).toBe('error');
  });

  it('agrega un aviso de información', () => {
    // Arrange
    const texto = TEXTO_INFO;

    // Act
    servicio.info(texto);

    // Assert
    expect(servicio.avisos()[0].tipo).toBe('info');
  });

  it('apila varios avisos con identificadores distintos', () => {
    // Arrange
    servicio.exito(TEXTO_EXITO);

    // Act
    servicio.error(TEXTO_ERROR);

    // Assert
    const avisos = servicio.avisos();
    expect(avisos.length).toBe(2);
    expect(avisos[0].id).not.toBe(avisos[1].id);
  });

  it('cierra un aviso por su identificador', () => {
    // Arrange
    servicio.exito(TEXTO_EXITO);
    servicio.info(TEXTO_INFO);
    const id = servicio.avisos()[0].id;

    // Act
    servicio.cerrar(id);

    // Assert
    expect(servicio.avisos().length).toBe(1);
    expect(servicio.avisos()[0].texto).toBe(TEXTO_INFO);
  });

  it('retira solo el aviso de éxito después de su duración', fakeAsync(() => {
    // Arrange
    servicio.exito(TEXTO_EXITO);

    // Act
    tick(DURACION_EXITO_MS);

    // Assert
    expect(servicio.avisos().length).toBe(0);
  }));

  it('mantiene el aviso de error más tiempo que el de éxito', fakeAsync(() => {
    // Arrange
    servicio.error(TEXTO_ERROR);

    // Act
    tick(DURACION_EXITO_MS);

    // Assert
    expect(servicio.avisos().length).toBe(1);
    tick(DURACION_ERROR_MS - DURACION_EXITO_MS);
    expect(servicio.avisos().length).toBe(0);
  }));
});
