
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
