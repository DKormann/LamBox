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
  let children: HTMLElement[] = []
  let args: Partial<Record<htmlKey, any>> = {}
  for (let c of cs){
    if (typeof c === 'string') children.push(htmlElement("span", c))
    else if (typeof c === 'number') children.push(htmlElement("span", c))
    else if (c instanceof Writable){
      const el = span()
      c.subscribe((value)=>{
        el.innerHTML = ""
        el.appendChild(span(value))
      })
      children.push(el)
    }
    else if (c instanceof HTMLElement) children.push(c)
    else args = {...args, ...c}
  }
  return htmlElement(tag, "", "", {...args, children})
}


export type HTMLGenerator<T extends HTMLElement = HTMLElement> = (...cs:(string | HTMLElement | Partial<Record<htmlKey, any>> | Writable<any>)[]) => T

const newHtmlGenerator = <T extends HTMLElement>(tag:string)=>(...cs:(string | HTMLElement | Partial<Record<htmlKey, any>> | Writable<any>)[]):T=>html(tag, ...cs) as T



export const p:HTMLGenerator<HTMLParagraphElement> = newHtmlGenerator("p")
export const h1:HTMLGenerator<HTMLHeadingElement> = newHtmlGenerator("h1")
export const h2:HTMLGenerator<HTMLHeadingElement> = newHtmlGenerator("h2")
export const h3:HTMLGenerator<HTMLHeadingElement> = newHtmlGenerator("h3")
export const h4:HTMLGenerator<HTMLHeadingElement> = newHtmlGenerator("h4")

export const div:HTMLGenerator<HTMLDivElement> = newHtmlGenerator("div")
export const button:HTMLGenerator<HTMLButtonElement> = newHtmlGenerator("button")
export const span:HTMLGenerator<HTMLSpanElement> = newHtmlGenerator("span")
export const input:HTMLGenerator<HTMLInputElement> = newHtmlGenerator("input")
export const textarea:HTMLGenerator<HTMLTextAreaElement> = newHtmlGenerator("textarea")

export const table:HTMLGenerator<HTMLTableElement> = newHtmlGenerator("table")
export const tr:HTMLGenerator<HTMLTableRowElement> = newHtmlGenerator("tr")
export const td:HTMLGenerator<HTMLTableCellElement> = newHtmlGenerator("td")
export const th:HTMLGenerator<HTMLTableCellElement> = newHtmlGenerator("th")


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

  return popupbackground

}
