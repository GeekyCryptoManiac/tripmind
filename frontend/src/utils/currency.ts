/**
 * currency.ts
 *
 * Shared currency utility for TripMind.
 * Single source of truth for FX rates, conversion, formatting,
 * and destination → currency guessing.
 *
 * Used by:
 *   - LiveToolsPanel (converter UI)
 *   - ExpenseTracker (totalSpent normalisation)
 *   - exportPDF      (Week 6 Day 3, budget summary)
 *
 * All conversions use USD as the common base currency.
 * RATES_FROM_USD is the static fallback — Week 6 Day 2 adds live fetch.
 */

// ─────────────────────────────────────────────────────────────
// STATIC RATES (USD base)
// ─────────────────────────────────────────────────────────────

/**
 * Approximate mid-market rates relative to 1 USD.
 * Used as a fallback when live rates are unavailable (Day 2).
 * Keep this in sync with whatever the live API returns so the
 * fallback is as close to reality as possible.
 */
export const RATES_FROM_USD: Record<string, number> = {
    USD: 1,
    SGD: 1.35,
    JPY: 149,
    THB: 35,
    MYR: 4.7,
    IDR: 15700,
    PHP: 56,
    VND: 25000,
    KRW: 1320,
    AUD: 1.53,
    NZD: 1.63,
    GBP: 0.79,
    EUR: 0.92,
    CHF: 0.88,
    CAD: 1.36,
    HKD: 7.82,
    TWD: 31.5,
    INR: 83,
    AED: 3.67,
    SAR: 3.75,
    TRY: 32,
    ZAR: 18.5,
  };
  
  // ─────────────────────────────────────────────────────────────
  // CURRENCY LABELS
  // ─────────────────────────────────────────────────────────────
  
  /** Human-readable labels for currency select dropdowns. */
  export const CURRENCY_LABELS: Record<string, string> = {
    USD: 'USD — US Dollar',
    SGD: 'SGD — Singapore Dollar',
    JPY: 'JPY — Japanese Yen',
    THB: 'THB — Thai Baht',
    MYR: 'MYR — Malaysian Ringgit',
    IDR: 'IDR — Indonesian Rupiah',
    PHP: 'PHP — Philippine Peso',
    VND: 'VND — Vietnamese Dong',
    KRW: 'KRW — South Korean Won',
    AUD: 'AUD — Australian Dollar',
    NZD: 'NZD — New Zealand Dollar',
    GBP: 'GBP — British Pound',
    EUR: 'EUR — Euro',
    CHF: 'CHF — Swiss Franc',
    CAD: 'CAD — Canadian Dollar',
    HKD: 'HKD — Hong Kong Dollar',
    TWD: 'TWD — Taiwan Dollar',
    INR: 'INR — Indian Rupee',
    AED: 'AED — UAE Dirham',
    SAR: 'SAR — Saudi Riyal',
    TRY: 'TRY — Turkish Lira',
    ZAR: 'ZAR — South African Rand',
  };
  
  // ─────────────────────────────────────────────────────────────
  // CONVERSION FUNCTIONS
  // ─────────────────────────────────────────────────────────────
  
  /**
   * Convert an amount between two arbitrary currencies.
   * Converts via USD as the common intermediate base.
   *
   * Example: convert(5000, 'JPY', 'SGD')
   *   → 5000 / 149 = $33.56 USD → $33.56 * 1.35 = 45.31 SGD
   *
   * @param rates - Optional custom rate table (used by Day 2 live-rate fetch).
   *                Falls back to the static RATES_FROM_USD if not provided.
   */
  export function convert(
    amount: number,
    from: string,
    to: string,
    rates: Record<string, number> = RATES_FROM_USD,
  ): number {
    const fromRate = rates[from] ?? 1;
    const toRate   = rates[to]   ?? 1;
    return (amount / fromRate) * toRate;
  }
  
  /**
   * Normalise any amount to its USD equivalent.
   * Used by ExpenseTracker to sum mixed-currency expenses correctly.
   *
   * Example: convertToUSD(5000, 'JPY') → ~33.56
   *
   * @param rates - Optional live rate table (Day 2). Falls back to static.
   */
  export function convertToUSD(
    amount: number,
    fromCurrency: string,
    rates: Record<string, number> = RATES_FROM_USD,
  ): number {
    const fromRate = rates[fromCurrency] ?? 1;
    return amount / fromRate;
  }
  
  /**
   * Convert a USD amount to any target currency.
   * Inverse of convertToUSD — used when displaying normalised totals
   * back in the user's preferred currency.
   *
   * Example: convertFromUSD(33.56, 'SGD') → ~45.31
   *
   * @param rates - Optional live rate table (Day 2). Falls back to static.
   */
  export function convertFromUSD(
    amountUSD: number,
    toCurrency: string,
    rates: Record<string, number> = RATES_FROM_USD,
  ): number {
    const toRate = rates[toCurrency] ?? 1;
    return amountUSD * toRate;
  }
  
  // ─────────────────────────────────────────────────────────────
  // DESTINATION → CURRENCY GUESSER
  // ─────────────────────────────────────────────────────────────
  
  /**
   * Infer the most likely local currency from a trip destination string.
   * Used by the currency converter to pre-select the "To" currency.
   * Falls back to 'USD' for any unrecognised destination.
   */
  export function guessCurrency(destination: string): string {
    const d = destination.toLowerCase();
    if (/japan|tokyo|osaka|kyoto|sapporo/.test(d))            return 'JPY';
    if (/korea|seoul|busan/.test(d))                           return 'KRW';
    if (/thailand|bangkok|phuket|chiang mai/.test(d))          return 'THB';
    if (/malaysia|kuala lumpur|penang|kota/.test(d))           return 'MYR';
    if (/indonesia|bali|jakarta|lombok/.test(d))               return 'IDR';
    if (/philippines|manila|cebu|palawan/.test(d))             return 'PHP';
    if (/vietnam|hanoi|ho chi minh|saigon|danang/.test(d))    return 'VND';
    if (/australia|sydney|melbourne|brisbane|perth/.test(d))  return 'AUD';
    if (/new zealand|auckland|queenstown/.test(d))             return 'NZD';
    if (/uk|united kingdom|london|england|scotland/.test(d))  return 'GBP';
    if (/france|paris|nice|lyon/.test(d))                      return 'EUR';
    if (/germany|berlin|munich|frankfurt/.test(d))             return 'EUR';
    if (/italy|rome|milan|venice|florence/.test(d))            return 'EUR';
    if (/spain|madrid|barcelona|seville/.test(d))              return 'EUR';
    if (/switzerland|zurich|geneva|bern/.test(d))              return 'CHF';
    if (/canada|toronto|vancouver|montreal/.test(d))           return 'CAD';
    if (/usa|united states|new york|los angeles|chicago|miami/.test(d)) return 'USD';
    if (/india|mumbai|delhi|bangalore|goa/.test(d))            return 'INR';
    if (/uae|dubai|abu dhabi/.test(d))                         return 'AED';
    if (/hong kong/.test(d))                                   return 'HKD';
    if (/taiwan|taipei/.test(d))                               return 'TWD';
    if (/turkey|istanbul|ankara/.test(d))                      return 'TRY';
    if (/south africa|cape town|johannesburg/.test(d))         return 'ZAR';
    return 'USD'; // fallback
  }
  
  // ─────────────────────────────────────────────────────────────
  // FORMATTING
  // ─────────────────────────────────────────────────────────────
  
  /**
   * Format a number with locale-appropriate decimal places for display.
   * Zero-decimal currencies (JPY, KRW, IDR, VND) show no fraction digits.
   *
   * Example: formatAmount(5000, 'JPY')  → "5,000"
   * Example: formatAmount(45.31, 'SGD') → "45.31"
   */
  export function formatAmount(amount: number, currency: string): string {
    const noDecimals = ['JPY', 'KRW', 'IDR', 'VND'];
    return amount.toLocaleString('en-US', {
      minimumFractionDigits: noDecimals.includes(currency) ? 0 : 2,
      maximumFractionDigits: noDecimals.includes(currency) ? 0 : 2,
    });
  }