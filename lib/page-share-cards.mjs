export const earningsOg={
  alt:'Earnings calendar on StockWatchlist — US-listed companies above $1B',
  title:'Earnings calendar.',
  subtitle:'Who reports this week, and how the print compared with the estimate.',
  columns:[
    {title:'Calendar',line:'One weekday at a time',rows:[{name:'Mon',value:'CTAS · Before open'},{name:'Tue',value:'COST · After close'},{name:'Wed',value:'DRI · Before open'}]},
    {title:'Results',line:'Actual versus estimate',rows:[{name:'Difference',value:'+$0.17',tone:'up'},{name:'Surprise %',value:'+19.3%',tone:'up'},{name:'Zero estimate',value:'No %'}]},
    {title:'Views',line:'Same week, two ways',rows:[{name:'Calendar',value:'Day agenda'},{name:'Table',value:'Sortable'},{name:'Export',value:'CSV'}]},
  ],
  footnote:'US-listed above $1B · Nasdaq · New York time',
};

export const marketsOg={
  alt:'Markets on StockWatchlist — indexes, ETFs, and movers',
  title:'Markets, in one place.',
  subtitle:'Indexes in points. Stocks, ETFs, and crypto in their own units.',
  columns:[
    {title:'Majors',line:'Regular hours',rows:[{name:'S&P 500',value:'Points'},{name:'Nasdaq',value:'Points'},{name:'Bitcoin',value:'USD'}]},
    {title:'Regions',line:'Pick a market',rows:[{name:'US',value:'NYSE hours'},{name:'Europe',value:'Cash session'},{name:'Crypto',value:'24 hours'}]},
    {title:'This selection',line:'Sample averages',rows:[{name:'Gainers',value:'Up only',tone:'up'},{name:'Losers',value:'Down only',tone:'down'},{name:'Sectors',value:'Equal weight'}]},
  ],
  footnote:'Quotes may be delayed · Not a live tape · Not advice',
};

export const watchlistsOg={
  alt:'Watchlists on StockWatchlist — freeze the add-day price',
  title:'Track the idea from the day you add it.',
  subtitle:'A starting price is recorded. Shares and cost stay optional.',
  columns:[
    {title:'Price only',line:'No position required',rows:[{name:'NVDA',value:'Since added'},{name:'Starting',value:'Add-day quote'},{name:'Latest',value:'Delayed quote'}]},
    {title:'Optional position',line:'Add once, then fixed',rows:[{name:'Shares',value:'Optional'},{name:'Cost',value:'Optional'},{name:'P/L',value:'Versus cost'}]},
    {title:'Keep it',line:'This device or account',rows:[{name:'Guest',value:'On this browser'},{name:'Account',value:'5 lists × 20'},{name:'Share',value:'Read-only'}]},
  ],
  footnote:'USD, EUR, CAD, or TRY · One currency per list',
};

export const compareOg={
  alt:'StockWatchlist compared with Yahoo Finance, Google Finance, and TradingView',
  title:'What this app is for.',
  subtitle:'Add-day prices, a markets board, and a US earnings calendar.',
  columns:[
    {title:'Watchlists',line:'Starting price stays',rows:[{name:'Yahoo',value:'Today’s quote'},{name:'Here',value:'From the add day'}]},
    {title:'Markets',line:'A simpler tape',rows:[{name:'Scope',value:'Sample averages'},{name:'Units',value:'Points or currency'}]},
    {title:'Earnings',line:'US, above $1B',rows:[{name:'Source',value:'Nasdaq'},{name:'Time',value:'New York'}]},
  ],
  footnote:'Reviewed September 23, 2026 · Not a broker · Not advice',
};
