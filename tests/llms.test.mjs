import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const brief=readFileSync(new URL('../public/llms.txt',import.meta.url),'utf8');

test('llms.txt tells assistants about watchlists, markets, and earnings',()=>{
  assert.match(brief,/https:\/\/stockwatchlist\.app\/watchlists/);
  assert.match(brief,/https:\/\/stockwatchlist\.app\/dashboard/);
  assert.match(brief,/https:\/\/stockwatchlist\.app\/earnings/);
  assert.match(brief,/Markets/i);
  assert.match(brief,/earnings calendar/i);
  assert.match(brief,/Global/i);
  assert.match(brief,/crypto/i);
  assert.match(brief,/Nasdaq/i);
  assert.match(brief,/No account/i);
});
