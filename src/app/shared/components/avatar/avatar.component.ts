import { Component, computed, input, signal } from '@angular/core';

/**
 * Foto de la persona o, si no tiene, sus iniciales.
 *
 * La foto es la que subió al sistema; en cuentas creadas con Google, mientras no suba una propia,
 * es la de su cuenta de Google. Si la imagen no carga (enlace vencido, sin red) se muestran las iniciales.
 */
@Component({
  selector: 'app-avatar',
  standalone: true,
  templateUrl: './avatar.component.html',
  styleUrl: './avatar.component.scss',
  host: {
    '[style.width.px]': 'tamano()',
    '[style.height.px]': 'tamano()',
    '[style.font-size.px]': 'tamano() * 0.4',
  },
})
export class AvatarComponent {
  readonly foto = input<string | null | undefined>(null);
  readonly nombre = input<string>('');
  readonly tamano = input<number>(32);

  /** URL que ya falló al cargar (si cambia la foto, se vuelve a intentar). */
  private readonly urlFallida = signal<string | null>(null);

  readonly mostrarFoto = computed(() => {
    const url = this.foto();
    return !!url && url !== this.urlFallida();
  });

  readonly iniciales = computed(() => {
    const partes = this.nombre().trim().split(/\s+/).filter(Boolean);
    if (partes.length === 0) return '?';
    const primera = partes[0].charAt(0);
    const ultima = partes.length > 1 ? partes[partes.length - 1].charAt(0) : '';
    return (primera + ultima).toUpperCase();
  });

  fallo(): void {
    this.urlFallida.set(this.foto() ?? null);
  }
}
