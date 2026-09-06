import {earningsForRequest} from '@/server/earnings.mjs';
import {json,failure} from '@/server/http.mjs';
export async function GET(request:Request,{params}:{params:Promise<{symbol:string}>}){try{return json(await earningsForRequest(request,(await params).symbol));}catch(e){return failure(e);}}
