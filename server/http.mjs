import {AppError} from './quotes.mjs';
import {origin} from './cloud.mjs';
export const json=(data,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer'}});
export function failure(e){if(e instanceof AppError)return json({error:e.message},e.status);console.error('Request failed:',e?.message);return json({error:'Something went wrong. Please try again.'},500);}
export async function body(request,max=16384){
  const source=request.headers.get('origin');
  if((source&&source!==origin())||request.headers.get('sec-fetch-site')==='cross-site')throw new AppError('Cross-site requests are not allowed.',403);
  if(!request.headers.get('content-type')?.startsWith('application/json'))throw new AppError('Send JSON data.',415);
  const reader=request.body?.getReader();if(!reader)throw new AppError('Missing request data.');
  let size=0;const chunks=[];while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>max){await reader.cancel();throw new AppError('Request too large.',413);}chunks.push(value);}
  try{return JSON.parse(Buffer.concat(chunks).toString('utf8'));}catch{throw new AppError('Invalid JSON.');}
}
