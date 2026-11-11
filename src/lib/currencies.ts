/** ISO 4217 codes offered for shopping totals (Swift: `Locale.commonISOCurrencyCodes`). */
export const COMMON_CURRENCIES = [
  'AED', 'ARS', 'AUD', 'BDT', 'BGN', 'BRL', 'CAD', 'CHF', 'CLP', 'CNY', 'COP', 'CZK', 'DKK', 'EGP', 'EUR', 'GBP',
  'GHS', 'HKD', 'HUF', 'IDR', 'ILS', 'INR', 'JPY', 'KES', 'KRW', 'MAD', 'MXN', 'MYR', 'NGN', 'NOK', 'NZD', 'PEN',
  'PHP', 'PKR', 'PLN', 'RON', 'RUB', 'SAR', 'SEK', 'SGD', 'THB', 'TRY', 'TWD', 'TZS', 'UAH', 'UGX', 'USD', 'VND',
  'XAF', 'XOF', 'ZAR',
];

/** "EUR · Euro", falling back to the bare code when names aren't available. */
export function currencyTitle(code: string): string {
  try {
    const name = new (Intl as unknown as { DisplayNames: new (l: string[] | undefined, o: { type: string }) => { of(c: string): string | undefined } })
      .DisplayNames(undefined, { type: 'currency' }).of(code);
    return name && name !== code ? `${code} · ${name}` : code;
  } catch {
    return code;
  }
}
