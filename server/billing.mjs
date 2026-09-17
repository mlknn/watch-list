import Stripe from 'stripe';
import {AppError} from './quotes.mjs';
import {dbResult,origin} from './cloud.mjs';
const CHECKOUT_DESIGN='stockwatchlist-v2';
export function checkoutPresentation(cycle){
 return {
  branding_settings:{display_name:'StockWatchlist',background_color:'#f6f8fc',button_color:'#3559df',border_style:'rounded',font_family:'inter',icon:{type:'url',url:origin()+'/apple-touch-icon.png'}},
  custom_text:{submit:{message:'Pro includes 10 watchlists, 50 stocks or ETFs per list, earnings reports, and portfolio insights.'},after_submit:{message:cycle==='yearly'?'$30 billed yearly ($2.50/month equivalent). Renews annually. Cancel future renewals anytime in Account.':'$2.99 billed monthly. Renews monthly. Cancel future renewals anytime in Account.'}},
 };
}
export function stripeClient(){if(!process.env.STRIPE_SECRET_KEY)throw new AppError('Billing is not available yet.',503);return new Stripe(process.env.STRIPE_SECRET_KEY,{httpClient:Stripe.createFetchHttpClient(),maxNetworkRetries:2});}
export function priceIdFor(cycle='monthly'){if(!['monthly','yearly'].includes(cycle))throw new AppError('Choose monthly or yearly billing.');return cycle==='yearly'?process.env.STRIPE_PRO_YEARLY_PRICE_ID:process.env.STRIPE_PRO_MONTHLY_PRICE_ID||process.env.STRIPE_PRO_PRICE_ID;}
export function billingReady(){return false;}
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
export async function checkout(){
  throw new AppError('Billing is not available.',410);
}
export async function portal(){
  throw new AppError('Billing is not available.',410);
}
export async function proPrice(cycle='monthly'){
 const id=priceIdFor(cycle),fallback={cycle,amount:cycle==='yearly'?3000:299,currency:'usd',interval:cycle==='yearly'?'year':'month',intervalCount:1};
 if(!billingReady(cycle))return {available:false,...fallback};
 const price=await stripeClient().prices.retrieve(id);
 if(!validProPrice(price,cycle))throw new AppError('Configured Stripe price does not match this billing plan.',503);
 return {available:true,...fallback};
}
