
import { auth } from "./auth"
import { Serial } from "./dataSchemas"
import { Person, DataHandle, Box, Table, ServerLogin } from "./userspace"


type Ctx = {
  msgs: Table<string[]>,
}

export const msgBox : Box <Ctx> = {
  getCtx : () => {
    return {
      msgs : (p:Person) => p.store("msgs", true) as DataHandle<string[]>
    }
  },

  api : {
    putMsg: (ctx:Ctx, self:Person, other:Person, arg: Serial )=>{
      ctx.msgs(other).update(msgs => [...(msgs ?? []), arg as string])
    },
    seeMsgs: (ctx:Ctx, self:Person, other:Person, arg: Serial ):string[]=>{
      return ctx.msgs(self).get() ?? []
    }
  },

}

const key = auth.randomKey()

ServerLogin("http://localhost:8080", msgBox, key).then(async conn=>{


  await conn(key.pub, msgBox.api.putMsg, "hello, self")

  const resp = await conn(key.pub, msgBox.api.seeMsgs, key.pub)
  console.log(resp)

})


