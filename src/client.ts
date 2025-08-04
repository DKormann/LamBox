
import { auth, SecKey } from "./auth"
import { Serial } from "./dataSchemas"
import { Person, DataHandle, Box, Table, ServerLogin } from "./userspace"


type Ctx = {
  msgs: Table<[string,string][]>,
}

export const msgBox : Box <Ctx> = {
  getCtx : () => {
    return {
      msgs : (p:Person) => p.store("msgs", true) as DataHandle<[string,string][]>,
    }
  },

  api : {
    putMsg: (ctx:Ctx, self:Person, other:Person, arg: Serial )=>{
      ctx.msgs(other).update(msgs => [...(msgs ?? []), arg as [string,string]])
    },
    seeMsgs: (ctx:Ctx, self:Person, other:Person, arg: Serial ):[string,string][]=>{
      return ctx.msgs(self).get() ?? []
    }
  },

}


const seckey = (localStorage.getItem("key") ?? auth.randomKey().sec) as SecKey
localStorage.setItem("key", seckey)
const pub = auth.keyFromNsec(seckey).pub


const serverurl = "http://68.183.213.170:80"

ServerLogin(serverurl, msgBox, seckey).then(async conn=>{
  await conn(pub, msgBox.api.putMsg, "hello, self")

  const resp = await conn(pub, msgBox.api.seeMsgs, pub) as [string,string][]
  console.log(resp)

})


