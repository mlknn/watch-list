import {billingReady} from '@/server/billing.mjs';
import {localMode} from '@/server/local-db.mjs';
import {authConfigured,origin} from '@/server/cloud.mjs';
import {json} from '@/server/http.mjs';
export async function GET(){return json({localMode:localMode(),authReady:authConfigured(),supabaseUrl:process.env.SUPABASE_URL||'',supabaseKey:process.env.SUPABASE_PUBLISHABLE_KEY||'',appUrl:origin(),googleEnabled:!localMode()&&process.env.GOOGLE_AUTH_ENABLED==='true',appleEnabled:!localMode()&&process.env.APPLE_AUTH_ENABLED==='true',billingReady:billingReady('monthly')||billingReady('yearly'),trialDays:Number(process.env.FREE_TRIAL_DAYS)||0});}
