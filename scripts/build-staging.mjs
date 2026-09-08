import {cp,mkdir,rm,symlink,readFile} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {spawnSync} from 'node:child_process';
const root=process.cwd(),stage=join(root,'work/cloudflare-staging');
await rm(stage,{recursive:true,force:true});await mkdir(stage,{recursive:true});
const {readdir}=await import('node:fs/promises');
for(const entry of await readdir(root)){if(entry.startsWith('.')||['node_modules','data','work','dist','dist-staging','outputs'].includes(entry))continue;await cp(join(root,entry),join(stage,entry),{recursive:true});}
await symlink(join(root,'node_modules'),join(stage,'node_modules'),'dir');
const result=spawnSync(process.execPath,[join(root,'node_modules/vinext/dist/cli.js'),'build'],{cwd:stage,stdio:'inherit',env:{...process.env,WATCHLIST_CLOUDFLARE:'true',WRANGLER_LOG_PATH:join(stage,'wrangler.log'),WRANGLER_SEND_METRICS:'false'}});
if(result.status!==0)process.exit(result.status||1);
await rm(join(root,'dist-staging'),{recursive:true,force:true});await cp(join(stage,'dist'),join(root,'dist-staging'),{recursive:true});
console.log('Staging build ready. Local app build is unchanged.');
