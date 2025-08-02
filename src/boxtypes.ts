
export type Primitive = string | number | boolean | null | Primitive [] | { [key: string]: Primitive }

export type BoxType =
  "any" |
  "string" | "number" | "boolean" | "null" |
  {tag: "array", type: BoxType} |
  {tag: "object", type: Record<string, BoxType>} |
  {tag: "union", A: BoxType, B: BoxType} | {tag: "inter", A: BoxType, B:BoxType}


export const checkType = (value: Primitive, type: BoxType) : boolean => {
  if (type === "any") return true
  if (type === "string") return typeof value === "string"
  if (type === "number") return typeof value === "number"
  if (type === "boolean") return typeof value === "boolean"
  if (type === "null") return value === null
  if (type.tag === "array"){ return Array.isArray(value) && value.every(v => checkType(v, type.type)) }
  if (type.tag === "object") {
    if (value == null) return false
    if (typeof value !== "object") return false
    if (value instanceof Array) return false
    Object.entries(type.type).every(([key, t]) => checkType(value[key], t))
  }
  if (type.tag === "union") return checkType(value, type.A) || checkType(value, type.B)
  if (type.tag === "inter") return checkType(value, type.A) && checkType(value, type.B)
  return false
}

export const BoxAny: BoxType = "any"
export const BoxString: BoxType = "string"
export const BoxNumber: BoxType = "number"
export const BoxBoolean: BoxType = "boolean"
export const BoxNull: BoxType = "null"
export const BoxArray = (type: BoxType):BoxType => ({tag: "array", type})
export const BoxObject = (obj: Record<string, BoxType>):BoxType => ({tag: "object", type: obj}) 
export const BoxUnion = (A: BoxType, B: BoxType):BoxType => ({tag: "union", A, B})
export const BoxInter = (A: BoxType, B: BoxType):BoxType => ({tag: "inter", A, B})




export const fromTs : (type: string) => BoxType = (type) => {
  switch (type){
    case "string": return BoxString
    case "number": return BoxNumber
    case "boolean": return BoxBoolean
    case "null": return BoxNull
    default: throw new Error("Invalid type")
  }
}

