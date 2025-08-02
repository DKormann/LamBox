import  * as http from "http"
import * as fs from "fs"
import { acceptEvent } from "./box"
import { auth, Event } from "./auth";

const hostname = '127.0.0.1';
const port = 8080;


const key = auth.keyFromNsec(fs.readFileSync(".env.secret", "utf-8"))


const server: http.Server = http.createServer(async (req: http.IncomingMessage, res: http.ServerResponse) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'text/plain');

  const chunks: any[] = [];
  req.on('data', (chunk) => chunks.push(chunk));
  req.on('end', async () => {
    const request_data = Buffer.concat(chunks).toString();
    const event = JSON.parse(request_data) as Event
    try{
      if (auth.checkEvent(event)) {
        const resp = await acceptEvent(event)
        const dat = JSON.stringify(resp)
        res.write(dat) 
        res.end()
      } else {
        res.statusCode = 400;
        res.end("event is fake")
      }
    }catch(e){
      console.log(e);
      res.statusCode = 400;
      res.end("event is invalid")
      return
    }
  })

});

server.listen(port, hostname, () => {
  console.log(`Server running at http://${hostname}:${port}/`);
});


