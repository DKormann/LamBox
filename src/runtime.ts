

import { parentPort, workerData } from 'worker_threads';
import { VM , VMOptions} from 'vm2';
import { PubKey } from './auth';
import { defaultContext, Box, APIFunction, DBTable, PersonalDBHandle, DBRow } from './userspace';
import { Serial } from './dataSchemas';


export type WorkerCall = {
  tag: "request",
  getCtx: string,
  lam: string,
  self: PubKey,
  other: PubKey,
  arg: Serial,
} | {
  tag: "response",
  requestId: number,
  value: string|undefined,
}

export type WorkerMessage = 

({
  tag: "request",
  id: number,
  key: string,
  person: PubKey,
} & ({method: "get"} |{method: "set", body: string|undefined}))

| {
  tag: "ok",
  callid: number,
  value: string,
} | {
  tag: "error",
  callid: number,
  error: string,
}




if (!parentPort) throw new Error("Must run in worker thread")

const messageQueue = new Map<number, (val:string|undefined)=>void>()


// parentPort?.on("message", (message:WorkerCall)=>{
//   if (message.tag === "response"){
//     const callback = messageQueue.get(message.requestId)
//     if (callback) callback(message.value)
//     messageQueue.delete(message.requestId)
//   }
// })


function sendRequest(key:string, person:PubKey, op:{method: "get"} | {method: "set", body: string|undefined}){
  requestCount++
  const reqId = requestCount
  parentPort!.postMessage({id: reqId, person, tag: "request", key, ...op})
  return new Promise<string|undefined>((resolve, reject) => {
    messageQueue.set(reqId, resolve)
  })
}

let requestCount = 0

function runCode(code:string, arg:Object){

  const vm = new VM({
    timeout: 2000,
    sandbox: arg,
    wasm:false,
    eval:false,
  });

  console.log({arg, code})
  return vm.run(code)

}


parentPort.on("message", async (message:WorkerCall)=>{


  if (message.tag === "response") {

    const callback = messageQueue.get(message.requestId)
    if (callback) callback(message.value)
    messageQueue.delete(message.requestId)

  } else if (message.tag === "request"){

    
    function mkHandle(person:PubKey) :PersonalDBHandle{
      return {
        get: (key:string) => sendRequest(key, person, {method: "get"}),
        set: async(key:string, value:string|undefined) => {await sendRequest(key, person, {method: "set", body: value})},
      }
    }
    
    function mkRow<T extends Serial>(person:PubKey, key:string, defaultValue:T):DBRow<T>{
      const handle = mkHandle(person)
      const get = () => handle.get(key).then(v=>{
        const res = v ? JSON.parse(v) as T : defaultValue
        console.log("got",res);
        return res
      }
      )
      const set = (value:T|undefined) => handle.set(key, JSON.stringify(value))
      const update = (func:(value:T)=>T|undefined) => get().then(v=>set(func(v)))
      const del = () => handle.set(key, undefined)
      return {get, set, update, delete: del}
    }
    
    const defCon:defaultContext = {
      self: message.self,
      other: message.other,
      getTable: <T extends Serial>(key:string, defaultValue:T) => ({
        ...mkRow(message.self, key, defaultValue),
        other: mkRow(message.other, key, defaultValue),
      })
    }
    try {
      
      const ctx = runCode(`(${message.getCtx})(defCon)`, {defCon})
      let res = runCode(`(${message.lam})(ctx, arg)`, {ctx:{...defCon,...ctx}, arg: message.arg})

      if (res instanceof Promise){
        res = await res
      }
      
    
      parentPort!.postMessage({tag: "ok", value: JSON.stringify(res)} as WorkerMessage)
    } catch (err) {
      parentPort!.postMessage({tag: "error", error: (err as Error).message} as WorkerMessage)
    }
  }
})



