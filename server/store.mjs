import { mkdir, readFile, open, rename, copyFile, unlink } from 'node:fs/promises';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { AppError, normalizeTicker, getQuote } from './quotes.mjs';

function validState(state) {
  const date = value => typeof value === 'string' && Number.isFinite(Date.parse(value));
  const positive = value => Number.isFinite(value) && value > 0;
  return state?.version === 1 && date(state.updatedAt) && Array.isArray(state.watchlists) && state.watchlists.length > 0 &&
    new Set(state.watchlists.map(l => l.id)).size === state.watchlists.length &&
    state.watchlists.every(list => typeof list.id === 'string' && typeof list.name === 'string' && list.name.trim() && date(list.createdAt) && Array.isArray(list.stocks) &&
      new Set(list.stocks.map(s => s.symbol)).size === list.stocks.length &&
      list.stocks.every(s => typeof s.id === 'string' && typeof s.symbol === 'string' && typeof s.companyName === 'string' && typeof s.currency === 'string' &&
        positive(s.addedPrice) && positive(s.currentPrice) && date(s.addedAt) && date(s.initialQuoteTime) && date(s.quoteTime) && date(s.checkedAt)));
}
function listName(value) {
  if (typeof value !== 'string' || !value.trim() || value.trim().length > 60) throw new AppError('Give the watchlist a name between 1 and 60 characters.');
  return value.trim();
}
export function createStore({ directory, quote = getQuote }) {
  const file = join(directory, 'watchlists.json');
  let queue = Promise.resolve();
  let refreshing = null;
  const serial = action => { const next = queue.then(action); queue = next.catch(() => {}); return next; };
  async function save(state, backup = true) {
    if (!validState(state)) throw new AppError('Watchlist data could not be validated. Nothing was saved.', 500);
    await mkdir(directory, { recursive: true, mode: 0o700 });
    const temp = `${file}.${randomUUID()}.tmp`;
    try {
      const handle = await open(temp, 'wx', 0o600);
      try { await handle.writeFile(JSON.stringify(state, null, 2) + '\n'); await handle.sync(); } finally { await handle.close(); }
      if (backup) { try { await copyFile(file, `${file}.bak`); } catch (e) { if (e.code !== 'ENOENT') throw e; } }
      await rename(temp, file);
    } finally { await unlink(temp).catch(() => {}); }
  }
  async function load() {
    let raw;
    try { raw = await readFile(file, 'utf8'); }
    catch (error) {
      if (error.code !== 'ENOENT') throw error;
      const now = new Date().toISOString();
      const state = { version: 1, updatedAt: now, watchlists: [{ id: randomUUID(), name: 'My watchlist', createdAt: now, stocks: [] }] };
      await save(state, false); return state;
    }
    let state;
    try { state = JSON.parse(raw); } catch { throw new AppError('The saved JSON file is damaged. Restore data/watchlists.json.bak before continuing. Your files have been preserved.', 500); }
    if (!validState(state)) throw new AppError('The saved JSON file has an unsupported structure. Your files have been preserved.', 500);
    return state;
  }
  const read = () => serial(load);
  const mutate = operation => serial(async () => {
    const state = await load(); await operation(state); state.updatedAt = new Date().toISOString(); await save(state); return state;
  });
  function findList(state, id) { const list = state.watchlists.find(l => l.id === id); if (!list) throw new AppError('This watchlist no longer exists. Reload and try again.', 404); return list; }
  async function action(input) {
    if (!input || typeof input !== 'object' || Array.isArray(input)) throw new AppError('Invalid request.');
    switch (input.action) {
      case 'createList': return mutate(state => {
        const name = listName(input.name);
        if (state.watchlists.length >= 50) throw new AppError('You can create up to 50 watchlists.');
        if (state.watchlists.some(l => l.name.toLowerCase() === name.toLowerCase())) throw new AppError('A watchlist with that name already exists.', 409);
        state.watchlists.push({ id: randomUUID(), name, createdAt: new Date().toISOString(), stocks: [] });
      });
      case 'renameList': return mutate(state => {
        const list = findList(state, input.listId); const name = listName(input.name);
        if (state.watchlists.some(l => l.id !== list.id && l.name.toLowerCase() === name.toLowerCase())) throw new AppError('A watchlist with that name already exists.', 409);
        list.name = name;
      });
      case 'deleteList': return mutate(state => {
        findList(state, input.listId);
        if (state.watchlists.length === 1) throw new AppError('Keep at least one watchlist. You can remove its stocks instead.');
        state.watchlists = state.watchlists.filter(l => l.id !== input.listId);
      });
      case 'addStock': {
        const symbol = normalizeTicker(input.ticker);
        const list = findList(await read(), input.listId);
        if (list.stocks.some(s => s.symbol === symbol)) throw new AppError(`${symbol} is already in this watchlist.`, 409);
        const latest = await quote(symbol);
        return mutate(state => {
          const target = findList(state, input.listId);
          if (target.stocks.some(s => s.symbol === latest.symbol)) throw new AppError(`${latest.symbol} is already in this watchlist.`, 409);
          if (target.stocks.length >= 100) throw new AppError('You can add up to 100 stocks to a watchlist.');
          target.stocks.push({ id: randomUUID(), symbol: latest.symbol, companyName: latest.companyName, currency: latest.currency,
            exchange: latest.exchange, addedAt: new Date().toISOString(), addedPrice: latest.price, initialQuoteTime: latest.quoteTime,
            currentPrice: latest.price, quoteTime: latest.quoteTime, checkedAt: latest.checkedAt, source: latest.source, quoteError: null });
        });
      }
      case 'removeStock': return mutate(state => {
        const list = findList(state, input.listId);
        if (!list.stocks.some(s => s.id === input.stockId)) throw new AppError('This stock is no longer in the watchlist.', 404);
        list.stocks = list.stocks.filter(s => s.id !== input.stockId);
      });
      case 'refresh': {
        if (refreshing) return refreshing;
        refreshing = (async () => {
          const snapshot = await read();
          const symbols = [...new Set(snapshot.watchlists.flatMap(l => l.stocks.map(s => s.symbol)))];
          if (!symbols.length) return snapshot;
          const results = new Map();
          let index = 0;
          await Promise.all(Array.from({ length: Math.min(4, symbols.length) }, async () => {
            while (index < symbols.length) {
              const symbol = symbols[index++];
              try { results.set(symbol, { quote: await quote(symbol) }); }
              catch (error) { results.set(symbol, { error: error.message || 'Quote unavailable.' }); }
            }
          }));
          return mutate(state => {
            for (const list of state.watchlists) for (const stock of list.stocks) {
              const result = results.get(stock.symbol); if (!result) continue;
              if (result.error) { stock.quoteError = result.error; continue; }
              const next = result.quote;
              if (next.currency !== stock.currency) { stock.quoteError = 'The quote currency changed. The previous price was kept.'; continue; }
              if (Date.parse(next.quoteTime) < Date.parse(stock.quoteTime)) continue;
              stock.currentPrice = next.price; stock.quoteTime = next.quoteTime; stock.checkedAt = next.checkedAt; stock.quoteError = null;
            }
          });
        })();
        try { return await refreshing; } finally { refreshing = null; }
      }
      default: throw new AppError('Unknown watchlist action.');
    }
  }
  return { read, action, file };
}
