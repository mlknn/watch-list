import {localAuth} from '@/server/local-auth.mjs';
import {body,json,failure} from '@/server/http.mjs';
export async function POST(request:Request){try{const result=await localAuth(request,await body(request));const response=json(result.payload);if(result.cookie)response.headers.set('Set-Cookie',result.cookie);return response;}catch(e){return failure(e);}}
