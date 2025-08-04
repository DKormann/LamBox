import { Event, EventTemplate, finalizeEvent, generateSecretKey, getPublicKey, nip19, verifyEvent } from 'nostr-tools';


export type PubKey = nip19.NPub
export type SecKey = nip19.NSec


export type Auth = {
  keyFromNsec : (s:SecKey) => Key
  randomKey : () => Key
  checkEvent : (e:Event) => boolean
}

export const auth: Auth = {
  keyFromNsec : (sec:SecKey) => {
    return {
      pub:getPub(sec),
      sec,
      sign : (content:string) => signEvent(content, sec)
    }
  },

  randomKey : () => {
    const sec = nip19.nsecEncode(generateSecretKey())
    return auth.keyFromNsec(sec)
  },
  checkEvent : (e:Event) => verifyEvent(e)
}


export type Key = {
  pub : PubKey,
  sec : SecKey,
  sign : (content:string) => Event
}

function secFromString(str: string): SecKey {
  if (str.startsWith("nsec1")) return str as SecKey
  const dec=  nip19.decode(str)
  if (dec.type !== "nsec") throw new Error("Invalid secret key")
  return nip19.nsecEncode(dec.data)
}

function getPub(sec: SecKey): PubKey {
  const decoded = nip19.decode(sec)
  if (decoded.type !== "nsec") throw new Error("Invalid secret key")
  const pub = nip19.npubEncode(getPublicKey(decoded.data))
  if (pub.startsWith("npub1")) return pub as PubKey
  else throw new Error("Invalid public key")
}


export const signEvent = (content:string, secKey:SecKey) : Event=>{
  let event : EventTemplate= {
    kind:1,
    tags:[],
    content,
    created_at:Math.floor(Date.now() / 1000),
  }
  return finalizeEvent(event, nip19.decode(secKey).data)
}


export type {Event}