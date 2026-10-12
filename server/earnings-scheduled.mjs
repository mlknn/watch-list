import {refreshEarningsWeek} from './earnings-calendar.mjs';
import {refreshYtdMarketHistory} from './market-history.mjs';

/** Cloudflare cron handler; the Worker filters hourly events to New York midnight. */
export async function scheduledEarningsRefresh({scheduledTime=Date.now()}={}){
  const now=new Date(scheduledTime);
  const [earnings,history]=await Promise.all([refreshEarningsWeek(now),refreshYtdMarketHistory(now)]);
  return {earnings,history};
}
