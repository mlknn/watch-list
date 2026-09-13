import {sharedState} from '@/server/cloud.mjs';
import {json,failure,publicRate} from '@/server/http.mjs';
export async function GET(request:Request,{params}:{params:Promise<{token:string}>}){try{publicRate(request,'share',60,60);return json(await sharedState((await params).token));}catch(e){return failure(e);}}
