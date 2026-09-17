import {localMode} from '@/server/local-db.mjs';
import {authConfigured,browserSupabaseKey,origin} from '@/server/cloud.mjs';
import {json} from '@/server/http.mjs';
export async function GET(){
  const supabaseKey=browserSupabaseKey();
  return json({localMode:localMode(),authReady:authConfigured(),supabaseUrl:supabaseKey?process.env.SUPABASE_URL||'':'',supabaseKey,appUrl:origin(),googleEnabled:!localMode()&&process.env.GOOGLE_AUTH_ENABLED==='true',appleEnabled:!localMode()&&process.env.APPLE_AUTH_ENABLED==='true',billingReady:false,trialDays:0});
}
