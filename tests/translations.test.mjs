import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,readdir} from 'node:fs/promises';
import {join} from 'node:path';
import dictionary from '../lib/translations.json' with {type:'json'};

async function walk(dir){
  const out=[];
  for(const entry of await readdir(dir,{withFileTypes:true})){
    if(entry.name==='node_modules'||entry.name==='dist'||entry.name==='dist-staging'||entry.name==='ui')continue;
    const path=join(dir,entry.name);
    if(entry.isDirectory())out.push(...await walk(path));
    else if(/\.(tsx|ts|jsx|js)$/.test(entry.name))out.push(path);
  }
  return out;
}

test('every t() and T text key used in product UI has a Turkish and Spanish translation',async()=>{
  const files=[...await walk('app'),...await walk('components/product')];
  const keys=new Set();
  const pattern=/\bt\(\s*(['"])((?:\\.|(?!\1).)*)\1\s*\)|<T text=(?:\{)?(['"])((?:\\.|(?!\3).)*)\3(?:\})?/g;
  for(const file of files){
    const source=await readFile(file,'utf8');
    let match;
    while((match=pattern.exec(source)))keys.add((match[2]||match[4]).replace(/\\'/g,"'").replace(/\\"/g,'"'));
  }
  const missing=[...keys].filter(key=>{
    const row=dictionary[key];
    return !row||typeof row[0]!=='string'||typeof row[1]!=='string'||!row[0].trim()||!row[1].trim();
  }).sort();
  assert.deepEqual(missing,[],'Missing translations: '+missing.join(' | '));
});
