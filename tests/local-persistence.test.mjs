import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {mkdtemp,readFile,stat,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
test('local signup survives process exit and creates a private recovery snapshot',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'watchlist-persistence-'));
 const run=code=>{const r=spawnSync(process.execPath,['--input-type=module','-e',code],{cwd:process.cwd(),env:{...process.env,LOCAL_AUTH_ENABLED:'true',LOCAL_DATA_DIR:dir,APP_URL:'http://127.0.0.1:4317'},encoding:'utf8',timeout:30000});assert.equal(r.status,0,r.stderr);};
 try{
  run(`import {localAuth} from './server/local-auth.mjs';await localAuth(new Request('http://127.0.0.1:4317/api/local-auth'),{action:'signup',name:'Persistence test',email:'persist@example.com',password:'Test12'});process.exit(0);`);
  const snapshot=JSON.parse(await readFile(join(dir,'accounts-recovery.json'),'utf8'));assert.equal(snapshot.tables['public.local_users'].length,1);assert.equal((await stat(join(dir,'accounts-recovery.json'))).mode&0o777,0o600);
  run(`import assert from 'node:assert/strict';import {localPg,closeLocalDatabase} from './server/local-db.mjs';const pg=await localPg();assert.equal((await pg.query('select count(*) from local_users')).rows[0].count,1);await closeLocalDatabase();`);
 }finally{await rm(dir,{recursive:true,force:true});}
});
