import {AppError} from './quotes.mjs';
import {origin} from './cloud.mjs';
export const json=(data,status=200,extra)=>Response.json(data,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer',...extra||{}}});
export const publicJson=(data,seconds=30)=>json(data,200,{'Cache-Control':`public, max-age=0, s-maxage=${seconds}, stale-while-revalidate=${Math.max(60,seconds*2)}`});
export function failure(e){if(e instanceof AppError)return json({error:e.message},e.status);console.error('Request failed:',e?.message);return json({error:'Something went wrong. Please try again.'},500);}
const buckets=new Map();
export function publicRate(request,key,limit=80,seconds=60){
  const ip=request.headers.get('cf-connecting-ip')||request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()||'local';
  const id=key+':'+ip;const now=Date.now();const row=buckets.get(id)||{at:now,n:0};
  if(now-row.at>seconds*1000){row.at=now;row.n=0;}
  row.n+=1;buckets.set(id,row);if(buckets.size>4000)buckets.delete(buckets.keys().next().value);
  if(row.n>limit)throw new AppError('Too many market requests. Please wait a minute.',429);
}
export async function body(request,max=16384){
  const source=request.headers.get('origin');
  if((source&&source!==origin())||request.headers.get('sec-fetch-site')==='cross-site')throw new AppError('Cross-site requests are not allowed.',403);
  if(!request.headers.get('content-type')?.startsWith('application/json'))throw new AppError('Send JSON data.',415);
  const reader=request.body?.getReader();if(!reader)throw new AppError('Missing request data.');
  let size=0;const chunks=[];while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>max){await reader.cancel();throw new AppError('Request too large.',413);}chunks.push(value);}
  try{return JSON.parse(Buffer.concat(chunks).toString('utf8'));}catch{throw new AppError('Invalid JSON.');}
}
