import { auth, Key, PubKey, storedKey } from "./auth";
import { chatView } from "./client/chat";
import { chessView } from "./client/chess";
import { Console } from "./client/consola";
import { Serial } from "./dataSchemas";
import { htmlElement, popup } from "./html";
import { Writable } from "./store";
import { Box, DBRow, DBTable, ServerLogin } from "./userspace";


const appname = "LamBox"

document.title = appname


type Location= {
  serverLocal: boolean,
  frontendLocal: boolean,
  path: string[]
} 

function getLocation():Location{

  const items = window.location.pathname.split("/").filter(Boolean)

  const serverLocal = items.includes("local")
  const frontendLocal = ! items.includes(appname)
    
  return {
    serverLocal,
    frontendLocal,
    path: items.filter(x=>x!='local' && x!= appname)
  }
}


let location  = getLocation()

const serverurl = location.serverLocal ? "http://localhost:8080" : "https://lambox.chickenkiller.com/"


const body = document.body;


const home = (): HTMLElement => htmlElement("div", "", "", {
  children:[
    htmlElement("h1", "Home"),
    htmlElement("p", "Welcome to the lambox"),

    ...apps.filter(x=>x.path).map(app => htmlElement("p", "", "", {children:[htmlElement("button", app.path, "", {
      onclick: () => {
        route(app.path.split('/'))
      }
    })]}))
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
  {init: url => Console(url, cmd => eval(cmd)), path: "console", cache: undefined},

]

route(location.path)


window.addEventListener("popstate", (e) => {
  location = getLocation() 
  route(location.path)
})


function route(path: string[]){


  let  newpath = (location.serverLocal? "local" : "") + "/" + (location.frontendLocal? "" : appname) + "/" + path.join('/')
  newpath = window.location.origin + "/" + newpath.split("/").filter(Boolean).join('/')
  
  window.history.pushState({}, "", newpath)
  body.innerHTML = ''
  for (const app of apps){
    if (app.path === path.join('/')){
      if (!app.cache){
        app.cache = app.init(serverurl)
      }
      body.appendChild(app.cache)
    }
  }
}
