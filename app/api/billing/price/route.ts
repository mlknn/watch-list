import {proPrice} from '@/server/billing.mjs';
import {json,failure} from '@/server/http.mjs';
export async function GET(request:Request){try{return json(await proPrice(new URL(request.url).searchParams.get('cycle')||'monthly'));}catch(e){return failure(e);}}
