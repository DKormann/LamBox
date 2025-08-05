import { PubKey, signEvent,  } from "./auth"
import { Event, nip19, VerifiedEvent,  } from "nostr-tools"
import { DataSchema, Serial } from "./dataSchemas"
import { APIFunction, Box, Box2Serial, BoxSerial} from "./userspace"

import { Worker, ResourceLimits } from "worker_threads"
import { WorkerCall, WorkerMessage } from "./runtime"



type lamHash = string
type appHash = string
type resultKey = string

type Lambda = string

// type StoreItem = Serial


type DB = {
  lambdas: Map<lamHash, Lambda>,
  apps: Map<appHash, {getCtx:string, api:Set<lamHash>}>,
  hosts: Map<PubKey, Set<appHash>>,
  store: Map<PubKey, Map<resultKey, string>>
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




export async function acceptEvent(event: Event):Promise<string|null>{

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


  const {hash,apiHashes} = request.app
  const getCtx = request.app.getCtx

  if (db.apps.has(hash)) return null
  db.apps.set(hash, {getCtx, api: new Set(Object.values(apiHashes))})
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



export async function acceptCall(request: Request & {tag: "call"}){

  const host = db.hosts.get(request.host)
  if (!host || !host.has(request.app)) return null

  const app = db.apps.get(request.app)
  if (!app) return null
  if (! app.api.has(request.lam)) return null
  const lambda = db.lambdas.get(request.lam)
  if (!lambda) {
    console.log("lambda not found")
    return null
  }


  const worker = new Worker("./worker.js",{
    workerData: {},
    resourceLimits: {
      maxOldGenerationSizeMb: 100,
      maxYoungGenerationSizeMb: 100,
      stackSizeMb: 100,
      codeRangeSizeMb: 100,
    }
  } as WorkerOptions)



  const call:WorkerCall = {
    tag:"request",
    getCtx: app.getCtx,
    lam: request.lam,
    self: request.pubkey,
    other: request.host,
    arg: request.argument,
  }

  worker.postMessage(call)


  return new Promise<string>((resolve, reject)=>{

    worker.on("message", (message:WorkerMessage)=>{
      if (message.tag == "request"){

        if (message.person != request.host && message.person != request.pubkey) throw new Error("Unauthorized")

        let val:string|undefined = undefined
        if (message.method == "get"){
          val = db.store.get(message.person)?.get(message.key)
        }else if (message.method == "set"){
          db.store.get(message.person)?.set(message.key, message.body)
        }

        const response:WorkerCall = {
          tag:"response",
          requestId: message.id,
          value: val,
        }
        worker.postMessage(response)
      }else if (message.tag == "error"){
        console.log("error", message.error)
        reject(message.error)
      }else if (message.tag == "ok"){
        resolve(message.value)
      }
    })
  })


}
