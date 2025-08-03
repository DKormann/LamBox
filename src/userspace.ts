import { auth, PubKey } from "./auth"
import { DataSchema, Primitive } from "./dataSchemas"



export type Store = {
  get: (key: string) => Primitive
  set: (key: string, value: Primitive) => void
  update: (key: string, func: (value: Primitive) => Primitive) => void

  getBox: <T extends Primitive>(key: string, type: DataSchema) => T
  setBox: <T extends Primitive>(key: string, value: T, type: DataSchema) => void
  updateBox: <T extends Primitive>(key: string, func: (value: T) => T, type: DataSchema) => void
}


export type Person = {
  pubkey: PubKey,
  pubStore: Store,
  secretStore: Store
}

export const newPerson = (): Person => {
  const key = auth.randomKey()
  return {
    pubkey: key.pub,
    pubStore: {
      get: (key: string) => {
        throw new Error("Not implemented")
      },
      set: (key: string, value: Primitive) => {
        throw new Error("Not implemented") 
      },
      update: (key: string, func: (value: Primitive) => Primitive) => {
        throw new Error("Not implemented") 
      },
      getBox: <T extends Primitive>(key: string, type: DataSchema) => {
        throw new Error("Not implemented") 
      },
      setBox: <T extends Primitive>(key: string, value: T, type: DataSchema) => {
        throw new Error("Not implemented") 
      },
      updateBox: <T extends Primitive>(key: string, func: (value: T) => T, type: DataSchema) => {
        throw new Error("Not implemented") 
      }
    },
    secretStore: {
      get: (key: string) => {
        throw new Error("Not implemented") 
      },
      set: (key: string, value: Primitive) => {
        throw new Error("Not implemented") 
      },
      update: (key: string, func: (value: Primitive) => Primitive) => {
        throw new Error("Not implemented") 
      },
      getBox: <T extends Primitive>(key: string, type: DataSchema) => {
        throw new Error("Not implemented") 
      },
      setBox: <T extends Primitive>(key: string, value: T, type: DataSchema) => {
        throw new Error("Not implemented") 
      },
      updateBox: <T extends Primitive>(key: string, func: (value: T) => T, type: DataSchema) => {
        throw new Error("Not implemented") 
      }
    }
  }
}
  
export type Server <UserSpec extends Object> = {
  request: <Arg extends Primitive, Ret extends Primitive> (pubkey: PubKey,  func:(self:Person, other:Person, arg: Arg) => Ret|void, arg:Arg) => Promise<Ret|void>
}

export const findServer = <UserSpec extends Object>(url: string, pubkey: PubKey, userSpec: UserSpec): Server<UserSpec>=> {

  return {
    request: async <Arg extends Primitive, Ret extends Primitive > (pubkey: PubKey, func: (self:Person, other:Person, arg: Arg) => Ret|void, arg: Arg) : Promise<Ret|void> => {

      const fname = func.name
      if (!userSpec.hasOwnProperty(fname)){
        console.warn(`${fname} not found in user spec`)
      }

      const dummy_result: Ret|void = func(newPerson(), newPerson() , arg)
      return dummy_result

    }
  }
}
