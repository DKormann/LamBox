
import { PubKey, storedKey } from "../auth"
import { button, div, h1, h2, p, popup } from "../html"
import { Box, DBRow, DBTable, DefaultContext, dummyContext, ServerLogin } from "../userspace"
import { Serial } from "../dataSchemas"
import { chatView, getSocialProvider, msgBox } from "./chat"
import { Writable } from "../store"



type PieceType = "pawn" | "knight" | "bishop" | "rook" | "queen" | "king" | "kingmoved" | "rookmoved" | "pawnmoved" | "pawnmoveddouble"

type ChessPiece = {
  type: PieceType
  color: "white" | "black"
}

type Ps = ChessPiece| null
type Row = [Ps, Ps, Ps, Ps, Ps, Ps, Ps, Ps]
type Board = [Row, Row, Row, Row, Row, Row, Row, Row]


type Match = {
  white: PubKey,
  black: PubKey,
  board: Board,
  turn: "white" | "black",
  winner : "white" | "black" | "draw" | null
}

type Move = {
  start: Pos
  end: Pos
  promo: PieceType
}


const chessCtx = (c:DefaultContext):ChessContext=>{

  const startBoard:Board = [
    [{type: "rook", color: "white"}, {type: "knight", color: "white"}, {type: "bishop", color: "white"}, {type: "queen", color: "white"}, {type: "king", color: "white"}, {type: "bishop", color: "white"}, {type: "knight", color: "white"}, {type: "rook", color: "white"}],
    [{type: "pawn", color: "white"}, {type: "pawn", color: "white"}, {type: "pawn", color: "white"}, {type: "pawn", color: "white"}, {type: "pawn", color: "white"}, {type: "pawn", color: "white"}, {type: "pawn", color: "white"}, {type: "pawn", color: "white"}],
    [null, null, null, null, null, null, null, null],
    [null, null, null, null, null, null, null, null],
    [null, null, null, null, null, null, null, null],
    [null, null, null, null, null, null, null, null],
    [{type: "pawn", color: "black"}, {type: "pawn", color: "black"}, {type: "pawn", color: "black"}, {type: "pawn", color: "black"}, {type: "pawn", color: "black"}, {type: "pawn", color: "black"}, {type: "pawn", color: "black"}, {type: "pawn", color: "black"}],
    [{type: "rook", color: "black"}, {type: "knight", color: "black"}, {type: "bishop", color: "black"}, {type: "queen", color: "black"}, {type: "king", color: "black"}, {type: "bishop", color: "black"}, {type: "knight", color: "black"}, {type: "rook", color: "black"}]
  ]

  function posVec(pos:Pos):[number,number]{
    return [pos % 10, Math.floor(pos / 10)]
  }

  function vecPos(vec:[number,number]):Pos{
    return vec[0] + vec[1] * 10
  }

  if (vecPos(posVec(21)) != 21) throw new Error("posVec failed")

  function isPos(pos:Pos):boolean{
    const [x,y] = posVec(pos)
    return x >= 0 && x < 8 && y >= 0 && y < 8
  }


  function getPieceAt(board:Board, pos:Pos):ChessPiece|null{
    const [x,y] = posVec(pos)
    return board[y][x]
  }

  function setPieceAt(board:Board, pos:Pos, piece:ChessPiece|null){
    const [x,y] = posVec(pos)
    board[y][x] = piece
  }
  
  function getKing(board:Board, color:"white"|"black"):Pos|null{
    for (let i = 0; i < 8; i++) {
      for (let j = 0; j < 8; j++) {
        const piece = board[i][j]
        if (piece && piece.color === color && piece.type === "king"){
          return i * 10 + j
        }
      }
    }
    return null
  }

  
  function directions(p:ChessPiece):number[]{
    const rook = [10,-10,1,-1]
    const bish = [11, -11, 9, -9]

    if (p.type.startsWith("pawnmoved")) return p.color === "white" ? [10] : [-10]
    if (p.type.startsWith("pawn")) return p.color === "white" ? [10,20] : [-10,-20]
    if (p.type.startsWith("knight")) return [12,8,21,19,-12,8,-21,-19]
    if (p.type.startsWith("bishop")) return bish
    if (p.type.startsWith("rook")) return rook
    if (p.type.startsWith("queen")||p.type.startsWith("king")) return bish.concat(rook)
    throw new Error("unknown piece type: " + p.type)
  }

  function posadd(start:Pos, vec:[number, number]):Pos{
    const [x,y] = posVec(start)
    const [dx,dy] = vec
    return vecPos([x+dx,y+dy])
  }

  function getPossibleMoves(board:Board, pos:Pos):Pos[]{

    const piece = getPieceAt(board, pos)
    if (!piece) return []
    let res : Pos[] = []

    let ty = piece.type
    const dirs = directions(piece)
    if (ty.startsWith("pawn")){
      res = dirs
      .map((vec)=>pos+vec)
      .filter(isPos)
      .filter((p)=>getPieceAt(board,p) == null)
      const hity = piece.color == "white" ? 1 : -1


      res = res.concat(
        [1,-1]
        .map(x=>posadd(pos,[x,hity]))
        .filter(isPos)
        .filter((pos)=>{
          let target = getPieceAt(board,pos)
          if (target) return target.color != piece.color
          else{
            target = getPieceAt(board, pos - hity * 10)
            return target && target.color != piece.color && target.type == "pawnmoveddouble"
          }
        })
      )
    }else{
      const ranged = ty.startsWith("rook") || ty.startsWith("bishop") || ty.startsWith("queen")
      for (let dir of dirs){
        let pp = pos
        while(true){
          pp = pp+dir
          if (!isPos(pp)) break
          const tar = getPieceAt(board,pp)
          if (tar){
            if (piece.color !== tar.color) res.push(pp)
            break
          }
          res.push(pp)
          if (!ranged) break
        }
      }
      if (ty=="king"){
        if (getPieceAt(board, pos +1) == null && getPieceAt(board,pos + 2) == null && getPieceAt(board, pos + 3)?.type == "rook") res.push(pos +2)
        if (getPieceAt(board, pos -1) == null && getPieceAt(board,pos - 2) == null && getPieceAt(board, pos - 4)?.type == "rook") res.push(pos -2)
      }
    }
    return res
  }

  function getLegalMoves(board:Board, pos:Pos):Pos[]{

    return getPossibleMoves(board, pos)

  }

  function isInCheck(m:Match, color:"white"|"black"):boolean{
    return false
  }


  function makeMove(m:Match, move:Move):[string, Match]{

    if (m.winner != null) return ["game over", m]

    let mover = getPieceAt(m.board, move.start)
    if (!mover || mover.color !== m.turn) return ["not your turn", m]
    const legalmoves = getLegalMoves(m.board, move.start)
    if (!legalmoves.includes(move.end)) return ["illegal move", m]

    if (mover.type == "pawn" || mover.type == "king" || mover.type == "rook") mover.type += "moved"
    if (mover.type == "pawnmoved" && Math.abs(move.end - move.start) == 20) mover.type = "pawnmoveddouble" 
    if (mover.type.startsWith("pawn")){
      if (move.start%10 != move.end%10){
        if (getPieceAt(m.board, move.end) == null){
          setPieceAt(m.board, vecPos([move.end%10, Math.floor(move.start/10)]), null)
        }
      }
    }

    if (mover.type.startsWith("king")){
      const dist = move.start - move.end
      if (dist == 2){
        setPieceAt(m.board, move.end + 1, {...mover, type:"rookmoved"})
        setPieceAt(m.board, move.end - 2, null)
      }
      if (dist == -2){
        setPieceAt(m.board, move.end - 1, {...mover, type:"rookmoved"})
        setPieceAt(m.board, move.end + 1, null)
      }
    }
    setPieceAt(m.board, move.end, mover)
    if (mover.type.startsWith("pawn")){
      const y = Math.floor(move.end/10)
      if (y == 0 || y == 7) setPieceAt(m.board, move.end, {...mover, type: move.promo})
    }
    setPieceAt(m.board, move.start, null)

    m.turn = m.turn === "white" ? "black" : "white"
    if (getKing(m.board,m.turn) == null) m.winner = m.turn === "white" ? "black" : "white"

    return ["", m]
  }

  return {
    startBoard,
    hosting: c.getTable("hosting", null as Match| null),
    playing: c.getTable("playing", null as PubKey | null),
    invites: c.getTable("invites", [] as PubKey[]),
    add: (table, x) => table.update(t => t.includes(x) ? t : [...t, x]),
    makeMove,
    getLegalMoves,
  }
}

