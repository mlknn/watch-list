/** Bound SDK work and body reads, including operations that ignore AbortSignal. */
export async function withTimeout(operation,milliseconds=15000){
  let timer;
  try{return await Promise.race([Promise.resolve().then(operation),new Promise((_,reject)=>{timer=setTimeout(()=>reject(new Error('The request took too long. Please try again.')),milliseconds);})]);}
  finally{clearTimeout(timer);}
}
/** @param {string} path @param {{milliseconds?:number,fetcher?:typeof fetch,signal?:AbortSignal}} [options] */
export async function publicDataJson(path,{milliseconds=15000,fetcher=fetch,signal}={}){
  const controller=new AbortController();
  const abort=()=>controller.abort();signal?.addEventListener('abort',abort,{once:true});
  if(signal?.aborted)controller.abort();
  try{return await withTimeout(async()=>{const response=await fetcher(path,{cache:'no-store',signal:controller.signal});const data=await response.json();if(!response.ok)throw new Error(data?.error||'Data is temporarily unavailable. Please try again.');return data;},milliseconds);}
  finally{controller.abort();signal?.removeEventListener('abort',abort);}
}
