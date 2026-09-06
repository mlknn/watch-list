import {requireStockAccess} from '@/server/stock-access.mjs';
import {getFundamentals} from '@/server/fundamentals.mjs';
import {json,failure} from '@/server/http.mjs';
export async function GET(request:Request,{params}:{params:Promise<{symbol:string}>}){try{const {symbol}=await requireStockAccess(request,(await params).symbol);return json(await getFundamentals(symbol));}catch(e){return failure(e);}}
