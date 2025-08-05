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
// parentPort?.on("message", (message:WorkerCall)=>{
//   if (message.tag === "response"){
//     const callback = messageQueue.get(message.requestId)
//     if (callback) callback(message.value)
//     messageQueue.delete(message.requestId)
//   }
// })
function sendRequest(key, person, op) {
    requestCount++;
    var reqId = requestCount;
    worker_threads_1.parentPort.postMessage(__assign({ id: reqId, person: person, tag: "request", key: key }, op));
    return new Promise(function (resolve, reject) {
        messageQueue.set(reqId, resolve);
    });
}
var requestCount = 0;
function runCode(code, arg) {
    var vm = new vm2_1.VM({
        timeout: 2000,
        sandbox: arg,
        wasm: false,
        eval: false,
    });
    console.log({ arg: arg, code: code });
    return vm.run(code);
}
worker_threads_1.parentPort.on("message", function (message) { return __awaiter(void 0, void 0, void 0, function () {
    function mkHandle(person) {
        var _this = this;
        return {
            get: function (key) { return sendRequest(key, person, { method: "get" }); },
            set: function (key, value) { return __awaiter(_this, void 0, void 0, function () { return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, sendRequest(key, person, { method: "set", body: value })];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            }); }); },
        };
    }
    function mkRow(person, key, defaultValue) {
        var handle = mkHandle(person);
        var get = function () { return handle.get(key).then(function (v) {
            var res = v ? JSON.parse(v) : defaultValue;
            console.log("got", res);
            return res;
        }); };
        var set = function (value) { return handle.set(key, JSON.stringify(value)); };
        var update = function (func) { return get().then(function (v) { return set(func(v)); }); };
        var del = function () { return handle.set(key, undefined); };
        return { get: get, set: set, update: update, delete: del };
    }
    var callback, defCon, ctx, res, err_1;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                if (!(message.tag === "response")) return [3 /*break*/, 1];
                callback = messageQueue.get(message.requestId);
                if (callback)
                    callback(message.value);
                messageQueue.delete(message.requestId);
                return [3 /*break*/, 6];
            case 1:
                if (!(message.tag === "request")) return [3 /*break*/, 6];
                defCon = {
                    self: message.self,
                    other: message.other,
                    getTable: function (key, defaultValue) { return (__assign(__assign({}, mkRow(message.self, key, defaultValue)), { other: mkRow(message.other, key, defaultValue) })); }
                };
                _a.label = 2;
            case 2:
                _a.trys.push([2, 5, , 6]);
                ctx = runCode("(".concat(message.getCtx, ")(defCon)"), { defCon: defCon });
                res = runCode("(".concat(message.lam, ")(ctx, arg)"), { ctx: __assign(__assign({}, defCon), ctx), arg: message.arg });
                if (!(res instanceof Promise)) return [3 /*break*/, 4];
                return [4 /*yield*/, res];
            case 3:
                res = _a.sent();
                _a.label = 4;
            case 4:
                worker_threads_1.parentPort.postMessage({ tag: "ok", value: JSON.stringify(res) });
                return [3 /*break*/, 6];
            case 5:
                err_1 = _a.sent();
                worker_threads_1.parentPort.postMessage({ tag: "error", error: err_1.message });
                return [3 /*break*/, 6];
            case 6: return [2 /*return*/];
        }
    });
}); });
