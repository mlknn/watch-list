// Run once with LOCAL_AUTH_ENABLED=true to copy the original local lists into the seeded admin account.
import {readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {localPg,exportLocalData} from '../server/local-db.mjs';
import {seedLocalAdmin} from '../server/local-auth.mjs';
const root=process.env.LOCAL_DATA_DIR||'data';
await seedLocalAdmin();const pg=await localPg();
try {
 const seed=JSON.parse(await readFile(resolve(root,'bootstrap-admin.json'),'utf8'));
 const legacy=JSON.parse(await readFile(resolve(root,'watchlists.json'),'utf8'));
 const user=(await pg.query('select id from local_users where email=$1',[seed.email])).rows[0];
 if(!user)throw Error('Seeded local admin not found');
 await pg.transaction(async tx=>{
  for(const list of legacy.watchlists){
   let target=(await tx.query('select id from wl_watchlists where owner_id=$1 and lower(name)=lower($2)',[user.id,list.name])).rows[0];
   if(!target)target=(await tx.query('insert into wl_watchlists(owner_id,name) values($1,$2) returning id',[user.id,list.name])).rows[0];
   for(const s of list.stocks){const snapshot={symbol:s.symbol,companyName:s.companyName,currency:s.currency,exchange:s.exchange,price:s.addedPrice,quoteTime:s.initialQuoteTime,checkedAt:s.addedAt};await tx.query('insert into wl_stocks(watchlist_id,symbol,added_at,snapshot) values($1,$2,$3,$4) on conflict(watchlist_id,symbol) do nothing',[target.id,s.symbol,s.addedAt,JSON.stringify(snapshot)]);}
  }
 });await exportLocalData();console.log('Original watchlists copied, keeping their added dates and starting prices.');
} finally{await pg.close();}
