
import { PubKey, storedKey } from "./auth";
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
      ctx.msgs.update(msgs=> [...msgs, newMessage])
      ctx.msgs.other.update(msgs => [...msgs, newMessage])

    },
    seeMsgs : (ctx, _) => ctx.msgs.get()
  }
}



const serverurl = "https://lamboxserver.duckdns.org"

const key = storedKey()

ServerLogin(serverurl, msgBox, key).then(async conn=>{

  conn(bob, msgBox.api.sendMsg, "hello")

})


