import {requireUser,rate} from '@/server/cloud.mjs';
import {body,json,failure} from '@/server/http.mjs';
import {checkout} from '@/server/billing.mjs';
export async function POST(request:Request){try{await body(request);const {db,user}=await requireUser(request);await rate(db,'checkout:'+user.id,5);return json(await checkout(db,user));}catch(e){return failure(e);}}
