import Stripe from 'stripe';
import {AppError} from './quotes.mjs';
import {dbResult,origin} from './cloud.mjs';
export function stripeClient(){if(!process.env.STRIPE_SECRET_KEY)throw new AppError('Billing is not available yet.',503);return new Stripe(process.env.STRIPE_SECRET_KEY,{httpClient:Stripe.createFetchHttpClient(),maxNetworkRetries:2});}
export function priceIdFor(cycle='monthly'){if(!['monthly','yearly'].includes(cycle))throw new AppError('Choose monthly or yearly billing.');return cycle==='yearly'?process.env.STRIPE_PRO_YEARLY_PRICE_ID:process.env.STRIPE_PRO_MONTHLY_PRICE_ID||process.env.STRIPE_PRO_PRICE_ID;}
export function billingReady(cycle='monthly'){return !!(process.env.STRIPE_SECRET_KEY&&priceIdFor(cycle)&&process.env.STRIPE_WEBHOOK_SECRET);}
export function validProPrice(price,cycle){return price.active&&price.type==='recurring'&&price.unit_amount===(cycle==='yearly'?3000:299)&&price.currency==='usd'&&price.recurring?.interval===(cycle==='yearly'?'year':'month')&&price.recurring?.interval_count===1;}
export function subscriptionEntitlement(subscriptions,priceId,now=Date.now()) {
  const paid=subscriptions.filter(s=>s.status==='active').flatMap(s=>s.items.data.filter(i=>(Array.isArray(priceId)?priceId:[priceId]).filter(Boolean).includes(i.price.id)&&Number(i.current_period_end || s.current_period_end)*1000>now).map(i=>({status:s.status,until:Number(i.current_period_end||s.current_period_end)*1000})));
  return paid.length?{status:'active',until:new Date(Math.max(...paid.map(p=>p.until))).toISOString()}:{status:'free',until:null};
}
/** @param {any} db @param {string} customer @param {string|null} eventId */
export async function syncBilling(db,customer,eventId=null){
  const profile=dbResult(await db.from('wl_profiles').select('id').eq('stripe_customer_id',customer).maybeSingle());
  if(!profile)return;
  const checked=new Date().toISOString();
  const stripe=stripeClient();
  const subscriptions=[];
  for await(const subscription of stripe.subscriptions.list({customer,status:'all',limit:100}))subscriptions.push(subscription);
  const entitlement=subscriptionEntitlement(subscriptions,[priceIdFor('monthly'),priceIdFor('yearly')]);
  dbResult(await db.rpc('wl_apply_billing',{p_user:profile.id,p_customer:customer,p_status:entitlement.status,p_until:entitlement.until,p_checked:checked,p_event:eventId}));
}
async function customerFor(db,user,stripe){
  const profile=dbResult(await db.from('wl_profiles').select('stripe_customer_id').eq('id',user.id).single());
  if(profile.stripe_customer_id)return profile.stripe_customer_id;
  const customer=await stripe.customers.create({email:user.email,metadata:{watchlist_user_id:user.id}},{idempotencyKey:'watchlist-customer-v1:'+user.id});
  dbResult(await db.from('wl_profiles').update({stripe_customer_id:customer.id}).eq('id',user.id).is('stripe_customer_id',null));
  return dbResult(await db.from('wl_profiles').select('stripe_customer_id').eq('id',user.id).single()).stripe_customer_id;
}
export async function checkout(db,user,cycle='monthly'){
  const priceId=priceIdFor(cycle);
  if(!billingReady(cycle))throw new AppError('Pro checkout is not available yet.',503);
  await proPrice(cycle);
  const stripe=stripeClient();const customer=await customerFor(db,user,stripe);
  await syncBilling(db,customer);
  const profile=dbResult(await db.from('wl_profiles').select('*').eq('id',user.id).single());
  if(profile.subscription_status==='active'&&Date.parse(profile.pro_until)>Date.now())throw new AppError('You already have Pro. Manage your subscription in your account.',409);
  const existing=await stripe.checkout.sessions.list({customer,status:'open',limit:10});
  const open=existing.data.find(s=>s.mode==='subscription'&&s.metadata?.price_id===priceId&&s.url);
  if(open)return {url:open.url};
  const session=await stripe.checkout.sessions.create({mode:'subscription',customer,client_reference_id:user.id,line_items:[{price:priceId,quantity:1}],success_url:origin()+'/account?checkout=success',cancel_url:origin()+'/pricing?checkout=canceled',metadata:{price_id:priceId},subscription_data:{metadata:{watchlist_user_id:user.id}}},{idempotencyKey:`watchlist-checkout:${user.id}:${priceId}:${Math.floor(Date.now()/600000)}`});
  return {url:session.url};
}
export async function portal(db,user){
  const stripe=stripeClient();const profile=dbResult(await db.from('wl_profiles').select('stripe_customer_id').eq('id',user.id).single());
  if(!profile.stripe_customer_id)throw new AppError('You do not have a billing account yet.');
  return {url:(await stripe.billingPortal.sessions.create({customer:profile.stripe_customer_id,return_url:origin()+'/account'})).url};
}
export async function proPrice(cycle='monthly'){
 const id=priceIdFor(cycle),fallback={cycle,amount:cycle==='yearly'?3000:299,currency:'usd',interval:cycle==='yearly'?'year':'month',intervalCount:1};
 if(!billingReady(cycle))return {available:false,...fallback};
 const price=await stripeClient().prices.retrieve(id);
 if(!validProPrice(price,cycle))throw new AppError('Configured Stripe price does not match this billing plan.',503);
 return {available:true,...fallback};
}
