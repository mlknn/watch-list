export const PORTFOLIO_CURRENCIES = ['USD', 'EUR', 'TRY'];
const EUR_SUFFIXES = ['.PA', '.DE', '.AS', '.MI', '.MC', '.BR', '.HE', '.LS', '.IR', '.AT', '.F', '.BE', '.VI'];

export function tradingTimezone(currency) {
  return {USD: 'America/New_York', EUR: 'Europe/Paris', TRY: 'Europe/Istanbul'}[currency] || 'UTC';
}

export function listCurrency(stocks) {
  const currencies = [...new Set((stocks || []).map(s => s.currency).filter(Boolean))];
  if (currencies.length > 1) throw new Error('A list can hold only one currency.');
  return currencies[0] || null;
}

export function assertQuoteCurrency(quoteCurrency, stocks) {
  const currency = String(quoteCurrency || '').toUpperCase();
  if (!PORTFOLIO_CURRENCIES.includes(currency)) {
    throw new Error('Portfolios support US (USD), Europe (EUR), and Turkey (TRY) stocks.');
  }
  const locked = listCurrency(stocks);
  if (locked && locked !== currency) {
    throw new Error(`This list is ${locked} only. Start a new list for ${currency} stocks.`);
  }
  return currency;
}

export function tickerFitsCurrency(symbol, currency) {
  if (!currency) return true;
  const value = String(symbol || '').toUpperCase();
  if (currency === 'TRY') return value.endsWith('.IS');
  if (currency === 'EUR') return EUR_SUFFIXES.some(suffix => value.endsWith(suffix));
  if (currency === 'USD') return !value.includes('.') || value.endsWith('.US');
  return true;
}
