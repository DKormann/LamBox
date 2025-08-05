import { auth, Key, PubKey, SecKey } from "./auth"
import { SHA256, Request } from "./database"
import { Serial } from "./dataSchemas"
import { signEvent } from "./auth"

export type DataHandle <T extends Serial>= {
  defaultValue: T
  get: () => T
  update: (func: (value: T) => T | null) => void
}


export type Store = <T extends Serial> (key:string, secret: boolean, defaultValue: T) => DataHandle<T>

export type Table<T extends Serial> = (p:Person) => DataHandle<T>

export type Person = {
  pubkey: PubKey,
  store: Store
}


export type APIFunction = (ctx: any, self:Person, other:Person, arg:Serial) => void | Serial

export type Box<Ctx> = {
  getCtx : () => Ctx
  api: {
    [key: string]: APIFunction
  }
}

export type BoxSerial = { getCtx:string, api:Record<string, string>}


export function Box2Serial(bx:Box<any>):BoxSerial {
  return {
    getCtx: bx.getCtx.toString(),
    api: Object.fromEntries(Object.entries(bx.api).map(([key, func]) => [key, func.toString()]))
  }
}

// export function Serial2Box(str:BoxSerial): Box<any>{
// const {getCtx, api} = str as {getCtx: string, api: Record<string, string>}
//   return {
//     getCtx: eval(getCtx),
//     api: Object.fromEntries(Object.entries(api).map(([key, func]) => [key, eval(func)]))
//   }
// }

  


export async function BoxTable(bx:BoxSerial){
  const hash = await SHA256(JSON.stringify(bx))

  const apiHashes : Record<string, string> = {}
  for (const [key, func] of Object.entries(bx.api)){
    apiHashes[key] = await SHA256(func + hash)
  }
  return {
    hash,
    apiHashes
  }
}




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
    if (!resp.ok) console.error(await resp.text())
    else return resp.json()

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

  return async (target:PubKey, lam:APIFunction, arg:Serial = null) =>{
    const lamHash = await SHA256(lam.toString() + btable.hash)
    if (!Object.values(btable.apiHashes).includes(lamHash)){
      throw new Error("illegal lambda")
    }
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


