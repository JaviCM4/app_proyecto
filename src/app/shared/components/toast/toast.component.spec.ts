import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ToastService } from '../../services/toast.service';
import { ToastComponent } from './toast.component';

/**
 * Pruebas unitarias del contenedor de avisos.
 * Regla: muestra los avisos del servicio y deja cerrarlos a mano.
 */

const TEXTO_INFO = 'Tu acceso cambió.';

describe('ToastComponent', () => {
  let fixture: ComponentFixture<ToastComponent>;
  let servicio: ToastService;

  beforeEach(() => {
    // Arrange
    TestBed.configureTestingModule({ imports: [ToastComponent] });
    servicio = TestBed.inject(ToastService);
    fixture = TestBed.createComponent(ToastComponent);
  });

  it('muestra el texto de cada aviso', () => {
    // Arrange
    servicio.info(TEXTO_INFO);

    // Act
    fixture.detectChanges();
    const aviso = fixture.nativeElement.querySelector('.aviso') as HTMLElement;

    // Assert
    expect(aviso.textContent).toContain(TEXTO_INFO);
  });

  it('marca el aviso con su tipo', () => {
    // Arrange
    servicio.error(TEXTO_INFO);

    // Act
    fixture.detectChanges();
    const aviso = fixture.nativeElement.querySelector('.aviso') as HTMLElement;

    // Assert
    expect(aviso.classList).toContain('error');
  });

  it('cierra el aviso al pulsar el botón', () => {
    // Arrange
    servicio.exito(TEXTO_INFO);
    fixture.detectChanges();

    // Act
    (fixture.nativeElement.querySelector('.aviso button') as HTMLButtonElement).click();
    fixture.detectChanges();

    // Assert
    expect(servicio.avisos().length).toBe(0);
  });
});
