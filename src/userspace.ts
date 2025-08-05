import { auth, Key, PubKey, SecKey } from "./auth"
import { SHA256, Request } from "./database"
import { Serial } from "./dataSchemas"
import { signEvent } from "./auth"


export async function ServerLogin<C>(url:string, box:Box<C>, key:Key) {

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

  const bserial = await Box2Serial(box)
  await sendRequest({
    pubkey: key.pub,
    tag: "publish",
    app: bserial,
  })

  await sendRequest({
    pubkey: key.pub,
    tag: "host",
    hash: bserial.hash,
    allowed: true,
  })

  return async (target:PubKey, lam:APIFunction<C>, arg:Serial = null) =>{
    const lamH = await lamHash(lam, bserial)
    const request: Request = {
      tag: "call",
      pubkey: key.pub,
      app: bserial.hash,
      lam: lamH,
      host: target,
      argument: arg
    }
    const resp = await sendRequest(request)
    return resp
  }

}




// CLEAN REFACTOR:


export type PersonalDBHandle = {
  get: (key:string) => Promise<string|undefined>,
  set: (key:string, value: string|undefined) => Promise<void>,
}

export type DBRow<T extends Serial> = {
  get: () => Promise<T>,
  set: (value: T|undefined) => Promise<void>,
  update: (func: (value: T) => T|undefined) => Promise<void>,
  delete: () => Promise<void>
}

export type DBTable <T extends Serial> = DBRow<T> & {
  other: DBRow<T>,
}

export type defaultContext = {
  self: PubKey,
  other: PubKey,
  getTable: <T extends Serial>(key:string, defaultValue:T) => DBTable<T>
}

function exampleAPI (c:defaultContext){
  let friends = c.getTable("friends", [] as PubKey[])

  return {
    friends
  }
  
}

export type APIFunction<C> = (ctx:defaultContext & C, arg:Serial) => Promise<void | Serial>

export type Box<C> = {
  getCtx : (c:defaultContext) => C
  api: { [key: string]: APIFunction <C> }
}

export type BoxSerial = {
  getCtx: string,
  api: Record<string, string>
  hash: string
  apiHashes: Record<string, string>
}


function _lamHash (lam:string, boxHash:string) {
  return SHA256(lam + boxHash)
}

async function lamHash <C>(lam:APIFunction<C>, box:BoxSerial){
  const lhash = await _lamHash(lam.toString(), box.hash)
  if (!Object.values(box.apiHashes).includes(lhash)) throw new Error("illegal lambda")
  return lhash
}


export async function Box2Serial(box:Box<any>):Promise<BoxSerial> {
  const getCtx = box.getCtx.toString()
  const api = Object.fromEntries(Object.entries(box.api).map(([key, func]) => [key, func.toString()]))
  const hash = await SHA256(JSON.stringify({getCtx, api}))
  const apiHashes : Record<string, string> = {}
  for (const [key, func] of Object.entries(api)){
    apiHashes[key] = await _lamHash(func.toString(), hash)
  }
  return {
    getCtx,
    api,
    hash,
    apiHashes
  }
}


