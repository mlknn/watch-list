import {requireStockAccess} from '@/server/stock-access.mjs';
import {getChart} from '@/server/charts.mjs';
import {json,failure} from '@/server/http.mjs';
export async function GET(request:Request,{params}:{params:Promise<{symbol:string}>}){try{const {symbol}=await requireStockAccess(request,(await params).symbol);return json(await getChart(symbol,new URL(request.url).searchParams.get('range')||'1d'));}catch(e){return failure(e);}}
