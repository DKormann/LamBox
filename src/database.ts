import { PubKey  } from "./auth"
import { Event, nip19 } from "nostr-tools"
import { Request } from "./userspace"
import { Worker } from "worker_threads"
import { WorkerCall, WorkerMessage } from "./runtime"



type resultKey = string
type Lambda = string
type lamHash = string
type appHash = string

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


  if (request.allowed) host.add(request.appHash)
  else host.delete(request.appHash)
  return null
}


export async function acceptCall(request: Request & {tag: "call"}){

  const host = db.hosts.get(request.host)
  if (!host || !host.has(request.appHash)){
    console.log("host not found", request.host, host, request.appHash)
    return null
  }

  const app = db.apps.get(request.appHash)
  if (!app){
    console.log("app not found")
    return null
  } 
  const lambda = db.lambdas.get(request.lamHash)
  if (!lambda) {
    console.log("lambda not found")
    return null
  }

  const worker = new Worker("./dist/runtime.js",{
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
    lam: lambda,
    self: request.pubkey,
    other: request.host,
    arg: request.argument,
  }

  worker.postMessage(call)

  return new Promise<string|null>((resolve, reject)=>{

    worker.on("message", (message:WorkerMessage)=>{
      
      if (message.tag == "request"){

        if (message.person != request.host && message.person != request.pubkey) throw new Error("Unauthorized")
        let val:string|undefined = undefined

        message.key = message.key + "_" + request.appHash
        if (message.method == "get"){
          val = db.store.get(message.person)?.get(message.key)
          console.log("got val: ",val);
        }else if (message.method == "set"){
          let pstore = db.store.get(message.person)
          if (!pstore){
            pstore = new Map()
            db.store.set(message.person, pstore)
          }
          if (message.body == undefined){
            // console.log("deleting val: ",message.key);
            pstore.delete(message.key)
          }else{
            // console.log("setting val: ",message.body);
            pstore.set(message.key, message.body)
          }
        }

        const response:WorkerCall = {
          tag:"response",
          requestId: message.id,
          value: val,
        }
        worker.postMessage(response)

      }else if (message.tag == "error"){
        console.error("error", message.error)
        reject(message.error)
        worker.terminate()
      }else if (message.tag == "ok"){

        const res = message.value ?? null
        worker.terminate()
        resolve(message.value??null)
      }
    })

    worker.on("error", (err)=>{
      console.error("Worker error:", err);
      reject(err);

    });
    
    worker.on("exit", (code)=>{
      if (code !== 0) {
        console.error(`Worker stopped with exit code ${code}`);
        reject(new Error(`Worker stopped with exit code ${code}`));
      }
    });
  })
}



function saveToDB(key:string, item:string){
  
}

function getFromDB(key:string):string{
  return "<RESULT FROM DATABASE>"
}
