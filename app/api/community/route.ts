import {localMode} from '@/server/local-db.mjs';
import {database,dbResult,authConfigured} from '@/server/cloud.mjs';
import {json,failure,publicRate,publicJson} from '@/server/http.mjs';
export async function GET(request:Request){
 try{
  publicRate(request,'community',60,60);
  if(!authConfigured())return publicJson({available:false,users:0,countries:[]},30);
  const stats=dbResult(await database().rpc('wl_community'))||{};
  return publicJson({available:true,local:localMode(),users:Number(stats.users)||0,countries:Array.isArray(stats.countries)?stats.countries:[]},60);
 }catch(e){
  if((e as {status?:number}).status===429)return failure(e);
  return json({available:false,users:0,countries:[]});
 }
}
