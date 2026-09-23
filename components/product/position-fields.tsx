'use client';
import {useT} from "@/components/product/language";
import {T} from '@/components/product/language';
import {useId,useState,type RefObject} from 'react';
import {Input} from '@/components/ui/input';
export type PositionDraft={quantity:string;cost:string;date:string;notes:string};
export const emptyPosition=():PositionDraft=>({quantity:'',cost:'',date:new Date().toLocaleDateString('en-CA'),notes:''});
export function PositionFields({value,onChange,editing=false,currency='USD',quantityRef}:{value:PositionDraft;onChange:(value:PositionDraft)=>void;editing?:boolean;currency?:string;quantityRef?:RefObject<HTMLInputElement|null>}){
  const t=useT();
  const id=useId();
  const [noteOpen,setNoteOpen]=useState(!!value.notes);
  const [wantDetails,setWantDetails]=useState(false);
  const details=editing||!!value.quantity||wantDetails;
  const update=(field:keyof PositionDraft,next:string)=>onChange({...value,[field]:next});
  return <div className="position-fields">
    {!editing&&<div className="position-mode">
      <button type="button" className={'position-mode-btn'+(!details?' is-on':'')} aria-pressed={!details} onClick={()=>{setWantDetails(false);onChange({...value,quantity:'',cost:''});}}>{t('Track price only')}</button>
      <button type="button" className={'position-mode-btn'+(details?' is-on':'')} aria-pressed={details} onClick={()=>setWantDetails(true)}>{t('Add position details')}</button>
    </div>}
    {(editing||details)&&<>
      <label htmlFor={id+'-quantity'}><T text="Shares"/><Input ref={quantityRef} id={id+'-quantity'} aria-label="Number of shares" type="number" min="0.000001" max="1000000000" step="any" required value={value.quantity} onChange={e=>update('quantity',e.target.value)}/></label>
      <label htmlFor={id+'-cost'}>{t("Cost per share")} ({currency})<Input id={id+'-cost'} aria-label="Cost per share" type="number" min="0.000001" max="1000000000" step="any" required={editing} placeholder={t("Latest price")} value={value.cost} onChange={e=>update('cost',e.target.value)}/></label>
      <label htmlFor={id+'-date'}><T text="Purchase date"/><Input id={id+'-date'} aria-label={t("Purchase date")} type="date" required min="1970-01-01" max={new Date().toLocaleDateString('en-CA')} value={value.date} onChange={e=>update('date',e.target.value)}/></label>
    </>}
    <button type="button" className="note-toggle" aria-expanded={noteOpen||!!value.notes} onClick={()=>setNoteOpen(v=>!v)}>{noteOpen||value.notes?t("Hide note"):t("Add note")}</button>
    {(noteOpen||value.notes)&&<label className="position-note" htmlFor={id+'-notes'}><T text="Investment note (optional)"/><Input id={id+'-notes'} aria-label="Investment note" maxLength={500} placeholder={t("Why are you watching this company?")} value={value.notes} onChange={e=>update('notes',e.target.value)}/></label>}
    <p className="field-note position-note">{editing||details?<>{t("Enter shares and costs adjusted for past stock splits. ")}{editing?'':t("Leave cost blank to use the latest quote. ")}{t("Quantity and purchase details are fixed after saving.")}</>:t("This adds the latest quote as a starting price. You can add shares and cost later, once.")} {t("US, Europe (EUR), Canada (CAD), and Turkey (TRY). A list stays in the currency of the first stock you add.")}</p>
  </div>;
}
