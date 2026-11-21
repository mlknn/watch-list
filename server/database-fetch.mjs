// Retry only reads: replaying a mutation could create a duplicate purchase.
const transientStatuses=new Set([502,503,504]);
export function databaseFetch(fetchImpl=globalThis.fetch,wait=ms=>new Promise(resolve=>setTimeout(resolve,ms))){
  return async function fetchDatabase(input,init){
    const method=String(init?.method||(input instanceof Request?input.method:'GET')).toUpperCase();
    if(method!=='GET'&&method!=='HEAD')return fetchImpl(input,init);
    const signal=init?.signal||(input instanceof Request?input.signal:undefined);
    for(let attempt=0;;attempt++){
      let response;
      try{response=await fetchImpl(input,init);}
      catch(error){
        if(attempt>=1||signal?.aborted||error?.name==='AbortError'||!(error instanceof TypeError))throw error;
      }
      if(response&&(!transientStatuses.has(response.status)||attempt>=1))return response;
      // Release the failed response before opening another connection.
      if(response?.body)await response.body.cancel().catch(()=>{});
      await wait(250);
      signal?.throwIfAborted();
    }
  };
}
