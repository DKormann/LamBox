
import { auth, SecKey } from "./auth"
import { Serial } from "./dataSchemas"
import { Person, DataHandle, Box, Table, ServerLogin } from "./userspace"


type DB = {
  msgs: Table<[string,string][]>,
}

export const msgBox : Box <DB> = {
  getCtx : () => {
    return {
      msgs : (p:Person) => p.store("msgs", true) as DataHandle<[string,string][]>,
    }
  },

  api : {
    putMsg: (ctx:DB, self:Person, other:Person, arg: Serial )=>{
      ctx.msgs(other).update(msgs => [...(msgs ?? []), [self.pubkey, arg as string]])
    },
    seeMsgs: (ctx:DB, self:Person, other:Person, arg: Serial ):[string,string][]=>{
      return ctx.msgs(self).get() ?? []
    }
  },

}

localStorage.setItem("key", localStorage.getItem("key") ?? auth.randomKey().sec)
const key = auth.keyFromNsec(localStorage.getItem("key") as SecKey)


const serverurl = "https://lamboxserver.duckdns.org"

ServerLogin(serverurl, msgBox, key).then(async conn=>{
  await conn(key.pub, msgBox.api.putMsg, "hello, self")

  const resp = await conn(key.pub, msgBox.api.seeMsgs, key.pub) as [string,string][]
  console.log(resp)

}).catch(console.error)


