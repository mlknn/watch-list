export type Fact={label:string;value:string};
export function filledFacts(items:Array<Fact|null|undefined|false>):Fact[];
export function weekRangePosition(price:number,low:number,high:number):number|null;
export function netMargin(netIncome:number|undefined,revenue:number|undefined):number|null;
export function targetGap(target:number|undefined,price:number|undefined):number|null;
export function websiteLabel(url:string):string;
