import {marketDashboard} from '@/server/market.mjs';
import {json,failure} from '@/server/http.mjs';
export async function GET(){try{return json(await marketDashboard());}catch(e){return failure(e);}}
