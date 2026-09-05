import {stripeClient,syncBilling} from '@/server/billing.mjs';
import {database,dbResult} from '@/server/cloud.mjs';
import {json,failure} from '@/server/http.mjs';
export async function POST(request:Request){
  if(!process.env.STRIPE_WEBHOOK_SECRET)return json({error:'Webhook is not configured.'},503);
  const signature=request.headers.get('stripe-signature');if(!signature)return json({error:'Missing signature.'},400);
  const reader=request.body?.getReader();if(!reader)return json({error:'Missing body.'},400);
  let size=0;const chunks:Uint8Array[]=[];
  while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>1048576){await reader.cancel();return json({error:'Payload too large.'},413);}chunks.push(value);}
  let event;
  try{event=await stripeClient().webhooks.constructEventAsync(Buffer.concat(chunks).toString('utf8'),signature,process.env.STRIPE_WEBHOOK_SECRET);}catch{return json({error:'Invalid webhook signature.'},400);}
  if(event.livemode!==process.env.STRIPE_SECRET_KEY?.startsWith('sk_live_'))return json({error:'Wrong billing environment.'},400);
  const supported=['checkout.session.completed','customer.subscription.created','customer.subscription.updated','customer.subscription.deleted','invoice.paid','invoice.payment_failed'];
  if(!supported.includes(event.type))return json({received:true});
  try{
    const db=database();const seen=dbResult(await db.from('wl_stripe_events').select('id').eq('id',event.id).maybeSingle());if(seen)return json({received:true});
    const object=event.data.object as {customer?:string|{id:string}};
    const customer=typeof object.customer==='string'?object.customer:object.customer?.id;
    if(customer)await syncBilling(db,customer,event.id);
    return json({received:true});
  }catch(e){return failure(e);}
}
