import { AppComponent } from './app.component';
import { BarraSuperiorComponent } from './layout/barra-superior/barra-superior.component';
import { LayoutService } from './layout/layout.service';
import { LayoutPublicoComponent } from './layout/publico/layout-publico.component';
import { PanelInicioComponent } from './paginas/panel/inicio/panel-inicio.component';
import { grupoCuenta } from './paginas/personal/datos-cuenta/cuenta.form';
import { DatosCuentaComponent } from './paginas/personal/datos-cuenta/datos-cuenta.component';
import { BotonGoogleComponent } from './shared/components/boton-google/boton-google.component';
import { agregarCapaBase } from './shared/utils/capa-base-mapa';

/**
 * Ancla del alcance de cobertura unitaria.
 *
 * Las pruebas unitarias cubren core, shared y layout. Estos archivos del alcance se ejercitan a
 * fondo en las pruebas de integración (layout, inicio del panel, alta de cuentas y mapas), por eso
 * aquí solo se importan: así aparecen en el reporte unitario como pendientes y el porcentaje no
 * queda inflado por encima del 90 %.
 */
describe('alcance de cobertura unitaria', () => {
  it('incluye los archivos que se cubren en integración', () => {
    // Arrange
    const modulos = [AppComponent, BarraSuperiorComponent, LayoutService, LayoutPublicoComponent, PanelInicioComponent];

    // Act
    const definidos = modulos.every((modulo) => modulo !== undefined);
    const ayudas = [grupoCuenta, DatosCuentaComponent, BotonGoogleComponent, agregarCapaBase];

    // Assert
    expect(definidos).toBeTrue();
    expect(ayudas.every((ayuda) => ayuda !== undefined)).toBeTrue();
  });
});
