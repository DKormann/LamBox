
import { auth, Key, PubKey } from "./auth"
import { ServerLogin } from "./client"
import { Serial } from "./dataSchemas"
import { Person, DataHandle, Box, Table } from "./userspace"


type Ctx = {
  msgs: Table<string[]>,
}

export const msgBox : Box <Ctx> = {
  getCtx : () => {
    return {
      msgs : (p:Person) => {
        return p.store("msgs", true) as DataHandle<string[]>
      }
    }
  },

  api : {
    putMsg: (ctx:Ctx, self:Person, other:Person, arg: Serial )=>{
      return ctx.msgs(self).update(msgs => [...(msgs ?? []), arg as string])
    }
  },

}

const key = auth.randomKey()

ServerLogin("http://localhost:8080", msgBox, key).then(conn=>{

  function sendMessage(other:PubKey, msg:string){
    conn(other, msgBox.api.putMsg, msg)
  }
  
})


