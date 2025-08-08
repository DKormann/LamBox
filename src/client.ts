import { auth, Key, PubKey, storedKey } from "./auth";
import { chatView } from "./client/chat";
import { chessView } from "./client/chess";
import { Serial } from "./dataSchemas";
import { htmlElement, popup } from "./html";
import { Writable } from "./store";
import { Box, DBRow, DBTable, ServerLogin } from "./userspace";


const location = window.location.pathname.split("/").filter(Boolean)
const localServer = location.includes("local")

let serverurl = "https://lambox.chickenkiller.com/"
if (localServer) serverurl = "http://localhost:8080"




const body = document.body;






const home = (): HTMLElement => htmlElement("div", "", "", {
  children:[
    htmlElement("h1", "Home"),
    htmlElement("p", "Welcome to the lambox"),

    ...apps.filter(x=>x.path).map(app => htmlElement("p", app.path, "", {
      onclick: () => {
        route(app.path)
      }
    }))
  ]
})



const apps : {
  init: (serverurl: string) => HTMLElement,
  path: string,
  cache? : HTMLElement
}[] = [
  {init: home, path: "", cache: undefined},
  {init: chatView, path: "chat", cache: undefined},
  {init: chessView, path: "chess", cache: undefined},

]


const path = location.filter(x=>x!='local').join('/')

route(path)


window.addEventListener("popstate", (e) => {
  route(window.location.pathname.split("/").filter(Boolean).join('/'))
})


function route(path: string){

  path = path.split("/").filter(x=>x!='local').filter(Boolean).join('/')
  
  const newpath = window.origin + "/" + [localServer? "local" : "", path].filter(Boolean).join('/')
  window.history.pushState({}, "", newpath)

  body.innerHTML = ''
  for (const app of apps){
    if (app.path === path){
      if (!app.cache){
        app.cache = app.init(serverurl)
      }
      body.appendChild(app.cache)
    }
  }
}
