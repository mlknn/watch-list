import {notFound} from 'next/navigation';
export const metadata={title:'Invalid URL — StockWatchlist',robots:{index:false,follow:false}};
export default function UnknownPath(){notFound();}
