import {requireUser,rate,accountState,accountAction} from '@/server/cloud.mjs';
import {json,failure,body} from '@/server/http.mjs';
export const dynamic='force-dynamic';
export async function GET(request:Request){try{const {db,user}=await requireUser(request);await rate(db,'read:'+user.id,90);return json(await accountState(db,user));}catch(e){return failure(e);}}
export async function POST(request:Request){try{const {db,user}=await requireUser(request);await rate(db,'write:'+user.id,30);return json(await accountAction(db,user,await body(request)));}catch(e){return failure(e);}}
