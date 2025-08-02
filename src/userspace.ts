import { auth, PubKey } from "./auth"
import { Primitive } from "./boxtypes"



export type Store = {
  get: (key: string) => Primitive
  set: (key: string, value: Primitive) => void
  update: (key: string, func: (value: Primitive) => Primitive) => void
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
      }
    }
  }
}
  
