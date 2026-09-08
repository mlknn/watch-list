import {AppError} from '../quotes.mjs';
export const localMode=()=>false;
const disabled=()=>{throw new AppError('Local accounts are disabled on this deployment.',404);};
export const localDatabase=disabled,localUser=disabled,localAuth=disabled,exportLocalData=disabled;
