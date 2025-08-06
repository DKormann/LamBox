
import { auth, PubKey, storedKey } from "./auth";
import { Serial } from "./dataSchemas";
import { Box, DBRow, DBTable, ServerLogin } from "./userspace";
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



// ServerLogin(serverurl, msgBox, bobkey)

// ServerLogin(serverurl, msgBox, key).then(async conn=>{

//   // const resp = await conn(bobkey.pub, msgBox.api.sendMsg, "hello")
//   // console.log(resp)

//   // const msgs = await conn(key.pub, msgBox.api.seeMsgs)
//   // console.log(msgs)

// })



import { PersonalDBHandle } from "./userspace";

{



  async function sendRequest(key: string, person: PubKey, op: {method: "get"} | {method: "set", body: string|undefined}){
    console.log("sendRequest", key, person, op)
    return undefined
  }

  // Function to create a proxied DB handle (to prevent tampering)
  function mkHandle(person: PubKey): PersonalDBHandle {
    return new Proxy({}, {
      get(target, prop: string) {
        if (prop === 'get') {
          return (key: string) => {
            if (typeof key !== 'string' || key.length > 256 || /[^\w-]/.test(key)) { // Sanitize key: alphanum + -, max length
              throw new Error('Invalid DB key');
            }
            return sendRequest(key, person, { method: "get" });
          };
        }
        if (prop === 'set') {
          return async (key: string, value: string | undefined) => {
            if (typeof key !== 'string' || key.length > 256 || /[^\w-]/.test(key)) {
              throw new Error('Invalid DB key');
            }
            if (value !== undefined && typeof value !== 'string') {
              throw new Error('DB value must be string or undefined');
            }
            if (value && value.length > 1024 * 1024) { // Limit value size (e.g., 1MB)
              throw new Error('DB value too large');
            }
            await sendRequest(key, person, { method: "set", body: value });
          };
        }
        throw new Error(`Unauthorized access to handle property: ${prop}`);
      }
    }) as PersonalDBHandle;
  }


  function mkRow<T extends Serial>(person: PubKey, key: string, defaultValue: T): DBRow<T> {
    if (typeof key !== 'string' || key.length > 256 || /[^\w-]/.test(key)) {
      throw new Error('Invalid DB key');
    }
    const handle = mkHandle(person);
    const get = () => handle.get(key).then(v => {
      try {
        const res = v ? JSON.parse(v) as T : defaultValue;
        console.log("got", res);
        return res;
      } catch (e) {
        throw new Error('Invalid JSON in DB value');
      }
    });
    const set = (value: T | undefined) => {
      let serialized: string | undefined;
      try {
        serialized = value !== undefined ? JSON.stringify(value) : undefined;
      } catch (e) {
        throw new Error('Unable to serialize DB value');
      }
      return handle.set(key, serialized);
    };
    const update = (func: (value: T) => T | undefined) => get().then(v => set(func(v)));
    const del = () => handle.set(key, undefined);
    // Proxy the row to prevent property tampering or inspection
    return new Proxy({ get, set, update, delete: del }, {
      get(target, prop: string) {
        if (['get', 'set', 'update', 'delete'].includes(prop)) {
          return target[prop as keyof DBRow<T>];
        }
        throw new Error(`Unauthorized access to row property: ${prop}`);
      },
      set() {
        throw new Error('Cannot modify DBRow properties');
      }
    });
  }
  


  const handle = mkHandle("npub18k3y97ke7nr9qv9c5rnnxxm0kyyxq4mu7dngzj867zh7de9a45yswakdmu")
  const row = mkRow("npub18k3y97ke7nr9qv9c5rnnxxm0kyyxq4mu7dngzj867zh7de9a45yswakdmu", "test", "test")

  console.log(
    // handle.get = async (s:string)=>"evil"
    // row.get()

    row.delete
  )




}