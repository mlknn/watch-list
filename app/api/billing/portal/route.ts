import {requireUser,rate} from '@/server/cloud.mjs';
import {body,json,failure} from '@/server/http.mjs';
import {portal} from '@/server/billing.mjs';
export async function POST(request:Request){try{await body(request);const {db,user}=await requireUser(request);await rate(db,'portal:'+user.id,10);return json(await portal(db,user));}catch(e){return failure(e);}}
