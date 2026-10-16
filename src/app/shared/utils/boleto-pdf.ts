import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import type { Venta } from '../../core/models/venta.model';

/**
 * Descarga el boleto en PDF capturando el ticket tal como se ve en pantalla
 * (misma imagen, fondo oscuro incluido). Si la captura falla, se usa Imprimir.
 */
export async function descargarBoletoPdf(v: Venta): Promise<void> {
  const elemento = document.querySelector('.ticket-imprimible') as HTMLElement | null;
  if (!elemento) throw new Error('sin-ticket');
  const lienzo = await html2canvas(elemento, { backgroundColor: '#0f172a', scale: 2 });
  const imagen = lienzo.toDataURL('image/png');
  const pdf = new jsPDF({ unit: 'mm', format: 'a5', orientation: 'landscape' });
  const paginaAncho = pdf.internal.pageSize.getWidth();
  const paginaAlto = pdf.internal.pageSize.getHeight();
  const proporcion = Math.min(paginaAncho / lienzo.width, paginaAlto / lienzo.height);
  const ancho = lienzo.width * proporcion;
  const alto = lienzo.height * proporcion;
  pdf.addImage(imagen, 'PNG', (paginaAncho - ancho) / 2, (paginaAlto - alto) / 2, ancho, alto);
  pdf.save(`boleto-${v.ventaId.slice(0, 8)}.pdf`);
}
