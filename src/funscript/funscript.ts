// import { htmlElement } from "./_html"
// import { assertEq, assertErr, last, log, stringify, Res, Ok, Err, ok, err, assert } from "./helpers"

export {}


type code = {
  type: string,
  start: number,
  end: number,
}


export type token = code & {value:string, type: "number" | "string" | "boolean" | "null" | "identifier" | "symbol" | "typo" | "whitespace" | "comment"}

const symbols = ["(", ")", "{", "}", "[", "]", "=>", ",", ":", "?", "=>", "!", "&&", "||", "+", "-", "*", "/", "%", "<", ">", "<=", ">=", "==", "!=", "=", ";", "...", ".", "//"]

export const seek = (code:string, start:number, pred: (c:string, i:number)=>boolean):number =>{
  const off = code.slice(start).split('').findIndex(pred)
  return off == -1 ? code.length : start + off
}

export const tokenize = (code:string, i:number=0, tid = 0):token[] =>{
  if (code.length <= i) return []
  const comp = (name:string) => code.slice(i, i+name.length) == name
  const [typ, nxt] :[token["type"], number]= 
  code[i].trim() == "" ? ["whitespace", seek(code, i, c=>c.trim() != "")]:
  code[i] == '"' ? ["string", seek(code, i+1, c=>c == '"') + 1]:
  code[i] == "'" ? ["string", seek(code, i+1, c=>c == "'") + 1]:
  code[i].match(/[0-9]/) ? ["number", seek(code, i, c=>!c.match(/[0-9]/))]:
  comp("//") ? ["comment", seek(code, i, c=>c == '\n')]:
  comp("true") ? ["boolean", i+4]:
  comp("false") ? ["boolean", i+5]:
  comp("null") ? ["null", i+4]:
  code[i].match(/[a-zA-Z_]/) ? ["identifier", seek(code, i, c=>!c.match(/[a-zA-Z0-9_]/))]:
  (symbols.map(s=>comp(s) ? ["symbol" as token['type'], i+s.length]:null).find(x=>x != null) ||
  ["typo", i+1] as [token["type"], number]) as [token["type"], number]
  assertEq(nxt > i, true, "tokenize error "+typ)
  return [{type:typ, value:code.slice(i, nxt), start:i, end:nxt}, ...tokenize(code, nxt, tid+1)]
}

export type ast = nullary | unary | binary | ternary | nary

type nullary = code & {type:"number" | "string" | "boolean" | "null" | "identifier" | "typo", children:[], value:string}
type unary = code & {type:"!" | "neg" | "..."} & {children: [ast]}
type binary = code & {type:"+" | "-" | "*" | "/" | "%" | "<" | ">" | "<=" | ">=" | "==" | "!=" | "&&" | "||" | "app" | "=>" | "index" | "[]" | ":"} & {children: [ast, ast]}
type ternary = code & {type:"?:" | "=;"} & {children: [ast, ast, ast]}
type nary = code & {type:"{}" | "[]" | "()"} & {children: ast[]}

const ternaryops = ["?:", "=;"]
const symbolpairs = [["(", ")"], ["{", "}"], ["[", "]"], ["?", ":"], ["=", ";"]]

const binaryops = ["+", "-", "*", "/", "%", "<", ">", "<=", ">=", "==", "!=", "&&", "||", "app", "=>", "index",]
const unaryops = ["!", "neg", "..."]

const assertEq = (a: any, b: any, msg?: string) => {
  if (a !== b) throw new Error(msg || `assertion failed: ${a} !== ${b}`)
}

const newast = <T extends ast >(type:T["type"], start:number, end:number, children:ast[] = []):T =>{
  if (binaryops.includes(type)) assertEq(children.length, 2, "newast error "+type)
  if (ternaryops.includes(type)) assertEq(children.length, 3, "newast error "+type)
  const res = {type, start, end, children: children} as T
  return res
}

const last = <T>(arr:T[]):T => arr[arr.length-1]

