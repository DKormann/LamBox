import { htmlElement } from "../html"
import { Stored } from "../store"

const objectView = (obj: any, depth: number = 0):HTMLElement=>{

  const ws:string = " ".repeat(depth)
  if (depth > 2) return htmlElement("p", "...")
  if (obj ==null) return htmlElement("p", ws + "null")
  if (obj instanceof Array){
    const div = htmlElement("div", "")
    for (const item of obj){
      div.appendChild(objectView(item, depth + 1))
    }
    return div
  }
  if (obj instanceof Function) return htmlElement("p", ws + obj.toString())
  if (obj == undefined) return htmlElement("p", ws + "undefined")
  if (typeof obj === "string") return htmlElement("p", ws + obj)
  if (typeof obj === "number") return htmlElement("p", ws+ obj.toString())
  if (typeof obj === "boolean") return htmlElement("p", ws + obj.toString())
  if (typeof obj === "object"){
    const div = htmlElement("div", "")
    for (const [key, value] of Object.entries(obj).slice(0, 10)){
      div.appendChild(htmlElement("p", key))
      div.appendChild(objectView(value, depth + 1))
    }
    return div
  }
  return htmlElement("p", "unknown")
}


const F = 22


const fun = (cmd:string) => eval(cmd)


export function Console(url:string, evaluator : (cmd:string) => any = fun) :HTMLElement{


  const container = htmlElement("div", "")

  container.style.textAlign = "left"
  container.style.whiteSpace = "pre"
  container.style.paddingLeft = "2em"




  const input = htmlElement("input", "") as HTMLInputElement

  input.style.position = "fixed"
  input.style.padding = "1em"
  input.style.bottom = "0"
  input.style.zIndex = "1000"
  input.style.width = "90%"
  input.style.left = "1%"


  setTimeout(() => {
    input.focus()
  }, 100);

  container.appendChild(input)

  const textbox = htmlElement("div", "")
  container.appendChild(textbox)

  textbox.style.paddingBottom = "5em"


  // const cmdhist = [] as string[]
  const cmdhist = new Stored("cmdhist", [] as string[])
  let cmdhistidx = -1

  let userinput = ""



  input.addEventListener("keydown", (e: KeyboardEvent) => {
    if (e.key === "Enter") {
      cmdhistidx = -1
      cmdhist.update(e=>[...e, input.value])
      pushmsg(">> " + input.value)

      try{
        pushmsg(evaluator(input.value))
      }catch(e) {
        console.log(input.value)
        console.error(e)
        pushmsg((e as Error).message)
      }
      input.value = ""
      
    }
    if (e.key === "Escape") {
      cmdhistidx = -1
      input.value = ""
    }

    if (e.key == "ArrowUp") {
      const tlist = cmdhist.get().filter(x=>x.startsWith(userinput))
      const t = tlist[tlist.length + cmdhistidx]
      if (t) input.value = t
    }else if (e.key == "ArrowDown"){
      const tlist = cmdhist.get().filter(x=>x.startsWith(userinput))
      const t = tlist[tlist.length + cmdhistidx]
      if (t) input.value = t
      cmdhistidx += 1
    }else{
      userinput = input.value
      cmdhistidx = -1
    }
  })

  function pushmsg(msg:any){
    textbox.appendChild(
      objectView(msg)
    )
    setTimeout(() => {
      
      container.scrollTop = container.scrollHeight
    }, 100);
  }

  // pushmsg(objectView(globalThis))




  return container

}