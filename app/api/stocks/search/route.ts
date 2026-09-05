import {json} from '@/server/http.mjs';

const normalizeSuggestion = (item: any) => {
  const symbol = typeof item?.symbol === 'string' ? item.symbol.trim().toUpperCase() : '';
  const name = typeof item?.longname === 'string'
    ? item.longname
    : typeof item?.shortname === 'string'
      ? item.shortname
      : typeof item?.name === 'string'
        ? item.name
        : '';

  if (!symbol || !name) return null;

  return { symbol, name };
};

export async function GET(request: Request) {
  const url = new URL(request.url);
  const query = (url.searchParams.get('q') || '').trim();
  const limit = Number(url.searchParams.get('limit') || '8');

  if (!query) return json([]);

  try {
    const endpoint = new URL('https://query1.finance.yahoo.com/v1/finance/search');
    endpoint.searchParams.set('q', query);
    endpoint.searchParams.set('quotesCount', String(Math.max(5, Math.min(limit || 8, 10))));
    endpoint.searchParams.set('newsCount', '0');
    endpoint.searchParams.set('enableFuzzyQuery', 'true');
    endpoint.searchParams.set('quotesQueryId', 'tickers');

    const response = await fetch(endpoint, {
      headers: { 'User-Agent': 'Mozilla/5.0', Accept: 'application/json' },
      signal: AbortSignal.timeout(8000),
    });

    if (!response.ok) return json([]);

    const payload = await response.json();
    const suggestions = Array.isArray(payload?.quotes)
      ? payload.quotes
          .map(normalizeSuggestion)
          .filter(Boolean)
          .filter((item: any) => !/\s+\b(ETF|Index|Fund|Trust)\b/i.test(item.name))
          .slice(0, Math.max(1, limit || 8))
      : [];

    return json(suggestions);
  } catch {
    return json([]);
  }
}
