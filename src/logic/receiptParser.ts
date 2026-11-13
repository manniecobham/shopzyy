import { fold } from '../lib/text';

export interface ReceiptLine { name: string; quantity: number; price: number | null }
export interface ParsedReceipt { storeName: string | null; total: number | null; items: ReceiptLine[] }

const AMOUNT = String.raw`-?\d+(?:[.,]\d{3})*[.,]\d{2}`;
const TRAILING_PRICE = new RegExp(String.raw`(${AMOUNT})\s*(?:[a-z0-9]|€|\$|£|eur|usd|gbp)?\s*$`, 'i');
const PRICE_ONLY = new RegExp(String.raw`^\s*(?:€|\$|£)?\s*(${AMOUNT})\s*(?:[a-z0-9]|€|\$|£|eur|usd|gbp)?\s*$`, 'i');
const QUANTITY_LINE = new RegExp(String.raw`^\s*(\d{1,3})\s*[x×]\s*${AMOUNT}\s*(?:[a-z0-9]|€|\$|£)?\s*$`, 'i');
const ALL_AMOUNTS = new RegExp(AMOUNT, 'g');

const TOTAL_WORDS = /\b(total|totaal|totale|summe|gesamt|gesamtbetrag|somme|importe|amount due|balance due|to pay|a pagar|te betalen|zu zahlen|a payer|da pagare|montant)\b/;
const SUBTOTAL_WORDS = /\b(sub ?total|subtotaal|subtotale|zwischensumme|sous ?total|subtotal)\b/;
const NOT_TOTAL = /\b(vat|tax|btw|mwst|tva|iva|ust|saving|savings|discount|korting|ersparnis|remise|descuento|sconto|points|punten|punkte|items?|artikel|articles?|articulos?|articoli)\b/;
const PAYMENT_WORDS = /\b(cash|change|tendered|card|visa|mastercard|maestro|pin|contant|wisselgeld|bar|bargeld|ruckgeld|especes|rendu|efectivo|cambio|resto|contanti|carta|tarjeta|betaald|paid|payment)\b/;
const NOISE_WORDS = /\b(receipt|invoice|ticket|kassabon|kassenbon|facture|factura|fattura|tel|phone|telefoon|www|http|vat|btw|tva|mwst|iva|thank|thanks|bedankt|danke|merci|gracias|grazie|cashier|kassier|kassa|terminal|transaction|order|date|datum|fecha|time|tijd|uhr|bon|nr|no|id|welcome|opening|open)\b/;
const UNIT_ONLY = /^(?:kg|g|gr|mg|l|ml|cl|dl|x|st|pcs|pc|stk|u|ud|eur|each|ea|per|p)$/;

export function parseAmount(text: string): number | null {
  const m = text.match(new RegExp(AMOUNT));
  if (!m) return null;
  const raw = m[0];
  const i = Math.max(raw.lastIndexOf('.'), raw.lastIndexOf(','));
  const value = Number(raw.slice(0, i).replace(/[.,]/g, '') + '.' + raw.slice(i + 1));
  return Number.isFinite(value) ? value : null;
}

const lastAmount = (line: string): number | null => {
  const all = line.match(ALL_AMOUNTS);
  return all ? parseAmount(all[all.length - 1]) : null;
};

