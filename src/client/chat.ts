

import { bob, PubKey, storedKey } from "../auth";
import { Serial } from "../dataSchemas";
import { htmlElement, popup } from "../html";
import { Writable } from "../store";
import { Box, DBRow, DBTable, ServerLogin } from "../userspace";




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
  add:<T extends Serial>(t:DBRow<T[]>, x:T) => Promise<void>
};


export const msgBox: Box<msgDB> = {
  getCtx: (c) => {
    return {
      msgs: c.getTable("msgs", [] as Message[]),
      username: c.getTable("username", "anonynmous" as string),
      followers: c.getTable("followers", [] as PubKey[]),
      follows: c.getTable("follows", [] as PubKey[]),
      add:(table, x) => table.update(t=>t.includes(x)?t:[...t,x])
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
      await ctx.add(ctx.followers.other, ctx.self);
      await ctx.add(ctx.follows, ctx.other);
    }),
    unfollow: (async (ctx) => {
      await ctx.followers.other.update(fs => fs.filter(f => f !== ctx.self));
      await ctx.follows.update(fs => fs.filter(f => f !== ctx.other));
    }),
    getFollowers: (ctx) => ctx.followers.other.get(),
    getFollows: (ctx) => ctx.follows.other.get(),
  },
};


const key = storedKey();





export function chatView(serverurl: string) : HTMLElement{

  const container = htmlElement("div", "");
  ServerLogin(serverurl, msgBox, bob).then(async (con) => {
    con(bob.pub, msgBox.api.setUsername, "bob");

  }).then(()=>{

    ServerLogin(serverurl, msgBox, key).then(async (con) => {
      const header = htmlElement("h1", "Logged in as ")
      container.appendChild(header);
      const usernameButton = htmlElement("button", "", "",);
      usernameButton.onclick = ()=>{
        const dia = htmlElement("div", "")
        const close = popup(dia);
        dia.appendChild(htmlElement("h2", "Change Username"));
        const input = htmlElement("input", "") as HTMLInputElement;
        input.value = myname.get();
        input.addEventListener("keydown", async (e: KeyboardEvent) => {
          if (e.key === "Enter") {
            con(key.pub, msgBox.api.setUsername, input.value).then(()=>{
              myname.set(input.value);
            })
            close();
          }
        });
        input.focus();
        dia.appendChild(input);
      }
      header.appendChild(usernameButton);



      const chat_partner = new Writable<PubKey> (bob.pub)
      const myname = new Writable<string>("anonynmous");

      con(key.pub, msgBox.api.getUsername).then((username) => {
        myname.set(username);
      })

      myname.subscribe((name) => {
        usernameButton.innerHTML = name;
      });

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
          if (loading){
            ulist.appendChild(htmlElement("p", "loading...", "", {style: {color: "gray"}}))
          }
        }
      });

      container.appendChild(partnerpicker);
      chat_partner.subscribe(async (partner) => {
        getUsername(partner).then((username) => {
          partnerpicker.innerHTML = `Chatting with ${username}`;
        });
      })


      let loading = true


      const msgbox = htmlElement("div", "");
      container.appendChild(msgbox);


      const messageInput = htmlElement("input", "") as HTMLInputElement;
      messageInput.setAttribute("type", "text");
      messageInput.setAttribute("placeholder", "Type a message");
      container.appendChild(messageInput);

      con(bob.pub, msgBox.api.follow)
      .then(()=>{

        con(bob.pub, msgBox.api.getFollowers).then((follower:PubKey[]) => {
          Promise.all(follower.map(getUsername)).then(()=>{
            loading = false
          })
        })

      })

      const displayMsgs = () =>
        con(key.pub, msgBox.api.seeMsgs).then(async (msgs) => {
          msgbox.innerText = "";
          for (let m of msgs) {
            if (m.self !== chat_partner.get() && m.other !== chat_partner.get()) continue;
            const name = await getUsername(m.self);
            msgbox.appendChild(
              htmlElement(
                "p",
                `${name}: ${m.content}`
              )
            );
          }
        });


      async function sendMessage() {
        const msg = messageInput.value;
        if (!msg) return;
        await con(chat_partner.get(), msgBox.api.sendMsg, msg);
        displayMsgs();
        messageInput.value = "";
      }

      const sendbutton = htmlElement("button", "send");
      sendbutton.onclick = () => sendMessage();
      messageInput.addEventListener("keydown", async (e: KeyboardEvent) => {
        if (e.key === "Enter" && !e.shiftKey) {
          e.preventDefault();
          await sendMessage();
        }
      });
      container.appendChild(sendbutton);

      displayMsgs();
    })
  })

  return container;
}
