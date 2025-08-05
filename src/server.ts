import  * as http from "http"
import * as fs from "fs"
import { acceptEvent } from "./database"
import { auth, Event } from "./auth";
import { log } from "console";

const hostname = '0.0.0.0'
const port = 8080;


const server: http.Server = http.createServer(async (req: http.IncomingMessage, res: http.ServerResponse) => {


  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'text/plain');

  if (req.method === 'OPTIONS') {
    // CORS pre-flight
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.statusCode = 204; // No Content
    res.end();
    return;
  }

  if (req.method !== 'POST') {
    res.statusCode = 405;
    res.end("method not allowed");
    return;
  }

  const chunks: any[] = [];
  req.on('data', (chunk) => chunks.push(chunk));
  req.on('end', async () => {
    const request_data = Buffer.concat(chunks).toString();

    try {
      if (!request_data) {
        res.statusCode = 400;
        res.end("no request body provided");
        return;
      }

      const event = JSON.parse(request_data) as Event;

      if (auth.checkEvent(event)) {

        const resp = await acceptEvent(event);

        
        const dat = JSON.stringify(resp);
        
        res.write(dat)
        res.end();
      } else {
        res.statusCode = 400;
        res.end("event is fake");
      }
    } catch (e) {
      res.statusCode = 400;
      res.end("event is invalid");
    }
  })

});

server.listen(port, hostname, () => {
  console.log(`Server running at http://${hostname}:${port}/`);
});
