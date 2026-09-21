import test from 'node:test';
import assert from 'node:assert/strict';
import {addDays,earningsShareCard,isoDay,mondayOnOrBefore,nextEarningsSoon,nextEarningsTone,todayInMarket} from '../lib/next-earnings.mjs';

test('isoDay keeps a calendar day and drops clock noise',()=>{
  assert.equal(isoDay('2026-09-21T16:00:00.000Z'),'2026-09-21');
  assert.equal(isoDay('not-a-date'),'');
});

test('weeks start Monday',()=>{
  assert.equal(mondayOnOrBefore('2026-09-18'),'2026-09-14');
  assert.equal(mondayOnOrBefore('2026-09-21'),'2026-09-21');
  assert.equal(addDays('2026-09-14',7),'2026-09-21');
});

test('today and later this week are a warning',()=>{
  assert.equal(nextEarningsTone('2026-09-18','2026-09-18'),'today');
  assert.equal(nextEarningsTone('2026-09-19','2026-09-17'),'this-week');
  assert.equal(nextEarningsSoon('today'),true);
  assert.equal(nextEarningsSoon('this-week'),true);
});

test('Friday Saturday Sunday warn for next week, earlier weekdays do not',()=>{
  assert.equal(nextEarningsTone('2026-09-21','2026-09-18'),'next-week');
  assert.equal(nextEarningsTone('2026-09-21','2026-09-19'),'next-week');
  assert.equal(nextEarningsTone('2026-09-21','2026-09-20'),'next-week');
  assert.equal(nextEarningsTone('2026-09-21','2026-09-17'),'later');
  assert.equal(nextEarningsSoon('next-week'),true);
  assert.equal(nextEarningsSoon('later'),false);
});

test('past dates and far-ahead dates stay quiet',()=>{
  assert.equal(nextEarningsTone('2026-09-17','2026-09-18'),null);
  assert.equal(nextEarningsTone('2026-10-27','2026-09-18'),'later');
  assert.equal(nextEarningsTone('',todayInMarket(new Date('2026-09-18T16:00:00-04:00'))),null);
});

test('a shared earnings week link names earnings in the title and description',()=>{
  const week=earningsShareCard('2026-10-14');
  assert.equal(week.url,'https://stockwatchlist.app/earnings?week=2026-10-12');
  assert.equal(week.title,'Earnings week of Oct 12, 2026');
  assert.equal(week.description,'US stocks reporting earnings October 12–16, 2026. One column per weekday on the earnings calendar.');
  const home=earningsShareCard('');
  assert.equal(home.url,'https://stockwatchlist.app/earnings');
  assert.equal(home.title,'Earnings calendar');
  assert.match(home.description,/earnings/i);
});
