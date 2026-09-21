import type {Metadata} from 'next';
import {Suspense} from 'react';
import {PublicNav,PublicFooter} from '@/components/product/nav';
import {EarningsCalendar} from '@/components/product/earnings-calendar';
import {earningsShareCard} from '@/lib/next-earnings.mjs';

function earningsMeta(week?:string):Metadata{
  const card=earningsShareCard(week);
  return {
    title:{absolute:`${card.title} | StockWatchlist`},
    description:card.description,
    alternates:{canonical:card.url},
    openGraph:{
      title:card.title,
      description:card.description,
      url:card.url,
      siteName:'StockWatchlist',
      type:'website',
    },
    twitter:{
      card:'summary_large_image',
      title:card.title,
      description:card.description,
    },
  };
}

export async function generateMetadata({searchParams}:{searchParams:Promise<{week?:string}>}):Promise<Metadata>{
  const {week}=await searchParams;
  return earningsMeta(typeof week==='string'?week:'');
}

export default function EarningsPage(){
  return <><PublicNav/><Suspense fallback={<main className="earnings-cal-page"><p>Loading the earnings calendar…</p></main>}><EarningsCalendar/></Suspense><PublicFooter/></>;
}
