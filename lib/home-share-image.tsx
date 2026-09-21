import {ImageResponse} from 'next/og';

export const homeOgSize={width:1200,height:630};
export const homeOgAlt='StockWatchlist — watchlists, markets, and earnings';

const tools=[
  {title:'Watchlists',line:'Ideas from the day you add them',rows:[['NVDA','+888%'],['UNH','−11%'],['NKE','−78%']]},
  {title:'Markets',line:'US, Europe, Canada, global, crypto',rows:[['SPY','+1.4%'],['QQQ','+2.5%'],['IWM','+0.6%']]},
  {title:'Earnings',line:'Who reports next, day by day',rows:[['ABVX','Mon'],['AZERO','Tue'],['CTAS','Wed']]},
];

export function homeShareImage(){
  return new ImageResponse(
    <div
      style={{
        width:'100%',
        height:'100%',
        display:'flex',
        flexDirection:'column',
        justifyContent:'space-between',
        padding:'48px 56px 44px',
        background:'#f4f7fb',
        color:'#1c2a3f',
      }}
    >
      <div style={{display:'flex',alignItems:'center'}}>
        <div style={{width:48,height:48,borderRadius:13,background:'#254edb',color:'#fff',display:'flex',alignItems:'center',justifyContent:'center',fontSize:24,fontWeight:700}}>S</div>
        <div style={{display:'flex',marginLeft:14,fontSize:26,fontWeight:700}}>StockWatchlist.app</div>
      </div>
      <div style={{display:'flex',flexDirection:'column'}}>
        <div style={{display:'flex',fontSize:52,fontWeight:800,letterSpacing:-1.6,lineHeight:1.1}}>Keep an eye on what matters.</div>
        <div style={{display:'flex',marginTop:12,fontSize:24,color:'#5b6a80'}}>Your watchlist, market moves, and earnings — together.</div>
      </div>
      <div style={{display:'flex',gap:16}}>
        {tools.map(tool=>
          <div key={tool.title} style={{display:'flex',flexDirection:'column',flex:1,padding:'20px 22px',background:'#fff',border:'1px solid #e0e6ef',borderRadius:16}}>
            <div style={{display:'flex',fontSize:22,fontWeight:700}}>{tool.title}</div>
            <div style={{display:'flex',marginTop:6,fontSize:16,color:'#5b6a80'}}>{tool.line}</div>
            <div style={{display:'flex',flexDirection:'column',marginTop:14,gap:8}}>
              {tool.rows.map(([name,value])=>
                <div key={name} style={{display:'flex',justifyContent:'space-between',fontSize:18}}>
                  <div style={{display:'flex',fontWeight:600}}>{name}</div>
                  <div style={{display:'flex',color:tool.title==='Earnings'?'#5b6a80':value.startsWith('−')?'#b44450':'#14845b'}}>{value}</div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>,
    {
      ...homeOgSize,
      headers:{'Cache-Control':'public, max-age=0, s-maxage=86400, stale-while-revalidate=604800'},
    },
  );
}
