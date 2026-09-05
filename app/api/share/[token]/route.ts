import {sharedState} from '@/server/cloud.mjs';
import {json,failure} from '@/server/http.mjs';
export async function GET(_request:Request,{params}:{params:Promise<{token:string}>}){try{return json(await sharedState((await params).token));}catch(e){return failure(e);}}
