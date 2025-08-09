

# funscript language spec


## syntax

### expressions

E := var           // variable
| bool             // boolean
| num              // number
| string           // string
| null             // null
| {k:E, k:E, ...}  // object
| {...E}           // spread
| [E, E, E ...]    // array
| [...E]           // spread
| (x, x, ...)=>E   // function
| E(E, E, E ...)   // call
| x = E ; E        // let
| E ? E : E        // ternary
| E `op` E         // binary
| !E               // unary
| E.x              // property access
| E[x]             // index

