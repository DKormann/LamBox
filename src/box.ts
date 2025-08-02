import { PubKey, signEvent,  } from "./auth"
import { Event, nip19, VerifiedEvent,  } from "nostr-tools"
import { BoxType, Primitive } from "./boxtypes"


type lamHash = string
type resultKey = string



type Lambda = string

type StoreKey = {
  owner: PubKey,
  key: resultKey,
  type: BoxType
}

type StoreItem = {
  public: boolean,
  result: Primitive
}

type DB = {
  lambdas: Map<lamHash, Lambda>,
  hosts: Map<PubKey, Set<lamHash>>,
  store: Map<resultKey, Map<PubKey, StoreItem>>
}

let db: DB = {
  lambdas: new Map(),
  hosts: new Map(),
  store: new Map(),
}

export type Request = {
  pubkey: PubKey,
} & ({
  tag: "publish",
  code: string
} | {
  tag: "host",
  hash: lamHash,
  allowed: boolean,
} | {
  tag: "call",
  hash: string,
  host: PubKey,
  argument: Primitive,
})




export async function acceptEvent(event: Event){

  const pubkey = nip19.npubEncode(event.pubkey)
  const content = event.content
  try {
    const request = {pubkey, ...JSON.parse(content)} as Request
    const response = (request.tag == "publish") ? acceptPublish(request) : (request.tag == "host") ? acceptHost(request) : acceptCall(request)
    return response
  }catch(e){
    console.log(e)
    throw e
  }
}

export const  SHA256 = async (data: string) => {
  const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(data))
  const hashstring = Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('')
  return hashstring
}

export async function acceptPublish(request: Request & {tag: "publish"}){

  const hash = await SHA256(request.code)
  db.lambdas.set(hash, request.code)
  return null
}

export async function acceptHost(request: Request & {tag: "host"}){
  if (!db.hosts.has(request.pubkey)){
    db.hosts.set(request.pubkey, new Set())
  }
  if (request.allowed){
    console.log("hosting", request.hash)
    db.hosts.get(request.pubkey)!.add(request.hash)
  }else{
    db.hosts.get(request.pubkey)!.delete(request.hash)
  }
  return null
}



const storeGet = (owner: PubKey, key: resultKey) => {
  return db.store.get(key)?.get(owner) 
}

const storeSet = (owner: PubKey, key: resultKey, value: StoreItem) => {
  if (!db.store.has(key)){
    db.store.set(key, new Map())
  }
  db.store.get(key)!.set(owner, value)
}

type LambdaContext = {
  host: PubKey,
  caller: PubKey,
  get: (key: resultKey, owner: PubKey) => StoreItem | undefined,
  set: (key: resultKey, item: StoreItem, toHost: boolean) => void,
  setPublic: (key: resultKey, item: StoreItem, toHost: boolean) => void,
}


function lambdaContext (host: PubKey, caller: PubKey): LambdaContext {
  return {
    host,
    caller,
    get: (key: resultKey, owner = host) =>{
      const item = storeGet(owner, key)
      if (!item) return undefined
      if (item.public || owner == host || owner == caller) return item
      return undefined
    },
    set: (key: resultKey, item: Primitive, toHost: boolean = true) => storeSet(toHost? host : caller, key, {public: false, result: item}),
    setPublic: (key: resultKey, item: Primitive, toHost: boolean = true) => storeSet(toHost? host: caller, key, {public: true, result: item}),
  }
}


export async function acceptCall(request: Request & {tag: "call"}){

  const lambda = db.lambdas.get(request.hash)
  if (! lambda){
    throw new Error("Lambda not found")
  }
  if (!db.hosts.get(request.host)?.has(request.hash)){
    console.log(db.hosts);
    console.log(request.host, request.hash);
    
    throw new Error("Host not allowed")
  }

  const func = new Function("ctx", "arg", lambda) as (ctx: LambdaContext, arg: Primitive) => [resultKey, Primitive]
  const result = func(lambdaContext(request.host, request.pubkey), request.argument)
  return result
}


