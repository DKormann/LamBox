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
exports.acceptEvent = acceptEvent;
exports.acceptPublish = acceptPublish;
exports.acceptHost = acceptHost;
exports.acceptCall = acceptCall;
var nostr_tools_1 = require("nostr-tools");
var worker_threads_1 = require("worker_threads");
var db = {
    lambdas: new Map(),
    apps: new Map(),
    hosts: new Map(),
    store: new Map(),
};
function acceptEvent(event) {
    return __awaiter(this, void 0, void 0, function () {
        var pubkey, content, request, response;
        return __generator(this, function (_a) {
            pubkey = nostr_tools_1.nip19.npubEncode(event.pubkey);
            content = event.content;
            try {
                request = __assign({ pubkey: pubkey }, JSON.parse(content));
                response = (request.tag == "publish") ? acceptPublish(request) : (request.tag == "host") ? acceptHost(request) : acceptCall(request);
                return [2 /*return*/, response];
            }
            catch (e) {
                throw e;
            }
            return [2 /*return*/];
        });
    });
}
function acceptPublish(request) {
    return __awaiter(this, void 0, void 0, function () {
        var _a, hash, apiHashes, getCtx;
        return __generator(this, function (_b) {
            _a = request.app, hash = _a.hash, apiHashes = _a.apiHashes;
            getCtx = request.app.getCtx;
            if (db.apps.has(hash))
                return [2 /*return*/, null];
            db.apps.set(hash, { getCtx: getCtx, api: new Set(Object.values(apiHashes)) });
            Object.entries(request.app.api).forEach(function (_a) {
                var key = _a[0], value = _a[1];
                db.lambdas.set(apiHashes[key], value);
            });
            return [2 /*return*/, null];
        });
    });
}
function acceptHost(request) {
    return __awaiter(this, void 0, void 0, function () {
        var host;
        return __generator(this, function (_a) {
            console.log("accepting host", request);
            host = db.hosts.get(request.pubkey);
            if (host == undefined) {
                host = new Set();
                db.hosts.set(request.pubkey, host);
            }
            if (request.allowed)
                host.add(request.appHash);
            else
                host.delete(request.appHash);
            return [2 /*return*/, null];
        });
    });
}
function acceptCall(request) {
    return __awaiter(this, void 0, void 0, function () {
        var host, app, lambda, worker, call;
        return __generator(this, function (_a) {
            host = db.hosts.get(request.host);
            if (!host || !host.has(request.appHash)) {
                console.log("host not found", request.host, host, request.appHash);
                return [2 /*return*/, null];
            }
            app = db.apps.get(request.appHash);
            if (!app) {
                console.log("app not found");
                return [2 /*return*/, null];
            }
            lambda = db.lambdas.get(request.lamHash);
            if (!lambda) {
                console.log("lambda not found");
                return [2 /*return*/, null];
            }
            worker = new worker_threads_1.Worker("./dist/runtime.js", {
                workerData: {},
                resourceLimits: {
                    maxOldGenerationSizeMb: 100,
                    maxYoungGenerationSizeMb: 100,
                    stackSizeMb: 100,
                    codeRangeSizeMb: 100,
                }
            });
            call = {
                tag: "request",
                getCtx: app.getCtx,
                lam: lambda,
                self: request.pubkey,
                other: request.host,
                arg: request.argument,
            };
            worker.postMessage(call);
            return [2 /*return*/, new Promise(function (resolve, reject) {
                    worker.on("message", function (message) {
                        var _a, _b;
                        if (message.tag == "request") {
                            if (message.person != request.host && message.person != request.pubkey)
                                throw new Error("Unauthorized");
                            var val = undefined;
                            message.key = message.key + "_" + request.appHash;
                            if (message.method == "get") {
                                val = (_a = db.store.get(message.person)) === null || _a === void 0 ? void 0 : _a.get(message.key);
                                console.log("got val: ", val);
                            }
                            else if (message.method == "set") {
                                var pstore = db.store.get(message.person);
                                if (!pstore) {
                                    pstore = new Map();
                                    db.store.set(message.person, pstore);
                                }
                                if (message.body == undefined) {
                                    pstore.delete(message.key);
                                }
                                else {
                                    console.log("setting val: ", message.body);
                                    pstore.set(message.key, message.body);
                                }
                            }
                            var response = {
                                tag: "response",
                                requestId: message.id,
                                value: val,
                            };
                            worker.postMessage(response);
                        }
                        else if (message.tag == "error") {
                            console.error("error", message.error);
                            reject(message.error);
                            worker.terminate();
                        }
                        else if (message.tag == "ok") {
                            resolve((_b = message.value) !== null && _b !== void 0 ? _b : null);
                            worker.terminate();
                        }
                    });
                })];
        });
    });
}
