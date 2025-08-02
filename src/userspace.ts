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
  
export type Server <UserSpec extends Object> = {
  request_user_function: <Arg extends Primitive, Ret extends Primitive> (pubkey: PubKey, func:(self:Person, arg: Arg) => Ret|void) => Promise<(arg: Arg) => Ret|void>

}

export const findServer = <UserSpec extends Object>(url: string, pubkey: PubKey, userSpec: UserSpec): Server<UserSpec>=> {

  return {
    request_user_function: async <Arg extends Primitive, Ret extends Primitive > (pubkey: PubKey, func: (self:Person, arg: Arg) => Ret|void) : Promise<(arg: Arg) => Ret|void> => {

      const fname = func.name
      if (!userSpec.hasOwnProperty(fname)){
        console.warn(`${fname} not found in user spec`)
      }

      const dummy_result: (arg: Arg) => Ret|void = (arg: Arg) => {

        return func(newPerson(), arg)
      }

      return dummy_result

    }
  }
}
