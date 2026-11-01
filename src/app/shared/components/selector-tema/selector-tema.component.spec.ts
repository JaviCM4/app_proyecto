import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TemaService } from '../../../core/services/tema.service';
import { SelectorTemaComponent } from './selector-tema.component';

/**
 * Pruebas unitarias del selector de tema.
 * Regla: cada botón elige su tema y el botón activo refleja la elección actual.
 */

const OPCIONES_ESPERADAS = 4;
const INDICE_OSCURO = 1;

function mediaQuery(): MediaQueryList {
  return {
    matches: false,
    media: '(prefers-color-scheme: dark)',
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
    addListener: () => undefined,
    removeListener: () => undefined,
    dispatchEvent: () => false,
    onchange: null,
  } as unknown as MediaQueryList;
}

describe('SelectorTemaComponent', () => {
  let fixture: ComponentFixture<SelectorTemaComponent>;
  let servicio: TemaService;

  beforeEach(() => {
    // Arrange
    localStorage.clear();
    spyOn(window, 'matchMedia').and.returnValue(mediaQuery());
    TestBed.configureTestingModule({ imports: [SelectorTemaComponent] });
    servicio = TestBed.inject(TemaService);
    fixture = TestBed.createComponent(SelectorTemaComponent);
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('ofrece los cuatro temas', () => {
    // Arrange
    const opciones = fixture.componentInstance.opciones;

    // Act
    const cantidad = opciones.length;

    // Assert
    expect(cantidad).toBe(OPCIONES_ESPERADAS);
  });

  it('dibuja un botón por tema', () => {
    // Arrange
    fixture.detectChanges();

    // Act
    const botones = fixture.nativeElement.querySelectorAll('.opcion');

    // Assert
    expect(botones.length).toBe(OPCIONES_ESPERADAS);
  });

  it('cambia el tema al pulsar un botón', () => {
    // Arrange
    fixture.detectChanges();
    const botones = fixture.nativeElement.querySelectorAll('.opcion') as NodeListOf<HTMLButtonElement>;

    // Act
    botones[INDICE_OSCURO].click();
    fixture.detectChanges();

    // Assert
    expect(servicio.tema()).toBe('oscuro');
    expect(botones[INDICE_OSCURO].classList).toContain('activa');
  });
});
