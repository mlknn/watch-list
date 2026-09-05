import {proPrice} from '@/server/billing.mjs';
import {json,failure} from '@/server/http.mjs';
export async function GET(){try{return json(await proPrice());}catch(e){return failure(e);}}
