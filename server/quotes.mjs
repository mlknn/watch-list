export class AppError extends Error {
  constructor(message, status = 400) { super(message); this.status = status; }
}
export function normalizeTicker(value) {
  if (typeof value !== 'string') throw new AppError('Enter a stock ticker.');
  const symbol = value.trim().toUpperCase();
  if (!/^[A-Z0-9^][A-Z0-9.^=-]{0,24}$/.test(symbol)) throw new AppError('Use a ticker such as AAPL, BRK-B, or VOD.L.');
  return symbol;
}
const cache = new Map();
const pending = new Map();
export async function getQuote(value) {
  const symbol = normalizeTicker(value);
  const cached = cache.get(symbol);
  if (cached && Date.now() - cached.fetchedAt < 30_000) return cached.quote;
  if (pending.has(symbol)) return pending.get(symbol);
  const operation = (async () => {
    let lastError;
    for (const host of ['query2.finance.yahoo.com', 'query1.finance.yahoo.com']) {
      try {
        const response = await fetch(`https://${host}/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=1d`, {
          headers: { 'User-Agent': 'Mozilla/5.0', Accept: 'application/json' }, signal: AbortSignal.timeout(8000),
        });
        if (response.status === 404) throw new AppError(`Ticker “${symbol}” was not found. Check the symbol and exchange suffix.`, 404);
        if (!response.ok) throw new AppError('The quote provider is temporarily unavailable. Please try again shortly.', 502);
        const payload = await response.json();
        const meta = payload.chart?.result?.[0]?.meta;
        if (!meta || payload.chart?.error) throw new AppError(`No quote is available for ${symbol}.`, 404);
        if (!Number.isFinite(meta.regularMarketPrice) || meta.regularMarketPrice <= 0 || !Number.isFinite(meta.regularMarketTime) || !meta.currency || !(meta.longName || meta.shortName)) {
          throw new AppError(`The provider returned an incomplete quote for ${symbol}. Please try again later.`, 502);
        }
        const previousClose=Number.isFinite(meta.previousClose)?meta.previousClose:Number.isFinite(meta.chartPreviousClose)?meta.chartPreviousClose:null;
        const changePercent=Number.isFinite(meta.regularMarketChangePercent)?meta.regularMarketChangePercent:previousClose?((meta.regularMarketPrice-previousClose)/previousClose)*100:null;
        const quote = {
          symbol: normalizeTicker(meta.symbol || symbol), companyName: meta.longName || meta.shortName,
          currency: meta.currency, price: meta.regularMarketPrice, previousClose, changePercent,
          quoteTime: new Date(meta.regularMarketTime * 1000).toISOString(),
          checkedAt: new Date().toISOString(), exchange: meta.fullExchangeName || meta.exchangeName || '', source: 'Yahoo Finance',
        };
        cache.set(symbol, { quote, fetchedAt: Date.now() });
        if (cache.size > 1000) cache.delete(cache.keys().next().value);
        return quote;
      } catch (error) { lastError = error; if (error.status === 404) throw error; }
    }
    throw lastError instanceof AppError ? lastError : new AppError('Could not reach the quote provider. Check your internet connection and try again.', 502);
  })();
  pending.set(symbol, operation);
  try { return await operation; } finally { pending.delete(symbol); }
}
