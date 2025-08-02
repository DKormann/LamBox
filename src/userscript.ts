import { PubKey } from "./auth"
import { newPerson, Person } from "./userspace"



const msg : string = "userscript loaded"

const me = newPerson()



const User = {

  accept_follow: (self: Person, me: Person) => {
    self.store_secret("followers", me.pubkey)
    me.store_secret("follows", self.pubkey)
    return true
  }

  accept_unfollow: (self: Person, me: Person) =>{
    self.store_secret("followers", me.pubkey)
  }

}




function accep_follower(request: Person){

}



function follow(friend: Person){

  me.store_secret("follows", friend.pubkey)
  friend.store_secret("followers", me.pubkey)

  friend.requst

}




