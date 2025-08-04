import { auth, PubKey } from "./auth"
import { ArraySchema, StringSchema, cast, Primitive } from "./dataSchemas"
import { serverLogin, newPerson, Person } from "./userspace"




type UserSpec = {
  accept_follow: (self: Person, me: Person) => void
  accept_private_message: (self: Person, me:Person,  arg: string) => void
}


const msgSchema = ArraySchema(StringSchema)
const followListSchema = ArraySchema(StringSchema)



export const User : UserSpec = {

  accept_follow: (self: Person, me: Person) => {
    self.secretStore.update<string[]>("followers", followers=> [...followers ?? [], me.pubkey])
    me.pubStore.update<string[]>("follows", follows=> [...follows ?? [], self.pubkey])
  },
  accept_private_message: (self: Person, me:Person,  arg: string) =>{
    self.secretStore.update<string[]>("messages", msgs => [...msgs ?? [], `${me.pubkey}: ${arg}`])
  }
}

const token = auth.randomKey()

const server = serverLogin("http://localhost:8080", token, User)


function send_message(target: PubKey, message: string){

  server.request(target, User.accept_private_message, message)

}


