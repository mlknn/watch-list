import {showcase} from '@/server/showcase.mjs';
import {publicJson,failure,publicRate} from '@/server/http.mjs';
export async function GET(request:Request){try{publicRate(request,'showcase',90,60);return publicJson(await showcase(),15);}catch(e){return failure(e);}}
