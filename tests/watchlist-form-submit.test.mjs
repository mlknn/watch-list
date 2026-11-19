import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import ts from 'typescript';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {Button} from '@base-ui/react/button';

// Base UI intentionally defaults buttons to type="button". Every form needs
// an explicit submit control; otherwise clicks never reach its onSubmit handler.
void test('watchlist forms render an explicit submit button, including Add order',async()=>{
 const source=ts.createSourceFile('watchlist-workspace.tsx',await readFile('components/product/watchlist-workspace.tsx','utf8'),ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
 const forms=[];
 function visit(node){
  if(ts.isJsxElement(node)&&node.openingElement.tagName.getText(source)==='form')forms.push(node);
  ts.forEachChild(node,visit);
 }
 visit(source);
 assert.ok(forms.length>=4);
 for(const form of forms){
  const handler=form.openingElement.attributes.properties.find(p=>p.name?.getText(source)==='onSubmit')?.initializer?.getText(source);
  const submitTypes=[];
  function inspect(node){
   if((ts.isJsxOpeningElement(node)||ts.isJsxSelfClosingElement(node))&&['Button','button'].includes(node.tagName.getText(source))){
    const type=node.attributes.properties.find(p=>p.name?.getText(source)==='type')?.initializer;
    if(type&&ts.isStringLiteral(type))submitTypes.push(type.text);
   }
   ts.forEachChild(node,inspect);
  }
  inspect(form);
  assert.ok(submitTypes.includes('submit'),`${handler} has no submitting button; Base UI defaults to type="button"`);
  assert.match(renderToStaticMarkup(createElement(Button,{type:submitTypes.find(type=>type==='submit')},'Save')),/type="submit"/);
 }
});
