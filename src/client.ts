import { auth, Key, PubKey, signEvent } from "./auth"
import { Stored, Writable } from "./store"
import {Request, SHA256} from "./database"
import { Serial } from "./dataSchemas"
import { APIFunction, Box, Box2Serial, BoxTable } from "./userspace"



export async function ServerLogin(url:string, box:Box<any>, key:Key) {

  async function sendRequest(request:Request){
    const event = signEvent(JSON.stringify(request), key.sec)
    const resp = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(event)
    })
    return resp.json()

  }

  const bserial = Box2Serial(box)
  const btable = await BoxTable(bserial)

  await sendRequest({
    pubkey: key.pub,
    tag: "publish",
    app: bserial,
  })

  await sendRequest({
    pubkey: key.pub,
    tag: "host",
    hash: btable.hash,
    allowed: true,
  })

  return async (target:PubKey, lam:APIFunction, arg:Serial) =>{
    const lamHash = await SHA256(lam.toString())
    if (!Object.values(btable.apiHashes).includes(lamHash)) throw new Error("illegal lambda")
    const request: Request = {
      tag: "call",
      pubkey: key.pub,
      app: btable.hash,
      lam: lamHash,
      host: target,
      argument: arg
    }
    const resp = await sendRequest(request)
    return resp
  }

}


