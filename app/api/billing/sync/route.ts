import {requireUser,rate,dbResult,accountState} from '@/server/cloud.mjs';
import {body,json,failure} from '@/server/http.mjs';
import {syncBilling} from '@/server/billing.mjs';
export async function POST(request:Request){try{await body(request);const {db,user}=await requireUser(request);await rate(db,'billing-sync:'+user.id,5);const profile=dbResult(await db.from('wl_profiles').select('stripe_customer_id').eq('id',user.id).single());if(profile.stripe_customer_id)await syncBilling(db,profile.stripe_customer_id);return json(await accountState(db,user));}catch(e){return failure(e);}}