const titleCase = (s: string) => (s === s.toUpperCase() ? s.toLowerCase().replace(/\p{L}[\p{L}']*/gu, (w) => w[0].toUpperCase() + w.slice(1)) : s);

function cleanName(raw: string): { name: string; quantity: number } {
  let text = raw.replace(TRAILING_PRICE, '').trim();
  let quantity = 1;
  const lead = text.match(/^(\d{1,2})\s*[x×]\s*/i);
  if (lead) { quantity = Number(lead[1]); text = text.slice(lead[0].length); }
  text = text
    .replace(/\d+(?:[.,]\d+)?\s*[x×]\s*\d+(?:[.,]\d+)?/gi, ' ')
    .replace(/\b\d{5,}\b/g, ' ')
    .replace(/[*#|_=]+/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/^[\s\-.:]+|[\s\-.:]+$/g, '');
  return { name: titleCase(text), quantity: quantity > 0 ? quantity : 1 };
}

function usableName(name: string): boolean {
  const letters = fold(name).replace(/[^a-z]/g, '');
  if (letters.length < 3) return false;
  const words = fold(name).match(/[a-z]+/g) ?? [];
  return !words.every((w) => UNIT_ONLY.test(w));
}

const isHeaderNoise = (folded: string) => NOISE_WORDS.test(folded) || /\d{1,2}[/.-]\d{1,2}[/.-]\d{2,4}/.test(folded) || /\d{1,2}:\d{2}/.test(folded);

function storeFrom(lines: string[]): { name: string; index: number } | null {
  for (const [index, line] of lines.slice(0, 6).entries()) {
    const folded = fold(line);
    if (isHeaderNoise(folded) || PRICE_ONLY.test(line) || TRAILING_PRICE.test(line)) continue;
    const letters = folded.replace(/[^a-z]/g, '');
    if (letters.length < 3 || /\d{4,}/.test(line)) continue;
    return { name: titleCase(line.replace(/[*#|_=]+/g, ' ').replace(/\s+/g, ' ').trim()), index };
  }
  return null;
}

function findTotal(lines: string[]): number | null {
  const candidates: number[] = [];
  lines.forEach((line, i) => {
    const folded = fold(line);
    if (!TOTAL_WORDS.test(folded) || SUBTOTAL_WORDS.test(folded) || NOT_TOTAL.test(folded) || PAYMENT_WORDS.test(folded)) return;
    let value = lastAmount(line);
    if (value === null) {
      for (const next of lines.slice(i + 1, i + 3)) {
        const m = next.match(PRICE_ONLY);
        if (m) { value = parseAmount(m[1]); break; }
      }
    }
    if (value !== null && value > 0) candidates.push(value);
  });
  return candidates.length ? Math.max(...candidates) : null;
}

export function parseReceipt(rawLines: string[]): ParsedReceipt {
  const lines = rawLines.flatMap((l) => l.split(/\r?\n/)).map((l) => l.trim()).filter(Boolean);
  const stop = lines.findIndex((l) => {
    const f = fold(l);
    return SUBTOTAL_WORDS.test(f) || (TOTAL_WORDS.test(f) && !NOT_TOTAL.test(f));
  });
  const store = storeFrom(lines);
  const body = (stop >= 0 ? lines.slice(0, stop) : lines).slice(store ? store.index + 1 : 0);

  const items: ReceiptLine[] = [];
  const dangling: string[] = [];
  const prices: number[] = [];
  for (const line of body) {
    const folded = fold(line);
    if (isHeaderNoise(folded) || PAYMENT_WORDS.test(folded)) continue;
    const qtyLine = line.match(QUANTITY_LINE);
    if (qtyLine) {
      if (items.length > 0) items[items.length - 1].quantity = Number(qtyLine[1]);
      continue;
    }
    const priceOnly = line.match(PRICE_ONLY);
    if (priceOnly) { prices.push(parseAmount(priceOnly[1]) ?? 0); continue; }
    const trailing = line.match(TRAILING_PRICE);
    const { name, quantity } = cleanName(line);
    if (!usableName(name)) continue;
    if (trailing) {
      const price = parseAmount(trailing[1]);
      if (price !== null && price < 0) continue;
      items.push({ name, quantity, price });
    } else {
      dangling.push(line);
    }
  }

  if (items.length < 2 && prices.length >= 2) {
    const names = dangling.map(cleanName).filter((n) => usableName(n.name));
    if (names.length === prices.length) {
      names.forEach((n, i) => items.push({ name: n.name, quantity: n.quantity, price: prices[i] }));
    }
  }

  const total = findTotal(lines);
  const sum = items.reduce((acc, i) => acc + (i.price ?? 0), 0);
  return {
    storeName: store?.name ?? null,
    total: total ?? (items.some((i) => i.price !== null) ? Math.round(sum * 100) / 100 : null),
    items,
  };
}
