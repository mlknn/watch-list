export function cryptoCode(symbol:string):string;
export function cryptoSymbolParam(value:string|null|undefined,symbols:string[]):string;
export function coinChange(row:{chart?:{quote?:{changePercent?:number|null}}|null}|null|undefined):number|null;
export function filterCoins<T>(rows:T[],mode:string):T[];
export function sortCoins<T>(rows:T[],key:string):T[];