type ChessContext = {
  startBoard : Board
  hosting: DBTable<Match | null>
  playing: DBTable<PubKey | null>
  invites: DBTable<PubKey[]>
  add: <T extends Serial>(t: DBRow<T[]>, x: T) => Promise<void>
  makeMove: (m:Match, move:Move) => [string, Match]
  getLegalMoves: (board:Board, pos:Pos) => Pos[]
}

const chessBox : Box<ChessContext> = {
  getCtx : chessCtx,

  api:{

    getPlaying : async (ctx, _) => ctx.playing.get(),

    isPlaying : async (ctx, _) => true,
    sendInvite : async (ctx, _) => {
      await Promise.all([
        ctx.add(ctx.invites.other, ctx.self),
        ctx.invites.set([]),
      ])
    },
    getInvites: (ctx, _) => ctx.invites.get(),
    declineInvite: async (ctx, _) => {
      await ctx.invites.update(invites => invites.filter(invite => invite !== ctx.other) );
    },
    acceptInvite: async (ctx, _):Promise<[string, boolean]> => {

      let invites = await ctx.invites.get()
      if (!invites.includes(ctx.other)) return ["no invite", false]

      let playings = await Promise.all([
        ctx.playing.get(),
        ctx.playing.other.get(),
      ])
      if (playings.some(p=>p!=null)) return ["already playing", false]
      await Promise.all([
        ctx.playing.set(ctx.other),
        ctx.playing.other.set(ctx.self),
        ctx.invites.set([]),
        ctx.invites.other.set([]),
      ])

      await ctx.hosting.set(null)
      await ctx.hosting.other.set({
        white: ctx.other,
        black: ctx.self,
        board: ctx.startBoard,
        turn: "white",
        winner: null
      })

      return ["", true]
    },

    makeMove: async (ctx, move):Promise<Match|string> =>{

      let hosting : DBRow<Match | null> = ctx.hosting
      let match = await hosting.get()
      if (!match) hosting = ctx.hosting.other
      match = await hosting.get()
      if (!match) return "no match"

      let [err, newmatch] = ctx.makeMove(match, move as Move)

      if (err) return err
      await hosting.set(newmatch)
      if (newmatch.winner) {
        await Promise.all([
          ctx.playing.set(null),
          ctx.playing.other.set(null),
        ])
      }
      return match
    },

    resign: async (ctx, _) => {

      let hosting : DBRow<Match | null> = ctx.hosting
      let match = await hosting.get()
      if (!match) hosting = ctx.hosting.other
      await Promise.all([
        ctx.playing.set(null),
        ctx.playing.other.set(null),
        hosting.update(m =>{
          if (!m) return
          m.winner = m.white == ctx.self ? "black" : "white"
          return m
        })
      ])
    },
    getHosting: async (ctx) => ctx.hosting.other.get(),
  }
}


