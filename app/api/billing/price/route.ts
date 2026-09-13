import {proPrice} from '@/server/billing.mjs';
import {failure,publicRate,publicJson} from '@/server/http.mjs';
export async function GET(request:Request){try{publicRate(request,'price',40,60);return publicJson(await proPrice(new URL(request.url).searchParams.get('cycle')||'monthly'),300);}catch(e){return failure(e);}}
