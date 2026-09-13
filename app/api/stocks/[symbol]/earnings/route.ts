import {earningsForRequest} from '@/server/earnings.mjs';
import {json,failure,publicRate} from '@/server/http.mjs';
export async function GET(request:Request,{params}:{params:Promise<{symbol:string}>}){try{publicRate(request,'earnings',40,60);return json(await earningsForRequest(request,(await params).symbol));}catch(e){return failure(e);}}
