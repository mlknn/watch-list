'use client';
import {T,useT} from '@/components/product/language';
import {Cell,Pie,PieChart} from 'recharts';
import {watchlistAllocation} from '@/lib/watchlist-allocation.mjs';
import {price,type Watchlist} from '@/lib/watchlist';

const COLORS=['#2563eb','#0ea5e9','#14b8a6','#6366f1','#38bdf8','#64748b'];

export function WatchlistAllocation({list}:{list:Watchlist}){
  const t=useT();
  const data=watchlistAllocation(list);
  const top=data.slices.slice(0,5);
  if(!data.slices.length)return <section className="watchlist-alloc"><p className="eyebrow"><T text="ALLOCATION"/></p><p className="watchlist-alloc-empty">{t('Add a stock to see how this list is split.')}</p></section>;
  return <section className="watchlist-alloc" aria-label={t('Allocation')}>
    <p className="eyebrow"><T text="ALLOCATION"/></p>
    <div className="watchlist-alloc-body">
      <div className="watchlist-alloc-chart">
        <PieChart width={168} height={168}>
          <Pie data={data.slices} dataKey="value" nameKey="symbol" innerRadius={52} outerRadius={78} stroke="none" isAnimationActive={false}>
            {data.slices.map((slice,index)=><Cell key={slice.symbol} fill={COLORS[index%COLORS.length]}/>)}
          </Pie>
        </PieChart>
        <div className="watchlist-alloc-center">
          <strong>{data.sizedByValue?price(data.total,data.currency):String(data.slices.length)}</strong>
          <span>{data.sizedByValue?t('Current value'):t('Names')}</span>
        </div>
      </div>
      <ol className="watchlist-alloc-list">
        {top.map((slice,index)=><li key={slice.symbol}>
          <i style={{background:COLORS[index%COLORS.length]}}/>
          <span className="watchlist-alloc-name">{slice.symbol}<small>{slice.name}</small></span>
          <strong>{(slice.weight*100).toFixed(1)}%</strong>
          <em className={slice.change===null?'':slice.change>=0?'up':'down'}>{slice.change===null?'—':`${slice.change>=0?'+':''}${slice.change.toFixed(1)}%`}</em>
        </li>)}
      </ol>
    </div>
    <p className="watchlist-alloc-note">{data.sizedByValue?t('Sized by current holding value.'):t('Equal weight until you add shares.')}</p>
  </section>;
}
