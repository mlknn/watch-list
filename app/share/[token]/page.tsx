import type {Metadata} from 'next';
import {sharedState} from '@/server/cloud.mjs';
import {emptyShareCard,shareCard} from '@/lib/share-card.mjs';
import {SharedWatchlist} from '@/components/product/shared-watchlist';

async function cardFor(token:string){
  try{return shareCard(await sharedState(token));}
  catch{return emptyShareCard();}
}

export async function generateMetadata({params}:{params:Promise<{token:string}>}):Promise<Metadata>{
  const {token}=await params;
  const card=await cardFor(token);
  const url=`https://stockwatchlist.app/share/${encodeURIComponent(token)}`;
  const image={url:`/share/${encodeURIComponent(token)}/opengraph-image`,width:1200,height:630,alt:card.title};
  return {
    title:{absolute:`${card.title} | StockWatchlist`},
    description:card.description,
    robots:{index:false,follow:false},
    openGraph:{
      title:card.title,
      description:card.description,
      url,
      siteName:'StockWatchlist',
      type:'website',
      images:[image],
    },
    twitter:{
      card:'summary_large_image',
      title:card.title,
      description:card.description,
      images:[image.url],
    },
  };
}

export default async function SharePage({params}:{params:Promise<{token:string}>}){
  const {token}=await params;
  return <SharedWatchlist token={token}/>;
}
