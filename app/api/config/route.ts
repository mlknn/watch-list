import {authConfigured,origin} from '@/server/cloud.mjs';
import {json} from '@/server/http.mjs';
export async function GET(){return json({authReady:authConfigured(),supabaseUrl:process.env.SUPABASE_URL||'',supabaseKey:process.env.SUPABASE_PUBLISHABLE_KEY||'',appUrl:origin(),googleEnabled:process.env.GOOGLE_AUTH_ENABLED==='true',appleEnabled:process.env.APPLE_AUTH_ENABLED==='true',billingReady:!!(process.env.STRIPE_SECRET_KEY&&process.env.STRIPE_PRO_PRICE_ID&&process.env.STRIPE_WEBHOOK_SECRET),trialDays:Number(process.env.FREE_TRIAL_DAYS)||0});}
