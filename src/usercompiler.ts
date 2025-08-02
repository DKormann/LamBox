
import fs from "fs"
import ts from "typescript"

const usercode = fs.readFileSync("./src/userscript.ts", "utf-8")

console.log({usercode})



const tscode = ts.transpile(usercode)

console.log({tscode})




