import {getChart} from '@/server/charts.mjs';
import {json,failure} from '@/server/http.mjs';
export async function GET(request:Request,{params}:{params:Promise<{symbol:string}>}){try{return json(await getChart((await params).symbol,new URL(request.url).searchParams.get('range')||'1d'));}catch(e){return failure(e);}}
