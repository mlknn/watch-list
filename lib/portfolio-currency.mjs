export const PORTFOLIO_CURRENCIES = ['USD', 'EUR', 'CAD', 'TRY'];
export const SUPPORTED_MARKETS = 'US (USD), Europe (EUR), Canada (CAD), and Turkey (TRY)';
const EUR_SUFFIXES = ['.PA', '.DE', '.AS', '.MI', '.MC', '.BR', '.HE', '.LS', '.IR', '.AT', '.F', '.BE', '.VI'];
const CAD_SUFFIXES = ['.TO', '.V', '.CN', '.NE'];

export function tradingTimezone(currency) {
  return {USD: 'America/New_York', EUR: 'Europe/Paris', CAD: 'America/Toronto', TRY: 'Europe/Istanbul'}[currency] || 'UTC';
}

export function listCurrency(stocks) {
  const currencies = [...new Set((stocks || []).map(s => s.currency).filter(Boolean))];
  if (currencies.length > 1) throw new Error('A list can hold only one currency.');
  return currencies[0] || null;
}

export function assertQuoteCurrency(quoteCurrency, stocks) {
  const currency = String(quoteCurrency || '').toUpperCase();
  if (!PORTFOLIO_CURRENCIES.includes(currency)) {
    throw new Error(`Portfolios support ${SUPPORTED_MARKETS} stocks.`);
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
  if (currency === 'CAD') return CAD_SUFFIXES.some(suffix => value.endsWith(suffix));
  if (currency === 'USD') return !value.includes('.') || value.endsWith('.US');
  return true;
}
