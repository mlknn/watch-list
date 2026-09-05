import {showcase} from '@/server/showcase.mjs';
import {json,failure} from '@/server/http.mjs';
export async function GET(){try{return json(await showcase());}catch(e){return failure(e);}}
