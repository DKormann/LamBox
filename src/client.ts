import { auth, Key, PubKey, storedKey } from "./auth";
import { htmlElement, popup } from "./html";
import { Writable } from "./store";
import { Box, DBTable, ServerLogin } from "./userspace";

const bob = auth.keyFromNsec(
  "nsec1qp3y43jmsdr665dc2gxmaxm6e5pqtyhqdr3zsfa902j2vr3tcpysrwnux0"
);
const body = document.body;

type Message = {
  self: PubKey;
  other: PubKey;
  content: string;
};
type msgDB = {
  msgs: DBTable<Message[]>;
  username: DBTable<string>;
  followers: DBTable<PubKey[]>
  follows: DBTable<PubKey[]>
};


export const msgBox: Box<msgDB> = {
  getCtx: (c) => {
    return {
      msgs: c.getTable("msgs", [] as Message[]),
      username: c.getTable("username", "anonynmous" as string),
      followers: c.getTable("followers", [] as PubKey[]),
      follows: c.getTable("follows", [] as PubKey[]),
    };
  },
  api: {
    sendMsg: async (ctx, arg) => {
      const newMessage = {
        self: ctx.self,
        other: ctx.other,
        content: arg as string,
      };
      await ctx.msgs.update((msgs) => [...msgs, newMessage]);
      await ctx.msgs.other.update((msgs) => [...msgs, newMessage]);
    },
    seeMsgs: (ctx, _) => ctx.msgs.get(),
    setUsername: (ctx, arg) => ctx.username.set(arg as string),
    getUsername: (ctx, _) => ctx.username.other.get(),
    follow: (async (ctx) => {
      ctx.followers.other.update(fs=>[...fs, ctx.self])
      ctx.follows.update(fs => [...fs, ctx.other]);
    }),
    unfollow: (async (ctx) => {
      ctx.followers.other.update(fs => fs.filter(f => f !== ctx.self));
      ctx.follows.update(fs => fs.filter(f => f !== ctx.other));
    }),
    getFollowers: (ctx) => ctx.followers.get(),
    getFollows: (ctx) => ctx.follows.get(),
  },
};
let serverurl = "https://lamboxserver.duckdns.org";
serverurl = "http://localhost:8080";

const key = storedKey();

(async () => {
  await ServerLogin(serverurl, msgBox, bob).then(async (con) => {
    con(bob.pub, msgBox.api.setUsername, "bob");
  })

  ServerLogin(serverurl, msgBox, key).then(async (con) => {
    body.appendChild(htmlElement("h1", "Logged in"));

    // body.appendChild(htmlElement("button", "active users", "", {
      
    // }))

    const chat_partner = new Writable<PubKey> (bob.pub)


    const usernameTable = new Map<PubKey, string>();



    const getUsername = async (p: PubKey) => {
      if (usernameTable.has(p)) return usernameTable.get(p);
      const username = await con(p, msgBox.api.getUsername);
      usernameTable.set(p, username);
      return username;
    };


    const partnerpicker = htmlElement("button", "chatting with", "", {
      onclick: ()=>{

        const ulist = htmlElement("div", "")
        ulist.appendChild(htmlElement("h2", "active users"));
        const close = popup(ulist)
        usernameTable.forEach((username, pubkey) => {
          const userElement = htmlElement("p", username, "", {
            onclick: async () => {
              chat_partner.set(pubkey)
              displayMsgs();
              close();
            }
          });
          ulist.appendChild(userElement);
        })
      }
    });

    body.appendChild(partnerpicker);
    chat_partner.subscribe(async (partner) => {
      getUsername(partner).then((username) => {
        partnerpicker.innerHTML = `Chatting with ${username}`;
      });
    })



    const msgbox = htmlElement("div", "");
    body.appendChild(msgbox);


    const messageInput = htmlElement("input", "") as HTMLInputElement;
    messageInput.setAttribute("type", "text");
    messageInput.setAttribute("placeholder", "Type a message");
    body.appendChild(messageInput);

    con(bob.pub, msgBox.api.follow)
    con(bob.pub, msgBox.api.getFollows).then((follows:PubKey[]) => follows.forEach(getUsername))

    const displayMsgs = () =>
      con(key.pub, msgBox.api.seeMsgs).then(async (msgs) => {
        msgbox.innerText = "";
        for (let m of msgs) {
          if (m.self !== chat_partner.get() && m.other !== chat_partner.get()) continue;
          const name = await getUsername(m.self);
          const othername = await getUsername(m.other);

          msgbox.appendChild(
            htmlElement(
              "p",
              `${name} -> ${othername}: ${m.content}`
            )
          );
        }
      });

    await con(key.pub, msgBox.api.setUsername, "user0");

    // Define a helper that sends the current input message
    async function sendMessage() {
      const msg = messageInput.value;
      if (!msg) return;
      await con(chat_partner.get(), msgBox.api.sendMsg, msg);
      displayMsgs();
      messageInput.value = "";
    }

    const sendbutton = htmlElement("button", "send");
    sendbutton.onclick = () => sendMessage();

    // Send message on 'Enter' key, except if Shift is pressed
    messageInput.addEventListener("keydown", async (e: KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        await sendMessage();
      }
    });
    body.appendChild(sendbutton);

    displayMsgs();
  });
})();
