import {requireUser,rate,dbResult,accountState} from '@/server/cloud.mjs';
import {json,failure,body} from '@/server/http.mjs';
import countries from '@/lib/countries.json';
import {AppError} from '@/server/quotes.mjs';
export async function POST(request:Request){try{const {db,user}=await requireUser(request);await rate(db,'account:'+user.id,10);const input=await body(request);if(input.country!==null&&!countries.some(c=>c.code===input.country))throw new AppError('Choose a country from the list.');dbResult(await db.rpc('wl_country',{p_user:user.id,p_country:input.country}));return json(await accountState(db,user));}catch(e){return failure(e);}}
