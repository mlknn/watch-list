import test from 'node:test';
import assert from 'node:assert/strict';
import {earningsDay,upcomingEarnings,earningsCalendarFile} from '../lib/watchlist-earnings.mjs';

test('earnings agenda rejects invalid, past, and duplicate dates, keeping today',()=>{
  assert.equal(earningsDay('2026-02-30'),null);
  assert.equal(earningsDay('not a date'),null);
  assert.equal(earningsDay(undefined),null);
  assert.equal(earningsDay('2028-02-29T12:00:00Z'),'2028-02-29');
  assert.deepEqual(upcomingEarnings([
    {symbol:'MSFT',date:'2026-10-28T12:00:00Z'},
    {symbol:'AAPL',date:'2026-09-30'},
    {symbol:'AAPL',date:'2026-10-01'},
    {symbol:'OLD',date:'2026-09-29'},
    {symbol:'BAD',date:'2026-02-30'},
    {symbol:'NONE',date:null},
  ],'2026-09-30'),[{symbol:'AAPL',date:'2026-09-30'},{symbol:'MSFT',date:'2026-10-28'}]);
});

test('calendar uses exclusive end date, stable UID and an explicit tentative one-day reminder',()=>{
  const event={symbol:'AAPL',date:'2026-12-31',companyName:'Apple Inc.'};
  const text=earningsCalendarFile(event,new Date('2026-09-30T12:34:56Z'));
  assert.ok(text.includes('DTSTART;VALUE=DATE:20261231\r\nDTEND;VALUE=DATE:20270101'));
  assert.ok(text.includes('DTSTAMP:20260930T123456Z'));
  assert.ok(text.includes('UID:AAPL-2026-12-31@stockwatchlist.app'));
  assert.ok(text.includes('STATUS:TENTATIVE'));
  assert.ok(text.includes('TRIGGER:-P1D'));
  assert.ok(text.endsWith('END:VCALENDAR\r\n'));
  assert.throws(()=>earningsCalendarFile({...event,date:'2026-02-30'}));
  assert.throws(()=>earningsCalendarFile({...event,symbol:'AAPL\r\nBEGIN:VEVENT'}));
});

test('calendar escapes provider text and folds UTF-8 lines without breaking characters',()=>{
  const name='İstanbul, şirket; \\ test\nBEGIN:VEVENT '+ 'Ş'.repeat(100);
  const text=earningsCalendarFile({symbol:'THYAO.IS',date:'2026-10-01',companyName:name});
  for(const line of text.split('\r\n'))assert.ok(Buffer.byteLength(line)<=75);
  const unfolded=text.replace(/\r\n /g,'');
  assert.ok(unfolded.includes('İstanbul\\, şirket\\; \\\\ test\\nBEGIN:VEVENT'));
  assert.equal(text.split('\r\nBEGIN:VEVENT').length,2);
  assert.ok(!text.includes('\uFFFD'));
});
