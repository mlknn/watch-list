import {randomBytes,randomUUID,createHash,scrypt as derive,timingSafeEqual} from 'node:crypto';
import {promisify} from 'node:util';
import {readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {localPg,localMode,persistLocalDatabase} from './local-db.mjs';
import {AppError} from './quotes.mjs';
const scrypt=promisify(derive),hash=t=>createHash('sha256').update(t).digest('hex');
export async function passwordHash(password){const salt=randomBytes(16).toString('hex');return salt+':'+Buffer.from(await scrypt(password,salt,64)).toString('hex');}
export async function passwordMatches(password,encoded){const [salt,key]=encoded.split(':');const actual=Buffer.from(await scrypt(password,salt,64));const expected=Buffer.from(key,'hex');return expected.length===actual.length&&timingSafeEqual(actual,expected);}
export function localRequest(request){if(!localMode())throw new AppError('Local accounts are disabled.',404);if(!['127.0.0.1','localhost','[::1]'].includes(new URL(request.url).hostname))throw new AppError('Local accounts are available on this computer only.',403);}
let seedPromise;
export async function seedLocalAdmin(){return seedPromise??=(async()=>{const pg=await localPg();let seed;try{seed=JSON.parse(await readFile(resolve(process.env.LOCAL_DATA_DIR||'data','bootstrap-admin.json'),'utf8'));}catch(e){if(e.code==='ENOENT')return;throw e;}
 if(!seed.email||!seed.passwordHash)return;
 const exists=(await pg.query('select id from local_users where email=$1',[seed.email])).rows[0];if(exists)return;
 const displayName=String(seed.name||'Local owner').slice(0,60);const id=randomUUID();await pg.transaction(async tx=>{await tx.query('insert into auth.users values($1)',[id]);await tx.query('insert into local_users(id,email,password_hash,name,verified_at) values($1,$2,$3,$4,now())',[id,seed.email,seed.passwordHash,displayName]);await tx.query('select wl_ensure_profile($1,$2,0)',[id,displayName]);await tx.query("update wl_profiles set subscription_status='active',pro_until=timestamptz '2099-01-01' where id=$1",[id]);});
 })().catch(e=>{seedPromise=null;throw e;});}
const userView=u=>({id:u.id,email:u.email,email_confirmed_at:u.verified_at,user_metadata:{full_name:u.name},local:true});
const cookieToken=request=>(request.headers.get('cookie')||'').split(';').map(s=>s.trim()).find(s=>s.startsWith('wl_session='))?.slice(11)||'';
export async function localUser(request){localRequest(request);const token=cookieToken(request);if(!/^[\w-]{43}$/.test(token))throw new AppError('Please sign in to continue.',401);const pg=await localPg();const u=(await pg.query('select u.* from local_sessions s join local_users u on u.id=s.user_id where token_hash=$1 and expires_at>now()',[hash(token)])).rows[0];if(!u||!u.verified_at)throw new AppError('Your session expired. Please sign in again.',401);return userView(u);}
const sessionCookie=token=>`wl_session=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${token?604800:0}`;
async function session(pg,user){const token=randomBytes(32).toString('base64url');await pg.query("insert into local_sessions values($1,$2,now()+interval '7 days')",[hash(token),user.id]);return {payload:{user:userView(user)},cookie:sessionCookie(token)};}
export async function localAuth(request,input){const result=await runLocalAuth(request,input);if(input.action!=='session')await persistLocalDatabase();return result;}
async function runLocalAuth(request,input){
 localRequest(request);await seedLocalAdmin();const pg=await localPg();
 const allowed=(await pg.query("select wl_rate('local-auth',120,60) ok")).rows[0].ok;if(!allowed)throw new AppError('Too many attempts. Try again in a minute.',429);
 const {action}=input;const email=String(input.email||'').trim().toLowerCase();const password=String(input.password||'');
 if(['login','signup','resend','reset'].includes(action)&&!(await pg.query('select wl_rate($1,10,300) ok',['auth:'+hash(email)])).rows[0].ok)throw new AppError('Too many attempts for this account. Try again in five minutes.',429);
 if(action==='logout'){await pg.query('delete from local_sessions where token_hash=$1',[hash(cookieToken(request))]);return {payload:{ok:true},cookie:sessionCookie('')};}
 if(action==='session')return {payload:{user:await localUser(request)}};
 if(action==='verify'||action==='updatePassword'){
  if(action==='updatePassword'&&(password.length<6||password.length>256))throw new AppError('Use a password between 6 and 256 characters.');
  const token=String(input.token||'');if(!/^[\w-]{43}$/.test(token))throw new AppError('This link is invalid or expired.');
  let user;await pg.transaction(async tx=>{const row=(await tx.query('delete from local_tokens where token_hash=$1 and kind=$2 and expires_at>now() returning user_id',[hash(token),action==='verify'?'verify':'reset'])).rows[0];if(!row)throw new AppError('This link is invalid, expired, or already used.');
   if(action==='verify'){await tx.query('update local_users set verified_at=now() where id=$1',[row.user_id]);user=(await tx.query('select * from local_users where id=$1',[row.user_id])).rows[0];await tx.query('select wl_ensure_profile($1,$2,0)',[user.id,user.name]);}
   else{await tx.query('update local_users set password_hash=$1 where id=$2',[await passwordHash(password),row.user_id]);await tx.query('delete from local_sessions where user_id=$1',[row.user_id]);}
  });return action==='verify'?session(pg,user):{payload:{ok:true}};
 }
 if(action==='login'){
  if(password.length>256)throw new AppError('Email or password is incorrect.',401);
  const u=(await pg.query('select * from local_users where email=$1',[email])).rows[0];
  const valid=await passwordMatches(password,u?.password_hash||('00'.repeat(16)+':'+ '00'.repeat(64)));
  if(!u||!valid)throw new AppError('Email or password is incorrect.',401);if(!u.verified_at)throw new AppError('Verify your account using the local inbox link first.',403);return session(pg,u);
 }
 if(!['signup','resend','reset'].includes(action))throw new AppError('Unknown account action.');
 if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||email.length>254)throw new AppError('Enter a valid email address.');
 let u=(await pg.query('select * from local_users where email=$1',[email])).rows[0];
 if(action==='signup'){
  if(password.length<6||password.length>256)throw new AppError('Use a password between 6 and 256 characters.');const name=String(input.name||'').trim();if(!name||name.length>60)throw new AppError('Enter your name (up to 60 characters).');
  if(u)throw new AppError('An account already exists. Sign in or reset your password.',409);
  const id=randomUUID();await pg.transaction(async tx=>{await tx.query('insert into auth.users values($1)',[id]);await tx.query('insert into local_users(id,email,password_hash,name) values($1,$2,$3,$4)',[id,email,await passwordHash(password),name]);});u={id};
 }
 if(!u||(action==='reset'&&!u.verified_at)||(action==='resend'&&u.verified_at))return {payload:{ok:true}};
 const token=randomBytes(32).toString('base64url'),kind=action==='reset'?'reset':'verify';await pg.transaction(async tx=>{await tx.query('delete from local_tokens where user_id=$1 and kind=$2',[u.id,kind]);await tx.query("insert into local_tokens values($1,$2,$3,now()+interval '30 minutes')",[hash(token),u.id,kind]);});
 // Explicit local development inbox: this never claims to deliver email or prove email ownership.
 return {payload:{ok:true,localDelivery:{url:`/auth/${kind==='reset'?'reset':'callback'}#token=${token}`,label:kind==='reset'?'Open local password reset link':'Open local verification link'}}};
}
