"use strict";
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
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SHA256 = void 0;
exports.ServerLogin = ServerLogin;
exports.Box2Serial = Box2Serial;
var auth_1 = require("./auth");
var SHA256 = function (data) { return __awaiter(void 0, void 0, void 0, function () {
    var hash, hashstring;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, crypto.subtle.digest('SHA-256', new TextEncoder().encode(data))];
            case 1:
                hash = _a.sent();
                hashstring = Array.from(new Uint8Array(hash)).map(function (b) { return b.toString(16).padStart(2, '0'); }).join('');
                return [2 /*return*/, hashstring];
        }
    });
}); };
exports.SHA256 = SHA256;
function ServerLogin(url, box, key) {
    return __awaiter(this, void 0, void 0, function () {
        function sendRequest(request) {
            return __awaiter(this, void 0, void 0, function () {
                var event, resp, _a, _b;
                return __generator(this, function (_c) {
                    switch (_c.label) {
                        case 0:
                            event = (0, auth_1.signEvent)(JSON.stringify(request), key.sec);
                            return [4 /*yield*/, fetch(url, {
                                    method: "POST",
                                    headers: {
                                        "Content-Type": "application/json"
                                    },
                                    body: JSON.stringify(event)
                                })];
                        case 1:
                            resp = _c.sent();
                            if (!!resp.ok) return [3 /*break*/, 2];
                            throw new Error("Failed to send request:" + resp.status);
                        case 2:
                            _b = (_a = JSON).parse;
                            return [4 /*yield*/, resp.json()];
                        case 3: return [2 /*return*/, _b.apply(_a, [_c.sent()])];
                    }
                });
            });
        }
        var bserial;
        var _this = this;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, Box2Serial(box)];
                case 1:
                    bserial = _a.sent();
                    return [4 /*yield*/, sendRequest({
                            pubkey: key.pub,
                            tag: "publish",
                            app: bserial,
                        })];
                case 2:
                    _a.sent();
                    return [4 /*yield*/, sendRequest({
                            pubkey: key.pub,
                            tag: "host",
                            appHash: bserial.hash,
                            allowed: true,
                        })];
                case 3:
                    _a.sent();
                    return [2 /*return*/, function (target_1, lam_1) {
                            var args_1 = [];
                            for (var _i = 2; _i < arguments.length; _i++) {
                                args_1[_i - 2] = arguments[_i];
                            }
                            return __awaiter(_this, __spreadArray([target_1, lam_1], args_1, true), void 0, function (target, lam, arg) {
                                var lamH, request, resp;
                                if (arg === void 0) { arg = null; }
                                return __generator(this, function (_a) {
                                    switch (_a.label) {
                                        case 0: return [4 /*yield*/, lamHash(lam, bserial)];
                                        case 1:
                                            lamH = _a.sent();
                                            console.log("lam:", lam);
                                            console.log("lamhash:", lamH);
                                            request = {
                                                tag: "call",
                                                pubkey: key.pub,
                                                appHash: bserial.hash,
                                                lamHash: lamH,
                                                host: target,
                                                argument: arg
                                            };
                                            return [4 /*yield*/, sendRequest(request)];
                                        case 2:
                                            resp = _a.sent();
                                            return [2 /*return*/, resp];
                                    }
                                });
                            });
                        }];
            }
        });
    });
}
function exampleAPI(c) {
    var friends = c.getTable("friends", []);
    return {
        friends: friends
    };
}
function _lamHash(lam, boxHash) {
    return (0, exports.SHA256)(lam + boxHash);
}
function lamHash(lam, box) {
    return __awaiter(this, void 0, void 0, function () {
        var lhash;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, _lamHash(lam.toString(), box.hash)];
                case 1:
                    lhash = _a.sent();
                    if (!Object.values(box.apiHashes).includes(lhash))
                        throw new Error("illegal lambda");
                    return [2 /*return*/, lhash];
            }
        });
    });
}
function Box2Serial(box) {
    return __awaiter(this, void 0, void 0, function () {
        var getCtx, api, hash, apiHashes, _i, _a, _b, key, func, _c, _d;
        return __generator(this, function (_e) {
            switch (_e.label) {
                case 0:
                    getCtx = box.getCtx.toString();
                    api = Object.fromEntries(Object.entries(box.api).map(function (_a) {
                        var key = _a[0], func = _a[1];
                        return [key, func.toString()];
                    }));
                    return [4 /*yield*/, (0, exports.SHA256)(JSON.stringify({ getCtx: getCtx, api: api }))];
                case 1:
                    hash = _e.sent();
                    apiHashes = {};
                    _i = 0, _a = Object.entries(api);
                    _e.label = 2;
                case 2:
                    if (!(_i < _a.length)) return [3 /*break*/, 5];
                    _b = _a[_i], key = _b[0], func = _b[1];
                    _c = apiHashes;
                    _d = key;
                    return [4 /*yield*/, _lamHash(func.toString(), hash)];
                case 3:
                    _c[_d] = _e.sent();
                    _e.label = 4;
                case 4:
                    _i++;
                    return [3 /*break*/, 2];
                case 5: return [2 /*return*/, {
                        getCtx: getCtx,
                        api: api,
                        hash: hash,
                        apiHashes: apiHashes
                    }];
            }
        });
    });
}
