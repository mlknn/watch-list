import {ImageResponse} from 'next/og';
import {compareOg,earningsOg,marketsOg,watchlistsOg} from './page-share-cards.mjs';

export {compareOg,earningsOg,marketsOg,watchlistsOg};

export const pageOgSize={width:1200,height:630};

type Row={name:string;value:string;tone?:string};
type Column={title:string;line:string;rows:Row[]};

export function pageShareImage({
  alt,
  title,
  subtitle,
  columns,
  footnote,
}:{
  alt:string;
  title:string;
  subtitle:string;
  columns:Column[];
  footnote:string;
}){
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
        <div style={{display:'flex',fontSize:52,fontWeight:800,letterSpacing:-1.6,lineHeight:1.1}}>{title}</div>
        <div style={{display:'flex',marginTop:12,fontSize:24,color:'#5b6a80'}}>{subtitle}</div>
      </div>
      <div style={{display:'flex',flexDirection:'column',gap:16}}>
        <div style={{display:'flex',gap:16}}>
          {columns.map(column=>
            <div key={column.title} style={{display:'flex',flexDirection:'column',flex:1,padding:'20px 22px',background:'#fff',border:'1px solid #e0e6ef',borderRadius:16}}>
              <div style={{display:'flex',fontSize:22,fontWeight:700}}>{column.title}</div>
              <div style={{display:'flex',marginTop:6,fontSize:16,color:'#5b6a80'}}>{column.line}</div>
              <div style={{display:'flex',flexDirection:'column',marginTop:14,gap:8}}>
                {column.rows.map(row=>
                  <div key={row.name} style={{display:'flex',justifyContent:'space-between',fontSize:18}}>
                    <div style={{display:'flex',fontWeight:600}}>{row.name}</div>
                    <div style={{display:'flex',color:row.tone==='up'?'#14845b':row.tone==='down'?'#b44450':'#5b6a80'}}>{row.value}</div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
        <div style={{display:'flex',fontSize:18,color:'#5b6a80'}}>{footnote}</div>
      </div>
    </div>,
    {
      ...pageOgSize,
      headers:{'Cache-Control':'public, max-age=0, s-maxage=86400, stale-while-revalidate=604800'},
    },
  );
}

export const earningsOgAlt=earningsOg.alt;
export function earningsShareImage(){return pageShareImage(earningsOg);}
export const marketsOgAlt=marketsOg.alt;
export function marketsShareImage(){return pageShareImage(marketsOg);}
export const watchlistsOgAlt=watchlistsOg.alt;
export function watchlistsShareImage(){return pageShareImage(watchlistsOg);}
export const compareOgAlt=compareOg.alt;
export function compareShareImage(){return pageShareImage(compareOg);}
