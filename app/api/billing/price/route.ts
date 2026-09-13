import {proPrice} from '@/server/billing.mjs';
import {json,failure,publicRate} from '@/server/http.mjs';
export async function GET(request:Request){try{publicRate(request,'price',40,60);return json(await proPrice(new URL(request.url).searchParams.get('cycle')||'monthly'));}catch(e){return failure(e);}}
