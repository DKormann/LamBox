
import { auth, PubKey, storedKey } from "./auth";
import { Box, DBTable, ServerLogin } from "./userspace";
const bob: PubKey = "npub18k3y97ke7nr9qv9c5rnnxxm0kyyxq4mu7dngzj867zh7de9a45yswakdmu"


type Message = {
  sender: string,
  content: string,
  receiver: string,
}

type msgDB = {
  msgs: DBTable<Message[]>
}

export const msgBox : Box <msgDB> = {
  getCtx : (c) =>{
    return {
      msgs : c.getTable("msgs", [] as Message[]),
    }
  },
  api : {
    sendMsg : async (ctx, arg)=>{

      const newMessage = {
        sender: ctx.self,
        receiver: ctx.other,
        content: arg as string
      }
      await ctx.msgs.update(msgs=> [...msgs, newMessage])
      await ctx.msgs.other.update(msgs => [...msgs, newMessage])

    },
    seeMsgs : (ctx, _) => ctx.msgs.get()
  }
}



let serverurl = "https://lamboxserver.duckdns.org"
serverurl = "http://localhost:8080"


const key = storedKey()

const bobkey = auth.keyFromNsec("nsec1qp3y43jmsdr665dc2gxmaxm6e5pqtyhqdr3zsfa902j2vr3tcpysrwnux0")



ServerLogin(serverurl, msgBox, bobkey)

ServerLogin(serverurl, msgBox, key).then(async conn=>{

  const resp = await conn(bobkey.pub, msgBox.api.sendMsg, "hello")
  console.log(resp)

  const msgs = await conn(key.pub, msgBox.api.seeMsgs)
  console.log(msgs)

})


