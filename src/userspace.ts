import { auth, Key, PubKey } from "./auth"
// import { setup } from "./client"
import { SHA256 } from "./database"
import { cast, DataSchema, ObjectSchema, Serial, StringSchema } from "./dataSchemas"

export type DataHandle <T extends Serial>= {
  get: () => T | null
  set: (value: T) => void
  update: (func: (value: T| null) => T) => void
}


export type Store = (key:string, secret: boolean) => DataHandle<Serial>

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

export function Serial2Box(str:BoxSerial): Box<any>{
const {getCtx, api} = str as {getCtx: string, api: Record<string, string>}
  return {
    getCtx: eval(getCtx),
    api: Object.fromEntries(Object.entries(api).map(([key, func]) => [key, eval(func)]))
  }
}


export async function BoxTable(bx:BoxSerial){
  const hash = await SHA256(JSON.stringify(bx))
  const apiHashes = Object.fromEntries(await Promise.all(Object.entries(bx.api).map(([key, func]) => [key, SHA256(func + hash)]))) as Record<string, string>
  return {
    hash,
    apiHashes
  }
}


export type Server = {
  self: Person,
  request: (pubkey: PubKey, func: (self:Person, other:Person, arg: Serial) => Serial|void, arg: Serial) => Promise<void|Serial>
}



