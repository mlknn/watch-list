import handler from 'vinext/server/fetch-handler';
import {scheduledEarningsRefresh} from './server/earnings-scheduled.mjs';
import {normalizeTicker} from './server/quotes.mjs';

const worker={
  async fetch(request,env,ctx){
    const url=new URL(request.url);
    if(url.pathname.length>2048)return new Response('URI Too Long',{status:414});
    const stockPage=request.method==='GET'?url.pathname.match(/^\/stocks\/([^/]+)\/?$/):null;
    if(stockPage){
      try{normalizeTicker(decodeURIComponent(stockPage[1]));}
      catch{return new Response('Not Found',{status:404,headers:{'X-Robots-Tag':'noindex, nofollow','Cache-Control':'public, max-age=3600'}});}
      if(env.STOCK_ROUTE_LIMITER){
        const ip=request.headers.get('cf-connecting-ip');
        if(ip){
          const {success}=await env.STOCK_ROUTE_LIMITER.limit({key:ip});
          if(!success)return Response.json({error:'Too many stock page requests. Please wait a minute.'},{status:429,headers:{'Retry-After':'60','Cache-Control':'no-store'}});
        }
      }
    }
    return handler.fetch(request,env,ctx);
  },
  async scheduled(event,env,ctx){
    const hour=new Intl.DateTimeFormat('en-US',{timeZone:'America/New_York',hour:'2-digit',hourCycle:'h23'}).format(new Date(event.scheduledTime));
    if(hour!=='00')return;
    const refresh=scheduledEarningsRefresh({scheduledTime:event.scheduledTime});
    ctx.waitUntil(refresh);
    await refresh;
  },
};

export default worker;
