import { button, div, h2, p, popup, span, table, td, tr } from "../html"
import { Writable } from "../store"


export const AntFarm = ()=>{
  const round = new Writable<number>(60)
  const State = new Writable<number[]>([0,1])
  const game = div({id:"game"})
  const price = (l:number) => {
    return l * 10
  }

  const goal = p()

  const buyItem = (l:number, num:number = 1)=>{
    const pr = price(l) * num
    const state = State.get()
    if (state[0] < pr)return
    state[0] -= pr
    while (state.length <= l){
      state.push(0)
      console.log(state)
    }

    state[l] += num
    State.set(state,true)
  }

  const nextround = ()=>{
    const state = State.get()
    for (let i = 1; i < state.length; i++) {
      state[i-1] += state[i]
    }
    round.update(r=>r-1)
    State.set(state,true)
  }

  let maxMoney = 0;

  const gameDisplay = new Writable<HTMLElement>(div())

  const buybutton = (amount:number, msg:string, action:()=>void) => {
    const but = button(msg, `(${amount}$)`)
    if (State.get()[0] < amount){
      but.disabled = true
    }
    but.onclick = action
    return but
  }

  State.subscribe((levels)=>{
    maxMoney = Math.max(maxMoney, levels[0])
    goal.innerText = `reach one Million Dollar! ${maxMoney/1e4} % reached.`
    if (round.get() <= 0){
      if (maxMoney >= 1e6){
        goal.innerText = "You won!"
        popup(div('You won! '+ maxMoney +' $ reached.'))
      } else {
        goal.innerText = "You lost!"
        popup(div('You lost! only '+maxMoney+ '$ reached.'))
      }
    }
    gameDisplay.set(div(
      {style:{
        padding:"1em",
        "padding-top":"10em",
      }},
      p("money: "+ levels[0] + "$"),
      table( {style:{margin:"auto", "text-align":"left"}},...(levels.slice(1).concat([0]).map((level,i)=>{
        const pr = price(i+1)
        const maxnum = Math.max(1,Math.floor(levels[0]/pr))
        return tr(
          td(`${level} level ${i+1} ants.`),
          td(buybutton(pr*maxnum, "+"+maxnum,()=>buyItem(i+1,maxnum)))
        )
      }))),
      p({style:{marginBottom:"2em"}})
    ))

    
  })


  game.style.paddingTop = "10em"

  const tut =popup(div("Your goal is to reach one million dollar but you only have 60 rounds to play. good luck!",p(), button("ok", {onclick:()=>tut.remove()})))

  return div(
    div(
      h2("Ant Farm"),
      goal,
      p("rest time: ",round),
      {style:{
        position: "fixed",
        top: "0",
        textAlign: "center",
        width: "100%",
        "background-color": "white",
      }},
      tut,
    ),
    
    gameDisplay,
    {
      id:"parent",
      style:{
      
    }},
    button("next round", {onclick:nextround}),
  )
}

