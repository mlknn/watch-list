import {showcase} from '@/server/showcase.mjs';
import {json,failure,publicRate} from '@/server/http.mjs';
export async function GET(request:Request){try{publicRate(request,'showcase',90,60);return json(await showcase());}catch(e){return failure(e);}}
