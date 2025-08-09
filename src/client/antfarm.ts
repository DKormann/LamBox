import { button, div, h2, p, popup, span, table, td, tr } from "../html"
import { Writable } from "../store"


export const AntFarm = ()=>{
  const round = new Writable<number>(0)
  const State = new Writable<number[]>([0,1])
  const game = div({id:"game"})
  const price = (l:number) => {
    return l * 10
  }

  const goal = p()

  const buyItem = (l:number, num:number = 1)=>{
    const pr = price(l) * num
    const state = State.get()
    if (state[0] < pr || state.length< l)return
    state[0] -= pr
    if (state.length == l){
      state.push(0)
    }

    state[l] += num
    State.set(state,true)
  }

  const nextround = ()=>{
    const state = State.get()
    for (let i = 1; i < state.length; i++) {
      state[i-1] += state[i]
    }
    round.update(r=>r+1)
    State.set(state,true)
  }

  let maxMoney = 0;

  const gameDisplay = new Writable<HTMLElement>(div())

  State.subscribe((levels)=>{
    maxMoney = Math.max(maxMoney, levels[0])
    goal.innerText = `reach one Million Dollar! ${maxMoney/1e4} % reached.`
    if (maxMoney >= 1e6){
      goal.innerText = "You won!"
      popup(div(`You won! after only ${round.get()} rounds!`))
    }
    gameDisplay.set(div(
      {style:{
        padding:"1em",
        "padding-top":"10em",
      }},
      p("money: "+ levels[0] + "$"),
      table( {style:{margin:"auto", "text-align":"left"}},...levels.slice(1).map((level,i)=>{
        const pr = price(i+1)
        const maxnum = Math.floor(levels[0]/pr)
        return tr(
          td(`${level} level ${i+1} ants.`),
          td(button("+1 (" + price(i+1) + "$)",{onclick:()=>buyItem(i+1)})),
          td(maxnum > 1 ? button(`+${maxnum} (${maxnum*pr})`,{onclick:()=>buyItem(i+1,maxnum)}) : span())
        )
      })),
      button("next level: " + price(levels.length), {onclick:()=>buyItem(levels.length)}),
      p({style:{marginBottom:"2em"}})
    ))
  })

  game.style.paddingTop = "10em"

  return div(
    div(
      h2("Ant Farm"),
      goal,
      p("round: ",round),
      button("next round", {onclick:nextround}),
      {style:{
        position: "fixed",
        top: "0",
        textAlign: "center",
        width: "100%",
      }}
    ),
    
    gameDisplay,
    {
      id:"parent",
      style:{
      
    }}
  )
}