export const parse = (tokens:token[]): ast => {

  const nonw = (idx:number): number =>
    tokens[idx] == undefined? -1 :tokens[idx].type == "whitespace" || tokens[idx].type == "comment" ? nonw(idx+1): idx

  const nexttok = (prev: code| ast):number =>nonw(tokens.findIndex(t=>t.start >= prev.end))

  const iden2string = (iden:nullary):nullary =>
    (iden.type == "identifier") ? {...iden, type:"string", value:`"${iden.value}"`}: iden

  const parseKV = (idx:number):ast =>{
    const k = parseexpr(idx)
    if (k.type == 'typo') return k
    const colon = tokens[nexttok(k)]
    if (colon == undefined) return {...k, type:"typo", value:"expected : or } after {", children:[]}
    if (k.type == "...") return k
    if (colon.value == ":") {
      const v = parseexpr(nexttok(colon))
      return newast(":", k.start, v.end, [k.type=="identifier"? iden2string(k):k, v])
    }
    return k
  }

  const parsegroup = (opener:token , idx: number):nary|nullary => {
    const closer = symbolpairs.find(s=>s[0] == opener.value)?.[1]
    if (closer == undefined) throw new Error("parsegroup error "+ opener.value+ " not an opener")
      const type = "?=".includes(opener.value)? "()" : opener.value + closer  as (nary)["type"]
    const tok = tokens[idx]
    if (tok == undefined) return {type: "typo", value: `end of input. expected ${closer} because of ${opener.value}`, start: opener.start, end: last(tokens).end, children:[]}
    if (tok.value == closer) return {type, children:[], start: opener.start, end: tok.end}
    if (tok.value == ",") return parsegroup(opener, nexttok(tok))
    if ("])};:".includes(tok.value)) return {type: "typo", value: `cant parse ${type}. expected ${closer} because of ${opener.value}`, start: tok.start, end: tok.end, children:[]}

    const child = type == "{}" ? parseKV (idx) : parseexpr(idx)
    if (child.type == "typo") return child
    const rest = parsegroup(opener, nexttok(child))

    return rest.type == "typo" ? rest : newast(type, opener.start, rest.end, [child, ...rest.children])
  }


  const astnode = (type:(ast)["type"], children:ast[]) => ({
    type,
    children,
    start: children[0].start,
    end: last(children).end,
    value: ""
  }) as ast

  const parsecontinue = (first:ast):ast => {
    const nextop = tokens[nexttok(first)]
    if (nextop == undefined) return first
    if (nextop.type == "symbol"){
      if ("[(".includes(nextop.value)){
        const grp = parsegroup(nextop, nexttok(nextop))
        const op = nextop.value == "(" ? "app" : "index"
        if ( nextop.value== '[' && grp.children.length != 1) return parsecontinue({...grp, type:"typo", value: op + " expects one arg", children:[]} as ast)
        const newNode = {
          ...grp,
          type:op,
          start:first.start,
          end:grp.end,
          children:[first, nextop.value == "[" ? grp.children[0] : grp]} as binary
        return parsecontinue(newNode)
      }
      
      const op: ast["type"] =
        (nextop.value == ".") ? "index" :
        (nextop.value == "?")? "?:":
        (nextop.value == "=")? "=;":
        (nextop.value as ast['type'])

      if (binaryops.includes(op)){
        const second = parseindivisible(nexttok(nextop))
        const newNode = astnode(op, [first, nextop.value == "." ? iden2string(second as nullary):second])
        return parsecontinue(newNode)
      }

      if (ternaryops.includes(op)){
        const grp = parsegroup(nextop, nexttok(nextop))
        const els = parseexpr(nexttok(grp))
        return parsecontinue(astnode(op, [first, grp.children[0] || grp, els]))
      }
    }
    return first
  }

  const parseatom = (idx:number):nullary|undefined =>  (["number", "string", "boolean", "null", "identifier"].includes(tokens[idx].type)) ? {...tokens[idx], children:[]} as nullary: undefined

  const parseindivisible = (idx:number):nullary|unary|nary => {
    const tok = tokens[idx]
    const typo = {...tok, type:"typo", value:"unexpected "+ (tok?.value ??  "end of input"), children:[]} as nullary
    if (tok == undefined) return typo
    const op = (tok.value == '-')? "neg": tok.value
    const res:nary|unary|nullary  = tok.type == "symbol" ?
      "({[".includes(op) ? parsegroup(tok, nonw(idx+1)) as nary:
      unaryops.includes(op) ? astnode(op as unary['type'], [parseindivisible(nexttok(tok))]) as unary:
      typo
    :parseatom(idx) ?? typo
    return res
  }

  const parseexpr = (idx:number):ast=> parsecontinue(parseindivisible(idx))

  const res= parseexpr(nonw(0))

  // @ts-expect-error
  assert (!res.children.includes(undefined))

  if (nexttok(res) != -1) return {...res, start:0, end:last(tokens).end, type:"typo", value:"expected end "+tokens[nexttok(res)].value, children:[]}
  return res
}


export const build = (ast:ast):string =>{

  const errs = flat_errors(ast)
  if (errs.length > 0) throw new Error(errs.map(e=>e.value).join('\n'))

  const sfill = (template:string):string => template.replace(/{}/g, ()=>build(ast.children.shift() as ast))
  return ast.type == "number" || ast.type == "boolean" || ast.type == "null" || ast.type == "identifier" || ast.type == "string" ? ast.value:
  "({[".includes(ast.type[0]) ? `${ast.type[0]}${ast.children.map(
    ast.type == "{}" ? (e)=>
      e.type == "identifier" ? `"${e.value}":${e.value}`:
      e.type == ":" ? e.children.map(build).join(":") :
      (e.type != "..." ? "..." : "" )+ build(e)
    : build
  
  ).join(",")}${ast.type[1]}`:


  (ast.type == "app")? sfill("({}{})"):
  (ast.type == "index")? sfill("({}[{}])"):
  (ast.type == 'neg')? `-${build(ast.children[0])}`:
  (ast.type == '=>')? sfill("({}=>({}))"):
  ast.type == ":" ? sfill("{{}:{}}"):
  ast.children.length == 2 ? sfill(`({}${ast.type}{})`):
  ast.children.length == 1 ? `${ast.type}${build(ast.children[0])}`:
  ast.type == "=;" ? sfill("(()=>{{} = {};\nreturn {}})()"):
  ast.type == "?:" ? sfill(`({}?{}:\n{})`):
  ast.type == "typo" ? (()=>{throw new Error(`${ast.value}`)})():
  (()=>{throw new Error("not implemented: "+ast.type)})()
}

