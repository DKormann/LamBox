
export type Primitive = string | number | boolean | null | Primitive [] | { [key: string]: Primitive }

export type DataSchema =
  "any" |
  "string" | "number" | "boolean" | "null" |
  {tag: "array", type: DataSchema} |
  {tag: "item", key: string, value: DataSchema} |
  {tag: "union", A: DataSchema, B: DataSchema} |
  {tag: "inter", A: DataSchema, B:DataSchema}


export const checkType = (value: Primitive, type: DataSchema) : boolean => {
  if (type === "any") return true
  if (type === "string") return typeof value === "string"
  if (type === "number") return typeof value === "number"
  if (type === "boolean") return typeof value === "boolean"
  if (type === "null") return value === null
  if (type.tag === "array"){ return Array.isArray(value) && value.every(v => checkType(v, type.type)) }
  if (type.tag === "item"){
    if (typeof value != "object") return false
    const k = (value as { [key: string]: Primitive | undefined })[type.key]
    if (k == undefined) return false
    return checkType(k, type.value)
  }
  if (type.tag === "union") return checkType(value, type.A) || checkType(value, type.B)
  if (type.tag === "inter") return checkType(value, type.A) && checkType(value, type.B)
  return false
}

export const AnySchema: DataSchema = "any"
export const StringSchema: DataSchema = "string"
export const NumberSchema: DataSchema = "number"
export const BooleanSchema: DataSchema = "boolean"
export const NullSchema: DataSchema = "null"
export const ArraySchema = (type: DataSchema):DataSchema => ({tag: "array", type})
export const ItemSchema = (key: string, value: DataSchema):DataSchema => ({tag: "item", key, value})
export const ObjectSchema = (obj: Record<string, DataSchema>):DataSchema => {
    const itr = Object.entries(obj)
    return itr.slice(1).reduce((acc:DataSchema, [key, value]) => UnionSchema(acc, ItemSchema(key, value)), ItemSchema(itr[0][0], itr[0][1]))
  }
export const UnionSchema = (A: DataSchema, B: DataSchema):DataSchema => ({tag: "union", A, B})
export const InterSchema = (A: DataSchema, B: DataSchema):DataSchema => ({tag: "inter", A, B})


export function cast(value: Primitive, type: DataSchema): Primitive {
  if (checkType(value, type)) return value
  return null
}
