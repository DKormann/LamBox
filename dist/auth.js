"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.signEvent = exports.auth = void 0;
exports.storedKey = storedKey;
var nostr_tools_1 = require("nostr-tools");
function storedKey(location) {
    if (location === void 0) { location = "token"; }
    try {
        return exports.auth.keyFromNsec(localStorage.getItem(location));
    }
    catch (_a) {
        var key = exports.auth.randomKey();
        localStorage.setItem(location, key.sec);
        return key;
    }
}
exports.auth = {
    keyFromNsec: function (sec) {
        return {
            pub: getPub(sec),
            sec: sec,
            sign: function (content) { return (0, exports.signEvent)(content, sec); }
        };
    },
    randomKey: function () {
        var sec = nostr_tools_1.nip19.nsecEncode((0, nostr_tools_1.generateSecretKey)());
        return exports.auth.keyFromNsec(sec);
    },
    checkEvent: function (e) { return (0, nostr_tools_1.verifyEvent)(e); }
};
function secFromString(str) {
    if (str.startsWith("nsec1"))
        return str;
    var dec = nostr_tools_1.nip19.decode(str);
    if (dec.type !== "nsec")
        throw new Error("Invalid secret key");
    return nostr_tools_1.nip19.nsecEncode(dec.data);
}
function getPub(sec) {
    var decoded = nostr_tools_1.nip19.decode(sec);
    if (decoded.type !== "nsec")
        throw new Error("Invalid secret key");
    var pub = nostr_tools_1.nip19.npubEncode((0, nostr_tools_1.getPublicKey)(decoded.data));
    if (pub.startsWith("npub1"))
        return pub;
    else
        throw new Error("Invalid public key");
}
var signEvent = function (content, secKey) {
    var event = {
        kind: 1,
        tags: [],
        content: content,
        created_at: Math.floor(Date.now() / 1000),
    };
    return (0, nostr_tools_1.finalizeEvent)(event, nostr_tools_1.nip19.decode(secKey).data);
};
exports.signEvent = signEvent;
