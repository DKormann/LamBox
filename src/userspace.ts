import { auth, Key, PubKey } from "./auth"
import { setup } from "./client"
import { DataSchema, Primitive } from "./dataSchemas"

export type Store = {
  get: <T extends Primitive>(key: string) => T | null
  set: <T extends Primitive>(key: string, value: T) => void
  update: <T extends Primitive> (key: string, func: (value: T| null) => T) => void

  getBox: <T extends Primitive>(key: string, type: DataSchema) => T
  setBox: <T extends Primitive>(key: string, value: T, type: DataSchema) => void
  updateBox: <T extends Primitive>(key: string, func: (value: T| null) => T, type: DataSchema) => void
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
      update: <T extends Primitive>(key: string, func: (value: T) => T) => {
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
      get: <T extends Primitive>(key: string) => {
        throw new Error("Not implemented") 
      },
      set: <T extends Primitive>(key: string, value: T) => {
        throw new Error("Not implemented") 
      },
      update: <T extends Primitive>(key: string, func: (value: T | null) => T) => {
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

export const serverLogin = <UserSpec extends Object>(url: string, key: Key, userSpec: UserSpec): Server<UserSpec>=> {

  const con = setup(url, key);

  Object.entries(userSpec).forEach(([fname, func]) => {

    const code = func.toString().split("(self,me,arg)=>")[1]
    console.log("code:", code);
    
  })

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
