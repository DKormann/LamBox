import { Writable } from "./store"

export type htmlKey = 'innerText'|'onclick'|'children'|'class'|'id'|'contentEditable'|'eventListeners'|'color'|'background' | 'style'

export const htmlElement = (tag:string, text:string, cls:string = "", args?:Partial<Record<htmlKey, any>>):HTMLElement =>{

  const _element = document.createElement(tag)
  _element.innerText = text
  if (cls) _element.classList.add(...cls.split('.').filter(x=>x))
  if (args) Object.entries(args).forEach(([key, value])=>{
    if (key === 'parent'){
      (value as HTMLElement).appendChild(_element)
    }
    if (key==='children'){
      (value as HTMLElement[]).forEach(c=>_element.appendChild(c))
    }else if (key==='eventListeners'){
      Object.entries(value as Record<string, (e:Event)=>void>).forEach(([event, listener])=>{
        _element.addEventListener(event, listener)
      })
    }else if (key === 'color' || key === 'background'){
      _element.style[key] = value
    }else if (key === 'style'){
      Object.entries(value as Record<string, string>).forEach(([key, value])=>{
        _element.style.setProperty(key, value)
      })
    }else{
      _element[(key as 'innerText' | 'onclick' | 'id' | 'contentEditable')] = value
    }
  })
  return _element
}





export const html = (tag:string, ...cs:(string | HTMLElement | Partial<Record<htmlKey, any>>|Writable<any>)[]):HTMLElement=>{
  let content = ''
  let children: HTMLElement[] = []
  let args: Partial<Record<htmlKey, any>> = {}
  for (let c of cs){
    if (typeof c === 'string') content += c
    else if (typeof c === 'number') content += c
    else if (c instanceof Writable){
      const el = span()
      c.subscribe((value)=>{
        console.log("value", value)
        el.innerHTML = ""
        el.appendChild(span(value))
      })
      children.push(el)
    }
    else if (c instanceof HTMLElement) children.push(c)
    else args = {...args, ...c}
  }
  return htmlElement(tag, content, "", {...args, children})
}


export type HTMLGenerator = (...cs:(string | HTMLElement | Partial<Record<htmlKey, any>> | Writable<any>)[]) => HTMLElement

export const p:HTMLGenerator = (...cs)=>html("p", ...cs)
export const h1:HTMLGenerator = (...cs)=>html("h1", ...cs)
export const h2:HTMLGenerator = (...cs)=>html("h2", ...cs)
export const h3:HTMLGenerator = (...cs)=>html("h3", ...cs)
export const h4:HTMLGenerator = (...cs)=>html("h4", ...cs)

export const div:HTMLGenerator = (...cs)=>html("div", ...cs)
export const button:HTMLGenerator = (...cs)=>html("button", ...cs) as HTMLButtonElement
export const span:HTMLGenerator = (...cs)=>html("span", ...cs) as HTMLButtonElement
export const input:HTMLGenerator = (...cs)=>html("input", ...cs) as HTMLInputElement
export const textarea:HTMLGenerator = (...cs)=>html("textarea", ...cs) as HTMLTextAreaElement

export const table:HTMLGenerator = (...cs)=>html("table", ...cs)
export const tr:HTMLGenerator = (...cs)=>html("tr", ...cs)
export const td:HTMLGenerator = (...cs)=>html("td", ...cs)
export const th:HTMLGenerator = (...cs)=>html("th", ...cs)


export const popup = (dialogfield: HTMLElement)=>{

  const popupbackground = htmlElement("div", "", "popup-background");

  popupbackground.appendChild(dialogfield);
  document.body.appendChild(popupbackground);
  popupbackground.onclick = () => {
    popupbackground.remove();
  }
  dialogfield.classList.add("popup-dialog");
  popupbackground.appendChild(htmlElement("div", "close", "popup-close", {
    onclick: () => {
      popupbackground.remove();
    }
  }))

  dialogfield.onclick = (e) => {
    e.stopPropagation();
  }

  return ()=>popupbackground.remove()

}
