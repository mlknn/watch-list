'use client';
import {useState} from 'react';
import {ChartNoAxesCombined} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {Dialog,DialogContent,DialogTitle,DialogDescription} from '@/components/ui/dialog';
import {Portfolio} from './portfolio';
import {type Watchlist} from '@/lib/watchlist';
export function PerformanceButton({list,version,shareToken}:{list:Watchlist;version:string;shareToken?:string}){const [open,setOpen]=useState(false);return <><Button variant="outline" className="performance-open-button" onClick={()=>setOpen(true)}><ChartNoAxesCombined/>Show performance overall in graph</Button><Dialog open={open} onOpenChange={setOpen}><DialogContent className="performance-dialog"><DialogTitle>{list.name} · Overall performance</DialogTitle><DialogDescription>Portfolio value, invested cost and gains across your selected time range.</DialogDescription>{open&&<Portfolio list={list} version={version} shareToken={shareToken}/>}</DialogContent></Dialog></>;}
