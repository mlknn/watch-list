'use client';
import {T,useT} from '@/components/product/language';
import {Cell,Pie,PieChart} from 'recharts';
import {watchlistAllocation} from '@/lib/watchlist-allocation.mjs';
import {type Watchlist} from '@/lib/watchlist';

const COLORS=['#2563eb','#f97316','#16a34a','#a855f7','#e11d48','#eab308','#0891b2','#db2777','#84cc16','#92400e'];
const OTHER_COLOR='#94a3b8';

export function WatchlistAllocation({list,compact=false}:{list:Watchlist;compact?:boolean}){
  const t=useT();
  const data=watchlistAllocation(list);
  const remaining=data.slices.slice(10);
  const slices=data.slices.slice(0,10).map((slice,index)=>({...slice,color:COLORS[index],others:false}));
  if(remaining.length){
    slices.push({
      symbol:t('Others'),name:remaining.map(slice=>slice.symbol).join(', '),
      value:remaining.reduce((sum,slice)=>sum+slice.value,0),
      weight:remaining.reduce((sum,slice)=>sum+slice.weight,0),
      price:0,currency:data.currency,change:null,color:OTHER_COLOR,others:true,
    });
  }
  const size=compact?120:168;
  if(!data.slices.length)return compact?null:<section className="watchlist-alloc"><p className="eyebrow"><T text="ALLOCATION"/></p><p className="watchlist-alloc-empty">{t('Add a stock to see how this list is split.')}</p></section>;
  return <section className={'watchlist-alloc'+(compact?' is-compact':'')} aria-label={t('Allocation')}>
    <p className="eyebrow"><T text="ALLOCATION"/></p>
    <div className="watchlist-alloc-body">
      <div className="watchlist-alloc-chart">
        <PieChart width={size} height={size}>
          <Pie data={slices} dataKey="value" nameKey="symbol" innerRadius={compact?36:52} outerRadius={compact?56:78} stroke="none" isAnimationActive={false}>
            {slices.map(slice=><Cell key={slice.symbol} fill={slice.color}/>)}
          </Pie>
        </PieChart>
      </div>
      <div className="watchlist-alloc-legend"><div className="watchlist-alloc-labels"><span>{t("Company")}</span><span>{t("List weight")}</span><span>{t("Change since added")}</span></div><ol className="watchlist-alloc-list">
        {slices.map(slice=><li key={slice.symbol} title={slice.name}>
          <i style={{background:slice.color}}/>
          <span className="watchlist-alloc-name"><span className="watchlist-alloc-company">{slice.others?slice.symbol+' ('+remaining.length+')':slice.name}</span>{!slice.others&&<small>{slice.symbol}</small>}</span>
          <strong>{(slice.weight*100).toFixed(1)}%</strong>
          <em className={slice.change===null?'':slice.change>=0?'up':'down'}>{slice.change===null?'—':`${slice.change>=0?'+':''}${slice.change.toFixed(1)}%`}</em>
        </li>)}
      </ol></div>
    </div>
    {!compact&&<p className="watchlist-alloc-note">{data.sizedByValue?t('Sized by current holding value.'):t('Equal weight until you add shares.')}</p>}
  </section>;
}