const pieceImages = {
  "pawn": "p",
  "knight": "N",
  "bishop": "B",
  "rook": "R",
  "queen": "Q",
  "king": "K",
  "kingmoved" :"K",
  "rookmoved": "R",
  "pawnmoved": "p",
  "pawnmoveddouble": "p"
}

type Pos = number


export const chessView =  (serverurl: string) => {

  const mykey = storedKey()


  const ctx = chessCtx(dummyContext)

  let dummyMatch = (): Match => ({
    white: mykey.pub,
    black: dummyContext.other,
    board: ctx.startBoard,
    turn: "white",
    winner: null
  })

  let match = new Writable<Match | null>(dummyMatch())

  const boardSize = (window.innerWidth < window.innerHeight ? window.innerWidth : window.innerHeight) * 0.6
  const chessBoard = div({class:"chessboard",style:{
    backgroundColor: "#f0d9b5",
    width: boardSize + "px",
    height: boardSize + "px",
    margin: "auto",
    position: "relative",
    cursor: "pointer",
  }})

  let focusPos : [number, number] | null = null

  let mkMove : (move:Move) => Promise<void> = async (move) => {
    match.update(m=>ctx.makeMove(m!, move)[1])
  }

  const displayBoard = (m:Match)=>{

    chessBoard.innerHTML = ""

    for (let j = 0; j < 8; j++) {
      for (let i = 0; i < 8; i++) {
        const square = div({class: "square"})
        square.style.width = boardSize / 8 + "px"
        square.style.height = boardSize / 8 + "px"
        chessBoard.appendChild(square)
        square.style.backgroundColor = (i + j) % 2 === 0 ? "#b58863" : "#f0d9b5"

        if (focusPos){
          if (focusPos[0] === i && focusPos[1] === j){
            square.style.backgroundColor = (i + j) % 2 === 0 ? "#c9b18f" : "#ffd7be"
          }
        }
        square.style.left = j * boardSize / 8 + "px"
        square.style.bottom = i * boardSize / 8 + "px"
        square.style.position = "absolute"
        square.onclick = e=>{

          if (focusPos && focusPos[0] === i && focusPos[1] === j){
            focusPos = null
          }else{
            if (focusPos){


              const mov:Move = {
                start: focusPos[0] * 10 + focusPos[1],
                end: i * 10 + j,
                promo: "queen"
              }
              if (ctx.getLegalMoves(m.board,mov.start).includes(mov.end)){
                mkMove(mov)
              }
            }

            focusPos = [i,j]
          }
        }

        const piece = m.board[i][j]

        if (piece){
          const pieceElement = div( pieceImages[piece.type], {class:"piece"})
          pieceElement.style.width = boardSize / 8 + "px"
          pieceElement.style.height = boardSize / 8 + "px"
          pieceElement.style.position = "absolute"
          square.appendChild(pieceElement)

          pieceElement.style.color = piece.color === "white" ? "white" : "black"
          pieceElement.style.fontWeight = "bold"
          pieceElement.style.fontSize = boardSize / 8 + "px"
        }
      }
    }
  }

  match.subscribe(m=>{
    if (m) displayBoard(m)
  })

  const currentOpponentName = new Writable<string | null>(null)
  const currentMatch = new Writable<Match | null>(null)


  const oppbanner = p()
  currentOpponentName.subscribe(op=>{
    if (op){
      oppbanner.innerText = "Playing against " + op
    }else{
      oppbanner.innerText = ""
    }
  })

  const resignbutton = button("resign")

  const container = div(
    h1("Chess"),
    p("Welcome to the chess page"),
    oppbanner,
    resignbutton,
    chessBoard
  )

  Promise.all([
    ServerLogin(serverurl, chessBox, mykey),
    getSocialProvider(serverurl)
  ]).then(async ([chessServer, social]) => {

    social.myname.subscribeLater(name=>{
      console.log("myname:",name)
    })

    function getMatch() {
      return chessServer(match.get()!.white, chessBox.api.getHosting)
    }


    let waiting = false
    setInterval(() => {

      const imwhite = match.get()?.white == mykey.pub
      if (waiting) return

      let m = match.get()
      if (!m) return
      const mycolor = imwhite ? "white" : "black"
      if (m.turn === mycolor)return
      waiting = true
      getMatch().then(m=>{
        if (m.turn === mycolor){
          match.set(m)
        }
        waiting = false
      })
    }, 200);

    async function displayMatch(){

      const opponent = await chessServer(mykey.pub, chessBox.api.getPlaying) as PubKey | null
      if (!opponent){
        return
      }

      let m = await chessServer(mykey.pub, chessBox.api.getHosting)
      console.log("my myhosting:", m)
      if (m == null){
        m = await chessServer(opponent, chessBox.api.getHosting)
        console.log("opponent hosting:", m)
      }

      match.set(m)

      console.log("match", m)
      
      if (!m) {
        currentOpponentName.set(null)
        return
      }

      if (m.winner){
        popup(div("game over"))
        return
      }

      const mycolor = match.get()!.white == mykey.pub ? "white" : "black"

      console.log("mycolor", mycolor)

      currentOpponentName.set(await social.getUsername(opponent))
      
      resignbutton.onclick = async ()=>{
        await chessServer(opponent, chessBox.api.resign)
      }


      mkMove = async (move: Move) => {
        console.log("move", move)
        const resp = await chessServer(opponent, chessBox.api.makeMove, move) as string | Match
        console.log("resp", resp)
        if (typeof resp === "string"){
        }else{
          match.set(resp)
        }
      }
    }

    displayMatch()

    async function inviteFriend(pubkey: PubKey){
      if (await chessServer(pubkey, chessBox.api.isPlaying).catch(e=>false)){
        chessServer(pubkey, chessBox.api.sendInvite)
        social.con(pubkey, msgBox.api.sendMsg, "I sent you an invitation to play chess")
        popup(div("invitation sent!"))
      }else{
        const close = popup(div(
          h2("this user doesnt have chess"),
          button("send them an invite message", {
            onclick: async ()=>{
              await social.con(pubkey, msgBox.api.sendMsg, "Wanna play chess with me?")
              close()
              popup(div("message sent!"))
            }
          }
        )))
      }
    }

    social.loaded.subscribe(loaded=>{
      if (!loaded) return
      container.appendChild(
        div(
          button("Play against a friend", {
            onclick: () => {
              const close = popup(div(
                h2( "Play against a friend"),

                (()=>{
                  const invitebox = div()

                  chessServer(mykey.pub, chessBox.api.getInvites).then((invites:PubKey[])=>{
                    invitebox.appendChild(p("Invites:"))
                    invites.forEach(invite=>{
                      social.getUsername(invite).then(username=>{
                        invitebox.appendChild(button(username,{onclick:()=>{
                          chessServer(invite, chessBox.api.acceptInvite).then(([msg, ok])=>{
                            if (ok){
                              console.log({msg})
                              popup(div("game accepted!"))
                              displayMatch()
                            }else{
                              popup(div(msg))
                            }
                          })
                        }
                      }))
                      })
                    })
                  })                  
                  return invitebox
                })(),
                p( "Select a friend to play against"),
                ... Array.from(social.nameTable.get().entries()).map(([pubkey, username]) => {
                  return p(
                    button(username, {
                      onclick: () => {
                        inviteFriend(pubkey)
                        close()
                      }
                    }))
                  }),
                button("Cancel", {onclick: () => close()})
              ))
            },
          }),
        )
      )
    })
  })



  return container
}