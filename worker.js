

import { parentPort, workerData } from 'worker_threads';
import { VM } from 'vm2';


if (!parentPort) throw new Error('Must run in worker thread');

let running = false
const msgqueue = []

const vm = new VM({
  sandbox: {},
  timeout: 2000,
  preventEscape: true
});

parentPort.on("message", (message)=>{  
  if (running) {
    msgqueue.push(message)
    return
  }
  runCode(message)
})

function runCode(message){
  running = true
  try {
    const result = vm.run(message.code);
    parentPort.postMessage({status:"OK", result, reqid: message.reqid});
  } catch (err) {
    parentPort.postMessage({ status:"ERROR", error: err.message, reqid: message.reqid });
  }
  running = false
  if (msgqueue.length > 0) runCode(msgqueue.shift())
}
