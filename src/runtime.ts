import { parentPort, workerData } from 'worker_threads';
import { VM, VMOptions } from 'vm2';
import { PubKey } from './auth';
import { defaultContext, Box, APIFunction, DBTable, PersonalDBHandle, DBRow } from './userspace';
import { Serial } from './dataSchemas';

export type WorkerCall = {
  tag: "request",
  getCtx: string,
  lam: string,
  self: PubKey,
  other: PubKey,
  arg: Serial,
} | {
  tag: "response",
  requestId: number,
  value: string|undefined,
}

export type WorkerMessage = 
({
  tag: "request",
  id: number,
  key: string,
  person: PubKey,
} & ({method: "get"} |{method: "set", body: string|undefined}))

| {
  tag: "ok",
  callid: number,
  value: string,
} | {
  tag: "error",
  callid: number,
  error: string,
}

if (!parentPort) throw new Error("Must run in worker thread")

const messageQueue = new Map<number, (val: { value: string|undefined } | { error: string }) => void>()

function sendRequest(key: string, person: PubKey, op: {method: "get"} | {method: "set", body: string|undefined}) {
  requestCount++
  const reqId = requestCount
  parentPort!.postMessage({id: reqId, person, tag: "request", key, ...op})
  return new Promise<string|undefined>((resolve, reject) => {
    messageQueue.set(reqId, (result) => {
      if ('error' in result) {
        reject(new Error(result.error));
      } else {
        resolve(result.value);
      }
    })
  })
}

let requestCount = 0

// Helper to run code in VM with enhanced security
function runCode(code: string, sandbox: Object) {
  const vm = new VM({
    timeout: 1000,
    sandbox,
    wasm: false,
    eval: false,
    allowAsync: true,
    fixAsync: true,
    compiler: "javascript",
  });

  console.log({ sandbox, code });
  return vm.run(code);
}

async function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error('Execution timeout')), ms))
  ]);
}


const sanitizeDBKey = (key: string) =>{
  if (typeof key !== 'string' || key.length > 256 || /[\W]/.test(key)) throw new Error('Invalid DB key');
}


function mkHandle(person: PubKey): PersonalDBHandle {
  return new Proxy({}, {
    get(target, prop: string) {
      if (prop === 'get') {
        return (key: string) => {
          sanitizeDBKey(key)
          return sendRequest(key, person, { method: "get" });
        };
      }
      if (prop === 'set') {
        return async (key: string, value: string | undefined) => {
          sanitizeDBKey(key)
          if (value !== undefined && typeof value !== 'string') {
            throw new Error('DB value must be string or undefined');
          }
          if (value && value.length > 1024 * 1024) {
            throw new Error('DB value too large');
          }
          await sendRequest(key, person, { method: "set", body: value });
        };
      }
      throw new Error(`Unauthorized access to handle property: ${prop}`);
    }
  }) as PersonalDBHandle;
}


function mkRow<T extends Serial>(person: PubKey, key: string, defaultValue: T): DBRow<T> {
  if (typeof key !== 'string' || key.length > 256 || /[^\w-]/.test(key)) {
    throw new Error('Invalid DB key');
  }
  const handle = mkHandle(person);
  const get = () => handle.get(key).then(v => {
    try {
      const res = v ? JSON.parse(v) as T : defaultValue;
      console.log("got", res);
      return res;
    } catch (e) {
      throw new Error('Invalid JSON in DB value');
    }
  });
  const set = (value: T | undefined) => {
    let serialized: string | undefined;
    try {
      serialized = value !== undefined ? JSON.stringify(value) : undefined;
    } catch (e) {
      throw new Error('Unable to serialize DB value');
    }
    return handle.set(key, serialized);
  };
  const update = (func: (value: T) => T | undefined) => get().then(v => set(func(v)));
  const del = () => handle.set(key, undefined);
  return new Proxy({ get, set, update, delete: del }, {
    get(target, prop: string) {
      if (['get', 'set', 'update', 'delete'].includes(prop)) {
        return target[prop as keyof DBRow<T>];
      }
      throw new Error(`Unauthorized access to row property: ${prop}`);
    },
    set() {
      throw new Error('Cannot modify DBRow properties');
    }
  });
}


parentPort.on("message", async (message: WorkerCall) => {
  if (message.tag === "response") {
    const callback = messageQueue.get(message.requestId);
    if (callback) callback({ value: message.value });
    messageQueue.delete(message.requestId);
  } else if (message.tag === "request") {

    if (typeof message.getCtx !== 'string' || typeof message.lam !== 'string' ||
        typeof message.self !== 'string' || typeof message.other !== 'string' ||
        (message.arg !== null && typeof message.arg !== 'object')) {
      parentPort!.postMessage({ tag: "error", error: "Invalid input types" } as WorkerMessage);
      return;
    }


    const defCon: defaultContext = {
      self: message.self,
      other: message.other,
      getTable: <T extends Serial>(key: string, defaultValue: T) => {
        sanitizeDBKey(key)
        return new Proxy({}, {
          get(target, prop: string) {
            if (prop === 'self') {
              return mkRow(message.self, key, defaultValue);
            }
            if (prop === 'other') {
              return mkRow(message.other, key, defaultValue);
            }
            if (['get', 'set', 'update', 'delete'].includes(prop)) {
              return mkRow(message.self, key, defaultValue)[prop as keyof DBRow<T>];
            }
            throw new Error(`Unauthorized access to table property: ${prop}`);
          }
        }) as DBTable<T>;
      }
    };

    try {

      const result = await withTimeout((async () => {
        const frozenDefCon = Object.freeze(defCon);
        let sandbox = Object(null)
        sandbox.defCon = frozenDefCon
        const ctx = runCode(`(${message.getCtx})(defCon)`, sandbox);
        sandbox.ctx = ctx
        sandbox.arg = message.arg
        let res = runCode(`(${message.lam})(ctx, arg)`, sandbox);

        if (res instanceof Promise) res = await res;
        JSON.stringify(res);
        return res;
      })(), 5000);

      parentPort!.postMessage({ tag: "ok", value: JSON.stringify(result) } as WorkerMessage);
    } catch (err) {
      parentPort!.postMessage({ tag: "error", error: (err as Error).message } as WorkerMessage);
    }
  }
});