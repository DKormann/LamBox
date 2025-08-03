import { auth, PubKey } from "./auth"
import { Stored, Writable } from "./store"
import {Request, SHA256} from "./box"
import { Primitive } from "./dataSchemas"

export {}

const secret = new Stored<string> ("nsecret", "")
if (!secret.get()) secret.set(auth.randomKey().sec)


const key = auth.keyFromNsec(secret.get()!)
const pubkey = key.pub
const body = document.body
const serverurl = "http://localhost:8080"


const code = `

key = "counteridx"

count = ctx.get(key)?.result || 0
ctx.set(key, count + 1, true)

return count

`


setup()
async function setup(){

  const hash = await SHA256(code)
  await publish(code).catch(console.error)
  await host(hash).catch(console.error)
  console.log(await call(hash, key.pub, "hello"))
}


function publish(code:string){
  return sendRequest({
    pubkey,
    tag: "publish",
    code
  })
}

function host(hash:string){
  return sendRequest({
    pubkey,
    tag: "host",
    hash,
    allowed: true
  })
}

function call(hash:string, host:PubKey, arg:Primitive){
  return sendRequest({
    pubkey,
    tag: "call",
    hash,
    host,
    argument: arg
  })
}


async function sendRequest(request:Request){
  const r = await fetch(serverurl, {
    method: "POST",
    body: JSON.stringify(
      key.sign(JSON.stringify(request))
    )
  })
  return await r.text()
}

import ts from 'typescript';

const sourceCode = `string | boolean`;
const sourceFile = ts.createSourceFile('example.ts', sourceCode, ts.ScriptTarget.Latest, true);

console.log(sourceFile.statements); // AST nodes
