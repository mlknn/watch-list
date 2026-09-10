'use client';
import {useEffect} from 'react';
import {usePathname} from 'next/navigation';
import {track} from '@/lib/analytics';

export function Analytics(){
  const path=usePathname()||'/';
  useEffect(()=>{
    track('visit');
    if(path==='/dashboard'||path.startsWith('/dashboard/'))track('dashboard');
  },[path]);
  return null;
}
