import {sharedState} from '@/server/cloud.mjs';
import {failure,publicRate,publicJson} from '@/server/http.mjs';
export async function GET(request:Request,{params}:{params:Promise<{token:string}>}){try{publicRate(request,'share',60,60);return publicJson(await sharedState((await params).token),15);}catch(e){return failure(e);}}
