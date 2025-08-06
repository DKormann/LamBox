"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
var worker_threads_1 = require("worker_threads");
var vm2_1 = require("vm2");
if (!worker_threads_1.parentPort)
    throw new Error("Must run in worker thread");
var messageQueue = new Map();
function sendRequest(key, person, op) {
    requestCount++;
    var reqId = requestCount;
    worker_threads_1.parentPort.postMessage(__assign({ id: reqId, person: person, tag: "request", key: key }, op));
    return new Promise(function (resolve, reject) {
        messageQueue.set(reqId, function (result) {
            if ('error' in result) {
                reject(new Error(result.error));
            }
            else {
                resolve(result.value);
            }
        });
    });
}
var requestCount = 0;
// Helper to run code in VM with enhanced security
function runCode(code, sandbox) {
    var vm = new vm2_1.VM({
        timeout: 1000,
        sandbox: sandbox,
        wasm: false,
        eval: false,
        allowAsync: true,
        // fixAsync: true,
        compiler: "javascript",
    });
    console.log("RUNNING:", code, sandbox);
    return vm.run(code);
}
function withTimeout(promise, ms) {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            return [2 /*return*/, Promise.race([
                    promise,
                    new Promise(function (_, reject) { return setTimeout(function () { return reject(new Error('Execution timeout')); }, ms); })
                ])];
        });
    });
}
var sanitizeDBKey = function (key) {
    if (typeof key !== 'string' || key.length > 256 || /[\W]/.test(key))
        throw new Error('Invalid DB key');
};
function mkHandle(person) {
    return new Proxy({}, {
        get: function (target, prop) {
            var _this = this;
            if (prop === 'get') {
                return function (key) {
                    sanitizeDBKey(key);
                    return sendRequest(key, person, { method: "get" });
                };
            }
            if (prop === 'set') {
                return function (key, value) { return __awaiter(_this, void 0, void 0, function () {
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0:
                                sanitizeDBKey(key);
                                if (value !== undefined && typeof value !== 'string') {
                                    throw new Error('DB value must be string or undefined');
                                }
                                if (value && value.length > 1024 * 1024) {
                                    throw new Error('DB value too large');
                                }
                                return [4 /*yield*/, sendRequest(key, person, { method: "set", body: value })];
                            case 1:
                                _a.sent();
                                return [2 /*return*/];
                        }
                    });
                }); };
            }
            throw new Error("Unauthorized access to handle property: ".concat(prop));
        }
    });
}
function mkRow(person, key, defaultValue) {
    if (typeof key !== 'string' || key.length > 256 || /[^\w-]/.test(key)) {
        throw new Error('Invalid DB key');
    }
    var handle = mkHandle(person);
    var get = function () { return handle.get(key).then(function (v) {
        try {
            var res = v ? JSON.parse(v) : defaultValue;
            return res;
        }
        catch (e) {
            throw new Error('Invalid JSON in DB value');
        }
    }); };
    var set = function (value) {
        var serialized;
        try {
            serialized = value !== undefined ? JSON.stringify(value) : undefined;
        }
        catch (e) {
            throw new Error('Unable to serialize DB value');
        }
        return handle.set(key, serialized);
    };
    var update = function (func) { return get().then(function (v) { return set(func(v)); }); };
    var del = function () { return handle.set(key, undefined); };
    return new Proxy({ get: get, set: set, update: update, delete: del }, {
        get: function (target, prop) {
            if (['get', 'set', 'update', 'delete'].includes(prop)) {
                return target[prop];
            }
            throw new Error("Unauthorized access to row property: ".concat(prop));
        },
        set: function () {
            throw new Error('Cannot modify DBRow properties');
        }
    });
}
worker_threads_1.parentPort.on("message", function (message) { return __awaiter(void 0, void 0, void 0, function () {
    var callback, defCon_1, result, err_1;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                if (!(message.tag === "response")) return [3 /*break*/, 1];
                callback = messageQueue.get(message.requestId);
                if (callback)
                    callback({ value: message.value });
                messageQueue.delete(message.requestId);
                return [3 /*break*/, 5];
            case 1:
                if (!(message.tag === "request")) return [3 /*break*/, 5];
                if (typeof message.getCtx !== 'string' || typeof message.lam !== 'string' ||
                    typeof message.self !== 'string' || typeof message.other !== 'string') {
                    console.log(message);
                    worker_threads_1.parentPort.postMessage({ tag: "error", error: "Invalid input types" });
                    return [2 /*return*/];
                }
                defCon_1 = {
                    self: message.self,
                    other: message.other,
                    getTable: function (key, defaultValue) {
                        sanitizeDBKey(key);
                        return new Proxy({}, {
                            get: function (target, prop) {
                                if (prop === 'self') {
                                    return mkRow(message.self, key, defaultValue);
                                }
                                if (prop === 'other') {
                                    return mkRow(message.other, key, defaultValue);
                                }
                                if (['get', 'set', 'update', 'delete'].includes(prop)) {
                                    return mkRow(message.self, key, defaultValue)[prop];
                                }
                                throw new Error("Unauthorized access to table property: ".concat(prop));
                            }
                        });
                    }
                };
                _a.label = 2;
            case 2:
                _a.trys.push([2, 4, , 5]);
                return [4 /*yield*/, withTimeout((function () { return __awaiter(void 0, void 0, void 0, function () {
                        var frozenDefCon, sandbox, ctx, sandbox2, res;
                        return __generator(this, function (_a) {
                            switch (_a.label) {
                                case 0:
                                    frozenDefCon = Object.freeze(defCon_1);
                                    sandbox = Object(null);
                                    sandbox.defCon = frozenDefCon;
                                    ctx = runCode("(".concat(message.getCtx, ")(defCon)"), sandbox);
                                    sandbox2 = Object(null);
                                    sandbox2.ctx = ctx;
                                    sandbox2.ctx.self = message.self;
                                    sandbox2.ctx.other = message.other;
                                    sandbox2.ctx.getTable = defCon_1.getTable;
                                    sandbox2.arg = message.arg;
                                    res = runCode("(".concat(message.lam, ")(ctx, arg)"), sandbox2);
                                    if (!(res instanceof Promise)) return [3 /*break*/, 2];
                                    return [4 /*yield*/, res];
                                case 1:
                                    res = _a.sent();
                                    _a.label = 2;
                                case 2:
                                    JSON.stringify(res);
                                    return [2 /*return*/, res];
                            }
                        });
                    }); })(), 5000)];
            case 3:
                result = _a.sent();
                worker_threads_1.parentPort.postMessage({ tag: "ok", value: JSON.stringify(result) });
                return [3 /*break*/, 5];
            case 4:
                err_1 = _a.sent();
                worker_threads_1.parentPort.postMessage({ tag: "error", error: err_1.message });
                return [3 /*break*/, 5];
            case 5: return [2 /*return*/];
        }
    });
}); });
