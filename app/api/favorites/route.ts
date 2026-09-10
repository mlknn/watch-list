import {favoritesForRequest,toggleFavorite} from '@/server/favorites.mjs';
import {json,failure,body,publicRate} from '@/server/http.mjs';
export const dynamic='force-dynamic';
export async function GET(request:Request){
  try{publicRate(request,'favorites',80,60);return json(await favoritesForRequest(request));}
  catch(e){return failure(e);}
}
export async function POST(request:Request){
  try{return json(await toggleFavorite(request,await body(request)));}
  catch(e){return failure(e);}
}
