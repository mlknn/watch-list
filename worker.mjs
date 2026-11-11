import handler from 'vinext/server/fetch-handler';
import {scheduledEarningsRefresh} from './server/earnings-scheduled.mjs';

const worker={
  fetch(request,env,ctx){
    if(new URL(request.url).pathname.length>2048)return new Response('URI Too Long',{status:414});
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
