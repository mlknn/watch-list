import {localMode} from '@/server/local-db.mjs';
import {database,dbResult,authConfigured} from '@/server/cloud.mjs';
import {json} from '@/server/http.mjs';
export async function GET(){
 try{
  if(!authConfigured())return json({available:false,users:0,countries:[]});
  const stats=dbResult(await database().rpc('wl_community'))||{};
  return json({available:true,local:localMode(),users:Number(stats.users)||0,countries:Array.isArray(stats.countries)?stats.countries:[]});
 }catch{
  return json({available:false,users:0,countries:[]});
 }
}
