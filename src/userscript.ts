import { PubKey } from "./auth"
import { BoxArray, BoxString, cast } from "./boxtypes"
import { findServer, newPerson, Person } from "./userspace"



const msg : string = "userscript loaded"

const me = newPerson()


type UserSpec = {

  accept_follow: (self: Person) => void
  accept_private_message: (self: Person, arg: string) => void
  
}


const User : UserSpec = {

  accept_follow: (self: Person) => {
    self.secretStore.update("followers", followers=>{
      const fls = (cast(followers, BoxArray(BoxString)) || []) as string[]
      return [...fls, me.pubkey]
    })
    me.pubStore.update("follows", follows=>{
      const fls = (cast(follows, BoxArray(BoxString)) || []) as string[]
      return [...fls, self.pubkey]
    })
  },

  accept_private_message: (self: Person, arg: string) =>{
    self.secretStore.update("messages", msgs =>{
      const ms = (cast(msgs, BoxArray(BoxString)) || []) as string[]
      return [...ms, `${me.pubkey}: ${arg}`]
    })

  }
}



const server = findServer("http://localhost:8080", me.pubkey, User)


function send_message(target: PubKey, message: string){

  server.request_user_function(target, User.accept_private_message).then(func => func(message))

}


