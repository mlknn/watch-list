export const PORTFOLIO_CURRENCIES = ['USD', 'EUR', 'CAD', 'TRY'];
export const SUPPORTED_MARKETS = 'US (USD), Europe (EUR), Canada (CAD), and Turkey (TRY)';
export const MARKET_NAMES = {USD: 'US (USD)', EUR: 'Europe (EUR)', CAD: 'Canada (CAD)', TRY: 'Turkey (TRY)'};
const EUR_SUFFIXES = ['.PA', '.DE', '.AS', '.MI', '.MC', '.BR', '.HE', '.LS', '.IR', '.AT', '.F', '.BE', '.VI'];
const CAD_SUFFIXES = ['.TO', '.V', '.CN', '.NE'];
const MISMATCH = /^This list is ([A-Z]{3}) only\. Start a new list for ([A-Z]{3}) stocks\.$/;

export function tradingTimezone(currency) {
  return {USD: 'America/New_York', EUR: 'Europe/Paris', CAD: 'America/Toronto', TRY: 'Europe/Istanbul'}[currency] || 'UTC';
}

export function listCurrency(stocks) {
  const currencies = [...new Set((stocks || []).map(s => s.currency).filter(Boolean))];
  if (currencies.length > 1) throw new Error('A list can hold only one currency.');
  return currencies[0] || null;
}

export function mismatchError(listCurrency, stockCurrency) {
  return new Error(`This list is ${listCurrency} only. Start a new list for ${stockCurrency} stocks.`);
}

export function parseCurrencyMismatch(message) {
  const match = String(message || '').match(MISMATCH);
  return match ? {list: match[1], stock: match[2]} : null;
}

export function marketForTicker(symbol) {
  const value = String(symbol || '').toUpperCase();
  if (!value) return null;
  if (value.endsWith('.IS')) return 'TRY';
  if (EUR_SUFFIXES.some(suffix => value.endsWith(suffix))) return 'EUR';
  if (CAD_SUFFIXES.some(suffix => value.endsWith(suffix))) return 'CAD';
  if (!value.includes('.') || value.endsWith('.US')) return 'USD';
  return null;
}

export function assertQuoteCurrency(quoteCurrency, stocks) {
  const currency = String(quoteCurrency || '').toUpperCase();
  if (!PORTFOLIO_CURRENCIES.includes(currency)) {
    throw new Error(`Portfolios support ${SUPPORTED_MARKETS} stocks.`);
  }
  const locked = listCurrency(stocks);
  if (locked && locked !== currency) throw mismatchError(locked, currency);
  return currency;
}

export function tickerFitsCurrency(symbol, currency) {
  if (!currency) return true;
  const value = String(symbol || '').toUpperCase();
  if (currency === 'TRY') return value.endsWith('.IS');
  if (currency === 'EUR') return EUR_SUFFIXES.some(suffix => value.endsWith(suffix));
  if (currency === 'CAD') return CAD_SUFFIXES.some(suffix => value.endsWith(suffix));
  if (currency === 'USD') return !value.includes('.') || value.endsWith('.US');
  return true;
}
