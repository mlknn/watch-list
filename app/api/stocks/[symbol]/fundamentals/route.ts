import {getFundamentals} from '@/server/fundamentals.mjs';
import {json,failure} from '@/server/http.mjs';
export async function GET(_request:Request,{params}:{params:Promise<{symbol:string}>}){try{return json(await getFundamentals((await params).symbol));}catch(e){return failure(e);}}
