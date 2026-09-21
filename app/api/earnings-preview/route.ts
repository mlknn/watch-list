import {earningsHomePreview} from '@/server/earnings-calendar.mjs';
import {failure,publicRate,publicJson} from '@/server/http.mjs';

export async function GET(request:Request){
  try{
    publicRate(request,'earnings-preview',40,60);
    return publicJson(await earningsHomePreview(),21600);
  }catch(e){return failure(e);}
}
