import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { TemaService } from './core/services/tema.service';
import { ToastComponent } from './shared/components/toast/toast.component';

/** Raíz: solo el router y los avisos. Cada layout (público / panel) arma su propia estructura. */
@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, ToastComponent],
  templateUrl: './app.component.html',
})
export class AppComponent {
  /** Se inyecta aquí para que el tema se aplique y siga al sistema en todas las páginas. */
  private readonly tema = inject(TemaService);
}
