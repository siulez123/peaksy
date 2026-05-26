import { formatMoney, type OrderConfirmation } from '../api';
import { formatPickupHourLabel } from './timeOfDay';
import { formatVatRatePercent } from './vatDisplay';

export type OrderPrintLabels = {
  title: string;
  orderRef: string;
  name: string;
  phone: string;
  pickup: string;
  items: string;
  notes: string;
  payment: string;
  total: string;
  pricesIncludeVat: string;
  paymentStatus: string;
};

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function vatNoteHtml(rate: number, _label: string | undefined, localeTag: string): string {
  if (rate <= 0) return '';
  const rateStr = escapeHtml(formatVatRatePercent(rate, localeTag));
  return ` <span class="muted">(IVA ${rateStr}%)</span>`;
}

function buildPrintHtml(
  order: OrderConfirmation,
  labels: OrderPrintLabels,
  localeTag: string
): string {
  const fmtHour = (slot: string) => formatPickupHourLabel(slot, localeTag);
  const itemRows = order.items
    .map(
      (it) => `
      <tr>
        <td>${escapeHtml(it.productName)} <span class="muted">${escapeHtml(it.variant)}</span> × ${it.quantity}${vatNoteHtml(it.vatRatePercent ?? 0, it.vatRateLabel, localeTag)}</td>
        <td class="num">${escapeHtml(formatMoney(it.lineCents))}</td>
      </tr>`
    )
    .join('');

  const notesText = order.notes?.trim();
  const notesBlock = notesText
    ? `<div class="block">
    <span class="label">${escapeHtml(labels.notes)}</span>
    ${escapeHtml(notesText)}
  </div>`
    : '';

  return `<!DOCTYPE html>
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
    .total { font-size: 16px; font-weight: 700; margin-top: 8px; text-align: right; }
    .vat-note { font-size: 12px; color: #64748b; text-align: right; margin-top: 4px; }
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
    <span class="label">${escapeHtml(labels.phone)}</span>
    ${escapeHtml(order.customerPhone)}
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
  <p class="vat-note">${escapeHtml(labels.pricesIncludeVat)}</p>
</body>
</html>`;
}

/** Imprime o resumo (iframe oculto — evita about:blank com window.open + noopener). */
export function printOrderConfirmation(
  order: OrderConfirmation,
  labels: OrderPrintLabels,
  localeTag: string
): void {
  const html = buildPrintHtml(order, labels, localeTag);

  const iframe = document.createElement('iframe');
  iframe.setAttribute('title', labels.title);
  iframe.setAttribute('aria-hidden', 'true');
  iframe.style.cssText =
    'position:fixed;left:0;top:0;width:0;height:0;border:0;opacity:0;pointer-events:none';
  document.body.appendChild(iframe);

  const win = iframe.contentWindow;
  const doc = iframe.contentDocument ?? win?.document;
  if (!win || !doc) {
    iframe.remove();
    return;
  }

  doc.open();
  doc.write(html);
  doc.close();

  let done = false;
  const runPrint = () => {
    if (done) return;
    done = true;
    win.focus();
    win.print();
    const remove = () => {
      if (iframe.parentNode) iframe.parentNode.removeChild(iframe);
    };
    win.addEventListener('afterprint', remove, { once: true });
    setTimeout(remove, 2000);
  };

  win.onload = () => runPrint();
  requestAnimationFrame(() => {
    setTimeout(runPrint, 150);
  });
}