export const operator_weight = (op: ast['type']): number =>
  op === "app" || op === "index" ? 15 :
  unaryops.includes(op) ? 13 :     // Unary operators
  op === "*" || op === "/" || op === "%" ? 12 :
  op === "+" || op === "-" ? 11 :
  op === "<" || op === ">" || op === "<=" || op === ">=" || op === "==" || op === "!=" ? 10 :
  op === "&&" || op === "||" ? 9 :
  op === ":" ? 9 :
  op === "?:" || op === "=;" ? 8 :
  op === "=>" ? 7 :

  // op === "()" || op === "[]" || op === "{}" ? 6 :
  
  -1;


const assert = (cond: boolean, msg?: string) => {
  if (!cond) throw new Error(msg || "assertion failed")
}


const stringify = (ast:ast):string => {
  if (ast.type == "number" || ast.type == "boolean" || ast.type == "null" || ast.type == "identifier" || ast.type == "string") return ast.value
  if (ast.type == "typo") return "typo: "+ast.value
  return ast.type + " " + ast.children.map(stringify).join(" ")
}

export const rearange = (nod:ast):ast => {
  assert(nod != undefined, "rearange error")

  //@ts-expect-error
  if (nod.children.includes(undefined)) throw new Error("rearange error "+ stringify(nod))
  const node = {...nod, children:nod.children.map(rearange)} as ast


  if (binaryops.concat(":").includes(node.type)){
    const [fst, snd] = node.children

    if ((binaryops.includes(fst.type) || ternaryops.includes(fst.type) || unaryops.includes(fst.type))
      && (operator_weight(fst.type) < operator_weight(node.type) || fst.type == "=>" && node.type == "=>")){
      return rearange({...fst, children:[...fst.children.slice(0, -1), {...node, children:[fst.children.slice(-1)[0], snd]}]} as ast)
    }
  }
  if (ternaryops.includes(node.type)){

    assertEq(node.children.length, 3, "rearange error" +stringify(node))
    const [fst, snd, trd] = node.children
    if (binaryops.includes(fst.type) && operator_weight(fst.type) < operator_weight(node.type)){
      return rearange({...fst, children:[(fst.children[0]), {...node, children:[fst.children[1], snd, trd]}]} as ast)
    }
  }
  return node
}

const compile =(s:string) => build((rearange((parse(tokenize(s))))))

export const getAst = (tokens:token[]):ast => rearange(parse(tokens))

export const execAst = (parsed:ast):any => {

  const compt = build(parsed)
  try{

    // const args = {stringify, assert, assertEq, print:console.log}
    const args = {}
    const FN = Function(...Object.keys(args), "return "+compt)
    return FN(...Object.values(args))
  }catch(e){
    throw new Error("runtime error in:" + compt + "\n" + (e as Error).message)
  }
}

const runfun = (code:string):any =>execAst(getAst(tokenize(code)))

type colored_line = {code:string, cls:string}[]

const range = (start:number, end:number):number[] => Array.from({length:end-start}, (_,i)=>i+start)

export const flat_errors = (ast:ast):token[] =>
  ast.type == "typo" ? [ast]:
  ast.children.map(flat_errors).flat()

export const highlighted = (toks: token[], ast:ast):{cls:string}[][] =>{

  const errors = new Set<number>(flat_errors(ast).map(e=>range(e.start, e.end)).flat())

  const chs:colored_line[][] = toks.map(tok=> tok.value.split("\n").map(s=>[{code:s, cls:
    (errors.has(tok.start) || errors.has(tok.end) ? '.err.' : '.')+
    (tok.type == "typo" ? 'red' :
    tok.type == "identifier" || tok.type == "number" || tok.value=='.' ? "code1" :
    tok.type=="string" || tok.type == "boolean" || tok.type== "comment" ? "code2" :
    "?:=;".includes(tok.value) ? "code3" :
    tok.type == "symbol" ? "code4" :
    "")}]))
  const lines =  chs.slice(1).reduce((p, c)=>[...p.slice(0,-1), [...last(p), ...c[0]], ...c.slice(1)], chs[0]??[[]])
  
  return lines.map(l=>l.map(c=>c.code.split('').map(ch=>({cls:c.cls}))).flat())
}



{

  const code = "function(){}"
  console.log(code)
  const toks = tokenize(code)
  const ast = getAst(toks)
  const res = execAst(ast) as ast
  console.log("res:",res.toString())

}