import { auth, Key, PubKey, storedKey } from "./auth";
import { htmlElement } from "./html";
import { Box, DBTable, ServerLogin } from "./userspace";

const bob = auth.keyFromNsec("nsec1qp3y43jmsdr665dc2gxmaxm6e5pqtyhqdr3zsfa902j2vr3tcpysrwnux0");
const body = document.body;

type Message = {
  self: string;
  other: string;
  content: string;
};
type msgDB = {
  msgs: DBTable<Message[]>;
  username: DBTable<string>;
};
export const msgBox: Box<msgDB> = {
  getCtx: (c) => {
    return {
      msgs: c.getTable("msgs", [] as Message[]),
      username: c.getTable("username", "anonynmous" as string),
      followers: c.getTable("followers", [] as PubKey[]),
      blocked: c.getTable("blocked", [] as PubKey[]),
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
  },
};
let serverurl = "https://lamboxserver.duckdns.org";
serverurl = "http://localhost:8080";

// const key = storedKey();

const key: Key = bob;

(async () => {
  await ServerLogin(serverurl, msgBox, bob);

  ServerLogin(serverurl, msgBox, key).then(async (con) => {
    body.appendChild(htmlElement("h1", "Logged in"));

    const msgbox = htmlElement("div", "");
    body.appendChild(msgbox);

    const usernameTable = new Map<string, string>();

    const getUsername = async (p: PubKey) => {
      if (usernameTable.has(p)) return usernameTable.get(p);
      const username = await con(p, msgBox.api.getUsername);
      usernameTable.set(p, username);
      return username;
    };

    const displayMsgs = () =>
      con(key.pub, msgBox.api.seeMsgs).then(async (msgs) => {
        msgbox.innerText = "";
        for (let m of msgs) {
          const name = await getUsername(m.self);
          const othername = await getUsername(m.other);

          msgbox.appendChild(
            htmlElement("p", `${name} -> ${othername}: ${m.content}`)
          );
        }
      });
    await con(key.pub, msgBox.api.setUsername, "bob");

    const sendbutton = htmlElement("button", "say hi");
    sendbutton.onclick = async () => {
      await con(bob.pub, msgBox.api.sendMsg, "hi");
      displayMsgs();
    };

    body.appendChild(sendbutton);

    displayMsgs();
  });
})();
