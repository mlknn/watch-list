import {database,dbResult,authConfigured} from '@/server/cloud.mjs';
import {json,failure} from '@/server/http.mjs';
export async function GET(){try{if(!authConfigured())return json({available:false,users:0,countries:[]});return json({available:true,...dbResult(await database().rpc('wl_community'))});}catch(e){return failure(e);}}
