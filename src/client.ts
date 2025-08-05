
import { auth, PubKey, SecKey } from "./auth"
import { Serial } from "./dataSchemas"
import { htmlElement } from "./html"
import { Person, DataHandle, Box, Table, ServerLogin } from "./userspace"

const body = document.body


const bob: PubKey = "npub18k3y97ke7nr9qv9c5rnnxxm0kyyxq4mu7dngzj867zh7de9a45yswakdmu"


localStorage.setItem("key", localStorage.getItem("key") ?? auth.randomKey().sec)
let key = auth.keyFromNsec(localStorage.getItem("key") as SecKey)

body.appendChild(htmlElement("h1", "Chat App"))

let accountButton  = htmlElement("h3", "switch account")
body.appendChild(accountButton)

accountButton.addEventListener("click", () =>{
  const newKey = window.prompt("Enter your key", key.sec)
  if (newKey && newKey.startsWith("nsec")) {
    localStorage.setItem("key", newKey)
    key = auth.keyFromNsec(newKey as SecKey)
  }
})

let accountDeleteButton  = htmlElement("h3", "delete account")
body.appendChild(accountDeleteButton)
accountDeleteButton.addEventListener("click", () => {
  if (!window.confirm("Are you sure you want to delete your account?")) return
  key = auth.randomKey()
  localStorage.setItem("key", key.sec)
})




type PTable = Table<PubKey[]>
type TableFun <T extends Serial> = (p:Person, table: Table<T[]>, item:T) => void

type msgDB = {
  msgs: Table<[string,string][]>,
}

export const msgBox : Box <msgDB> = {
  getCtx : () => {
    return {
      msgs : (p:Person) => p.store("msgs", true, [] as [string,string][]),
    }
  },

  api : {
    putMsg: (ctx:msgDB, self:Person, other:Person, arg: Serial )=>{
      ctx.msgs(other).update(msgs => [...(msgs ?? []), [self.pubkey, arg as string]])
    },
    seeMsgs: (ctx:msgDB, self:Person, other:Person, arg: Serial ):[string,string][]=>{
      return ctx.msgs(self).get() ?? []
    }
  },
}




type FollowerDB = {
  newtable : <T extends Serial> (key:string, secret:boolean, defaultVal:T) => Table<T>,
  followers: PTable, following: PTable, blocked: PTable,
  remove: TableFun<PubKey>,
  add: TableFun<PubKey>,
}

export const followerBox : Box <FollowerDB> = {
  getCtx : () => {
    const newtable = <T extends Serial>(key:string, secret:boolean, defaultVal:T) => ((p:Person) => p.store(key, secret, defaultVal)) as Table<T>
    const followers = newtable("followers", false, [] as PubKey[])
    const following = newtable("following", false, [] as PubKey[])
    const blocked = newtable("blocked", true, [] as PubKey[])
    return {
      newtable,
      followers,
      following,
      blocked,
      remove : (p, tab, t) => tab(p).update(items => (items ?? []).filter(item => item !== t)),
      add : (p, tab, t) => tab(p).update(items => (items??[]).includes(t) ? items! : [...(items ?? []), t]),
    }
  },
  api : {
    follow: (ctx:FollowerDB, self:Person, other:Person, arg: Serial )=>{
      ctx.add(self, ctx.followers, other.pubkey)
      ctx.add(other, ctx.following, self.pubkey)
    },
    seeFollowers: (ctx:FollowerDB, self:Person, other:Person, arg: Serial )=> ctx.followers(other).get(),
    seeFollowing: (ctx:FollowerDB, self:Person, other:Person, arg: Serial )=> ctx.following(other).get(),

    block: (ctx:FollowerDB, self:Person, other:Person, arg: Serial )=> ctx.add(self, ctx.blocked, other.pubkey),
    unblock: (ctx:FollowerDB, self:Person, other:Person, arg: Serial )=> ctx.remove(self, ctx.blocked, other.pubkey),
    seeBlocked: (ctx:FollowerDB, self:Person, other:Person, arg: Serial )=> ctx.blocked(self).get() ?? [],
  }
}

const serverurl = "https://lamboxserver.duckdns.org"

ServerLogin(serverurl, msgBox, key).then(async conn=>{
  const resp = await conn(key.pub, msgBox.api.seeMsgs, key.pub) as [string,string][]

  resp.forEach(([pubkey, msg])=>{
    document.body.appendChild(htmlElement("p", `${pubkey}: ${msg}`))
  })

}).catch(console.error)


