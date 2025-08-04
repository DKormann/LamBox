import { PubKey, signEvent,  } from "./auth"
import { Event, nip19, VerifiedEvent,  } from "nostr-tools"
import { DataSchema, Serial } from "./dataSchemas"
import { APIFunction, Box, Box2Serial, BoxSerial, BoxTable, Person, Serial2Box, Store } from "./userspace"


type lamHash = string
type appHash = string
type resultKey = string

type Lambda = string

type StoreItem = Serial


type DB = {
  lambdas: Map<lamHash, Lambda>,
  apps: Map<appHash, {ctx:any, api:Set<lamHash>}>,
  hosts: Map<PubKey, Set<appHash>>,
  store: Map<PubKey, {public: Map<resultKey, StoreItem>, secret: Map<resultKey, StoreItem>}>
}

let db: DB = {
  lambdas: new Map(),
  apps: new Map(),
  hosts: new Map(),
  store: new Map(),
}

export type Request = {
  pubkey: PubKey,
} & ({
  tag: "publish",
  app: BoxSerial,
} | {
  tag: "host",
  hash: appHash,
  allowed: boolean,
} | {
  tag: "call",
  app: appHash,
  lam: lamHash,
  host: PubKey,
  argument: Serial,
})




export async function acceptEvent(event: Event){

  const pubkey = nip19.npubEncode(event.pubkey)
  const content = event.content
  try {
    const request = {pubkey, ...JSON.parse(content)} as Request
    const response = (request.tag == "publish") ? acceptPublish(request) : (request.tag == "host") ? acceptHost(request) : acceptCall(request)
    return response
  }catch(e){
    throw e
  }
}

export const  SHA256 = async (data: string) => {
  const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(data))
  const hashstring = Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('')
  return hashstring
}

export async function acceptPublish(request: Request & {tag: "publish"}){


  const {hash,apiHashes} = await BoxTable(request.app)

  const box = Serial2Box(request.app)
  const ctx = box.getCtx()

  if (db.apps.has(hash)) return null
  db.apps.set(hash, {ctx, api: new Set(Object.values(apiHashes))})
  Object.entries(request.app.api).forEach(([key, value])=>{
    db.lambdas.set(apiHashes[key], value)
  })
  return null
}

export async function acceptHost(request: Request & {tag: "host"}){
  let host = db.hosts.get(request.pubkey)!

  if (host == undefined){
    host = new Set<string>()
    db.hosts.set(request.pubkey, host)
  }


  if (request.allowed) host.add(request.hash)
  else host.delete(request.hash)
  return null
}


function getStore(app: appHash, owner: PubKey): Store{
  let userStore = db.store.get(owner)
  if (!userStore){
    userStore = {
      public: new Map(),
      secret: new Map()
    }
    db.store.set(owner, userStore)
  }
  return (key:string, secret: boolean) => {
    key = app + ":" + key
    return {
    get: () => userStore[secret ? "secret" : "public"].get(key) ?? null,
    set: (value: Serial) => userStore[secret ? "secret" : "public"].set(key, value),
    update: (func: (value: Serial) => Serial) => userStore[secret ? "secret" : "public"].set(key, func(userStore[secret ? "secret" : "public"].get(key) ?? null))
  }}
}


export async function acceptCall(request: Request & {tag: "call"}){

  const host = db.hosts.get(request.host)
  if (!host || !host.has(request.app)) return null

  const app = db.apps.get(request.app)
  if (!app) return null
  if (! app.api.has(request.lam)) return null
  const lambda = db.lambdas.get(request.lam)

  const func = new Function("ctx", "self", "other", "arg", "return " + lambda)() as APIFunction
  const self = {pubkey: request.pubkey, store: getStore(request.app, request.pubkey)}
  const other = {pubkey: request.host, store: getStore(request.app, request.host)}

  const res = func(app.ctx, self, other, request.argument)  
  return res ?? null

}


