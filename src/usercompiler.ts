
import fs from "fs"
import ts from "typescript"

const usercode = fs.readFileSync("./src/userscript.ts", "utf-8")

// console.log({usercode})


const ast = ts.createSourceFile("userscript.ts", usercode, ts.ScriptTarget.Latest, true)


import {User} from "./userscript"

console.log(
  User.accept_follow.toString()
)


// const jscode = ts.transpile(usercode)

// console.log({jscode})




