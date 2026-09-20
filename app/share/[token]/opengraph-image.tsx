import {ImageResponse} from 'next/og';
import {sharedState} from '@/server/cloud.mjs';
import {emptyShareCard,shareCard} from '@/lib/share-card.mjs';

export const alt='Watchlist return on StockWatchlist';
export const size={width:1200,height:630};
export const contentType='image/png';

export default async function Image({params}:{params:Promise<{token:string}>}){
  const {token}=await params;
  let card=emptyShareCard();
  try{card=shareCard(await sharedState(token));}catch{/* Keep the fallback card if the link is missing. */}
  const color=card.tone==='up'?'#14845b':card.tone==='down'?'#b44450':'#1c2a3f';
  const headline=card.returnLabel||card.countLabel;
  const note=card.returnLabel?'since tracking started':card.count?'on a shared watchlist':'No stocks yet';
  return new ImageResponse(
    <div
      style={{
        width:'100%',
        height:'100%',
        display:'flex',
        flexDirection:'column',
        justifyContent:'space-between',
        padding:'56px 64px',
        background:'#f4f7fb',
        color:'#1c2a3f',
      }}
    >
      <div style={{display:'flex',alignItems:'center'}}>
        <div style={{width:52,height:52,borderRadius:14,background:'#254edb',color:'#fff',display:'flex',alignItems:'center',justifyContent:'center',fontSize:26,fontWeight:700}}>S</div>
        <div style={{display:'flex',marginLeft:16,fontSize:28,fontWeight:700}}>StockWatchlist.app</div>
      </div>
      <div style={{display:'flex',flexDirection:'column'}}>
        <div style={{display:'flex',fontSize:32,color:'#5d6d86',fontWeight:600}}>{card.name}</div>
        <div style={{display:'flex',marginTop:8,fontSize:card.returnLabel?108:64,fontWeight:800,color,letterSpacing:-2,lineHeight:1}}>{headline}</div>
        <div style={{display:'flex',marginTop:12,fontSize:28,color:'#5d6d86'}}>{note}</div>
      </div>
      <div style={{display:'flex',justifyContent:'space-between',fontSize:24,color:'#5d6d86'}}>
        <div style={{display:'flex'}}>{card.tickers||'Read-only watchlist'}</div>
        <div style={{display:'flex'}}>{card.returnLabel?card.countLabel:''}</div>
      </div>
    </div>,
    {
      ...size,
      headers:{'Cache-Control':'public, max-age=0, s-maxage=300, stale-while-revalidate=3600'},
    },
  );
}
