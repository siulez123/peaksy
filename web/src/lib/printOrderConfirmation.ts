import { formatMoney, type OrderConfirmation } from '../api';
import { formatPickupHourLabel } from './timeOfDay';

export type OrderPrintLabels = {
  title: string;
  orderRef: string;
  name: string;
  pickup: string;
  items: string;
  notes: string;
  payment: string;
  total: string;
  paymentStatus: string;
};

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Abre janela de impressão com o resumo completo (evita folha em branco do modal). */
export function printOrderConfirmation(
  order: OrderConfirmation,
  labels: OrderPrintLabels,
  localeTag: string
): void {
  const fmtHour = (slot: string) => formatPickupHourLabel(slot, localeTag);
  const itemRows = order.items
    .map(
      (it) => `
      <tr>
        <td>${escapeHtml(it.productName)} <span class="muted">${escapeHtml(it.variant)}</span> × ${it.quantity}</td>
        <td class="num">${escapeHtml(formatMoney(it.lineCents))}</td>
      </tr>`
    )
    .join('');

  const notesBlock = order.notes
    ? `<p><span class="label">${escapeHtml(labels.notes)}</span> ${escapeHtml(order.notes)}</p>`
    : '';

  const html = `<!DOCTYPE html>
<html lang="${localeTag.slice(0, 2)}">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(labels.title)} — ${escapeHtml(order.orderRef)}</title>
  <style>
    * { box-sizing: border-box; }
    body { font-family: system-ui, sans-serif; color: #0f172a; margin: 24px; font-size: 14px; line-height: 1.45; }
    h1 { font-size: 20px; margin: 0 0 4px; }
    .shop { font-size: 13px; color: #64748b; margin-bottom: 20px; }
    .label { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.04em; color: #64748b; display: block; margin-bottom: 2px; }
    .block { margin-bottom: 14px; }
    .muted { color: #64748b; }
    table { width: 100%; border-collapse: collapse; margin: 12px 0; }
    th, td { padding: 8px 0; border-bottom: 1px solid #e2e8f0; text-align: left; vertical-align: top; }
    th { font-size: 11px; text-transform: uppercase; color: #64748b; }
    td.num, th.num { text-align: right; }
    .total { font-size: 16px; font-weight: 700; margin-top: 12px; text-align: right; }
  </style>
</head>
<body>
  <h1>${escapeHtml(labels.title)}</h1>
  <p class="shop">${escapeHtml(order.lojaName)}</p>
  <div class="block">
    <span class="label">${escapeHtml(labels.orderRef)}</span>
    <strong>${escapeHtml(order.orderRef)}</strong>
  </div>
  <div class="block">
    <span class="label">${escapeHtml(labels.name)}</span>
    ${escapeHtml(order.customerName)}
  </div>
  <div class="block">
    <span class="label">${escapeHtml(labels.pickup)}</span>
    ${escapeHtml(order.pickupDate)} · ${escapeHtml(fmtHour(order.pickupTime))}
  </div>
  <table>
    <thead>
      <tr>
        <th>${escapeHtml(labels.items)}</th>
        <th class="num">${escapeHtml(labels.total)}</th>
      </tr>
    </thead>
    <tbody>${itemRows}</tbody>
  </table>
  ${notesBlock}
  <div class="block">
    <span class="label">${escapeHtml(labels.payment)}</span>
    ${escapeHtml(labels.paymentStatus)}
  </div>
  <p class="total">${escapeHtml(labels.total)}: ${escapeHtml(formatMoney(order.totalCents))}</p>
</body>
</html>`;

  const win = window.open('', '_blank', 'noopener,noreferrer');
  if (!win) return;
  win.document.open();
  win.document.write(html);
  win.document.close();
  win.focus();
  const doPrint = () => {
    win.print();
    win.addEventListener('afterprint', () => win.close());
  };
  if (win.document.readyState === 'complete') {
    setTimeout(doPrint, 100);
  } else {
    win.onload = () => setTimeout(doPrint, 100);
  }
}
