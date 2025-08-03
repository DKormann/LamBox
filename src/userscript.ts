import { PubKey } from "./auth"
import { ArraySchema, StringSchema, cast, Primitive } from "./dataSchemas"
import { findServer, newPerson, Person } from "./userspace"




type UserSpec = {
  accept_follow: (self: Person, me: Person) => void
  accept_private_message: (self: Person, me:Person,  arg: string) => void
}


const msgSchema = ArraySchema(StringSchema)
const followListSchema = ArraySchema(StringSchema)


export const User : UserSpec = {

  accept_follow: (self: Person, me: Person) => {
    self.secretStore.updateBox<string[]>("followers", followers=> [...followers, me.pubkey], followListSchema)
    me.pubStore.updateBox<string[]>("follows", follows=> [...follows, self.pubkey], followListSchema)
  },
  accept_private_message: (self: Person, me:Person,  arg: string) =>{
    self.secretStore.updateBox<string[]>("messages", msgs => [...msgs, `${me.pubkey}: ${arg}`], msgSchema)
  }
}

const me = newPerson()
const server = findServer("http://localhost:8080", me.pubkey, User)


function send_message(target: PubKey, message: string){

  server.request(target, User.accept_private_message, message)

}


