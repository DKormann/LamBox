"use strict";
// import { htmlElement } from "./_html"
// import { assertEq, assertErr, last, log, stringify, Res, Ok, Err, ok, err, assert } from "./helpers"
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
exports.highlighted = exports.flat_errors = exports.execAst = exports.getAst = exports.rearange = exports.operator_weight = exports.build = exports.parse = exports.tokenize = exports.seek = void 0;
var symbols = ["(", ")", "{", "}", "[", "]", "=>", ",", ":", "?", "=>", "!", "&&", "||", "+", "-", "*", "/", "%", "<", ">", "<=", ">=", "==", "!=", "=", ";", "...", ".", "//"];
var seek = function (code, start, pred) {
    var off = code.slice(start).split('').findIndex(pred);
    return off == -1 ? code.length : start + off;
};
exports.seek = seek;
var tokenize = function (code, i, tid) {
    if (i === void 0) { i = 0; }
    if (tid === void 0) { tid = 0; }
    if (code.length <= i)
        return [];
    var comp = function (name) { return code.slice(i, i + name.length) == name; };
    var _a = code[i].trim() == "" ? ["whitespace", (0, exports.seek)(code, i, function (c) { return c.trim() != ""; })] :
        code[i] == '"' ? ["string", (0, exports.seek)(code, i + 1, function (c) { return c == '"'; }) + 1] :
            code[i] == "'" ? ["string", (0, exports.seek)(code, i + 1, function (c) { return c == "'"; }) + 1] :
                code[i].match(/[0-9]/) ? ["number", (0, exports.seek)(code, i, function (c) { return !c.match(/[0-9]/); })] :
                    comp("//") ? ["comment", (0, exports.seek)(code, i, function (c) { return c == '\n'; })] :
                        comp("true") ? ["boolean", i + 4] :
                            comp("false") ? ["boolean", i + 5] :
                                comp("null") ? ["null", i + 4] :
                                    code[i].match(/[a-zA-Z_]/) ? ["identifier", (0, exports.seek)(code, i, function (c) { return !c.match(/[a-zA-Z0-9_]/); })] :
                                        (symbols.map(function (s) { return comp(s) ? ["symbol", i + s.length] : null; }).find(function (x) { return x != null; }) ||
                                            ["typo", i + 1]), typ = _a[0], nxt = _a[1];
    assertEq(nxt > i, true, "tokenize error " + typ);
    return __spreadArray([{ type: typ, value: code.slice(i, nxt), start: i, end: nxt }], (0, exports.tokenize)(code, nxt, tid + 1), true);
};
exports.tokenize = tokenize;
var ternaryops = ["?:", "=;"];
var symbolpairs = [["(", ")"], ["{", "}"], ["[", "]"], ["?", ":"], ["=", ";"]];
var binaryops = ["+", "-", "*", "/", "%", "<", ">", "<=", ">=", "==", "!=", "&&", "||", "app", "=>", "index",];
var unaryops = ["!", "neg", "..."];
var assertEq = function (a, b, msg) {
    if (a !== b)
        throw new Error(msg || "assertion failed: ".concat(a, " !== ").concat(b));
};
var newast = function (type, start, end, children) {
    if (children === void 0) { children = []; }
    if (binaryops.includes(type))
        assertEq(children.length, 2, "newast error " + type);
    if (ternaryops.includes(type))
        assertEq(children.length, 3, "newast error " + type);
    var res = { type: type, start: start, end: end, children: children };
    return res;
};
var last = function (arr) { return arr[arr.length - 1]; };
var parse = function (tokens) {
    var nonw = function (idx) {
        return tokens[idx] == undefined ? -1 : tokens[idx].type == "whitespace" || tokens[idx].type == "comment" ? nonw(idx + 1) : idx;
    };
    var nexttok = function (prev) { return nonw(tokens.findIndex(function (t) { return t.start >= prev.end; })); };
    var iden2string = function (iden) {
        return (iden.type == "identifier") ? __assign(__assign({}, iden), { type: "string", value: "\"".concat(iden.value, "\"") }) : iden;
    };
    var parseKV = function (idx) {
        var k = parseexpr(idx);
        if (k.type == 'typo')
            return k;
        var colon = tokens[nexttok(k)];
        if (colon == undefined)
            return __assign(__assign({}, k), { type: "typo", value: "expected : or } after {", children: [] });
        if (k.type == "...")
            return k;
        if (colon.value == ":") {
            var v = parseexpr(nexttok(colon));
            return newast(":", k.start, v.end, [k.type == "identifier" ? iden2string(k) : k, v]);
        }
        return k;
    };
    var parsegroup = function (opener, idx) {
        var _a;
        var closer = (_a = symbolpairs.find(function (s) { return s[0] == opener.value; })) === null || _a === void 0 ? void 0 : _a[1];
        if (closer == undefined)
            throw new Error("parsegroup error " + opener.value + " not an opener");
        var type = "?=".includes(opener.value) ? "()" : opener.value + closer;
        var tok = tokens[idx];
        if (tok == undefined)
            return { type: "typo", value: "end of input. expected ".concat(closer, " because of ").concat(opener.value), start: opener.start, end: last(tokens).end, children: [] };
        if (tok.value == closer)
            return { type: type, children: [], start: opener.start, end: tok.end };
        if (tok.value == ",")
            return parsegroup(opener, nexttok(tok));
        if ("])};:".includes(tok.value))
            return { type: "typo", value: "cant parse ".concat(type, ". expected ").concat(closer, " because of ").concat(opener.value), start: tok.start, end: tok.end, children: [] };
        var child = type == "{}" ? parseKV(idx) : parseexpr(idx);
        if (child.type == "typo")
            return child;
        var rest = parsegroup(opener, nexttok(child));
        return rest.type == "typo" ? rest : newast(type, opener.start, rest.end, __spreadArray([child], rest.children, true));
    };
    var astnode = function (type, children) { return ({
        type: type,
        children: children,
        start: children[0].start,
        end: last(children).end,
        value: ""
    }); };
    var parsecontinue = function (first) {
        var nextop = tokens[nexttok(first)];
        if (nextop == undefined)
            return first;
        if (nextop.type == "symbol") {
            if ("[(".includes(nextop.value)) {
                var grp = parsegroup(nextop, nexttok(nextop));
                var op_1 = nextop.value == "(" ? "app" : "index";
                if (nextop.value == '[' && grp.children.length != 1)
                    return parsecontinue(__assign(__assign({}, grp), { type: "typo", value: op_1 + " expects one arg", children: [] }));
                var newNode = __assign(__assign({}, grp), { type: op_1, start: first.start, end: grp.end, children: [first, nextop.value == "[" ? grp.children[0] : grp] });
                return parsecontinue(newNode);
            }
            var op = (nextop.value == ".") ? "index" :
                (nextop.value == "?") ? "?:" :
                    (nextop.value == "=") ? "=;" :
                        nextop.value;
            if (binaryops.includes(op)) {
                var second = parseindivisible(nexttok(nextop));
                var newNode = astnode(op, [first, nextop.value == "." ? iden2string(second) : second]);
                return parsecontinue(newNode);
            }
            if (ternaryops.includes(op)) {
                var grp = parsegroup(nextop, nexttok(nextop));
                var els = parseexpr(nexttok(grp));
                return parsecontinue(astnode(op, [first, grp.children[0] || grp, els]));
            }
        }
        return first;
    };
    var parseatom = function (idx) { return (["number", "string", "boolean", "null", "identifier"].includes(tokens[idx].type)) ? __assign(__assign({}, tokens[idx]), { children: [] }) : undefined; };
    var parseindivisible = function (idx) {
        var _a, _b;
        var tok = tokens[idx];
        var typo = __assign(__assign({}, tok), { type: "typo", value: "unexpected " + ((_a = tok === null || tok === void 0 ? void 0 : tok.value) !== null && _a !== void 0 ? _a : "end of input"), children: [] });
        if (tok == undefined)
            return typo;
        var op = (tok.value == '-') ? "neg" : tok.value;
        var res = tok.type == "symbol" ?
            "({[".includes(op) ? parsegroup(tok, nonw(idx + 1)) :
                unaryops.includes(op) ? astnode(op, [parseindivisible(nexttok(tok))]) :
                    typo
            : (_b = parseatom(idx)) !== null && _b !== void 0 ? _b : typo;
        return res;
    };
    var parseexpr = function (idx) { return parsecontinue(parseindivisible(idx)); };
    var res = parseexpr(nonw(0));
    // @ts-expect-error
    assert(!res.children.includes(undefined));
    if (nexttok(res) != -1)
        return __assign(__assign({}, res), { start: 0, end: last(tokens).end, type: "typo", value: "expected end " + tokens[nexttok(res)].value, children: [] });
    return res;
};
exports.parse = parse;
var build = function (ast) {
    var errs = (0, exports.flat_errors)(ast);
    if (errs.length > 0)
        throw new Error(errs.map(function (e) { return e.value; }).join('\n'));
    var sfill = function (template) { return template.replace(/{}/g, function () { return (0, exports.build)(ast.children.shift()); }); };
    return ast.type == "number" || ast.type == "boolean" || ast.type == "null" || ast.type == "identifier" || ast.type == "string" ? ast.value :
        "({[".includes(ast.type[0]) ? "".concat(ast.type[0]).concat(ast.children.map(ast.type == "{}" ? function (e) {
            return e.type == "identifier" ? "\"".concat(e.value, "\":").concat(e.value) :
                e.type == ":" ? e.children.map(exports.build).join(":") :
                    (e.type != "..." ? "..." : "") + (0, exports.build)(e);
        }
            : exports.build).join(",")).concat(ast.type[1]) :
            (ast.type == "app") ? sfill("({}{})") :
                (ast.type == "index") ? sfill("({}[{}])") :
                    (ast.type == 'neg') ? "-".concat((0, exports.build)(ast.children[0])) :
                        (ast.type == '=>') ? sfill("({}=>({}))") :
                            ast.type == ":" ? sfill("{{}:{}}") :
                                ast.children.length == 2 ? sfill("({}".concat(ast.type, "{})")) :
                                    ast.children.length == 1 ? "".concat(ast.type).concat((0, exports.build)(ast.children[0])) :
                                        ast.type == "=;" ? sfill("(()=>{{} = {};\nreturn {}})()") :
                                            ast.type == "?:" ? sfill("({}?{}:\n{})") :
                                                ast.type == "typo" ? (function () { throw new Error("".concat(ast.value)); })() :
                                                    (function () { throw new Error("not implemented: " + ast.type); })();
};
exports.build = build;
var operator_weight = function (op) {
    return op === "app" || op === "index" ? 15 :
        unaryops.includes(op) ? 13 : // Unary operators
            op === "*" || op === "/" || op === "%" ? 12 :
                op === "+" || op === "-" ? 11 :
                    op === "<" || op === ">" || op === "<=" || op === ">=" || op === "==" || op === "!=" ? 10 :
                        op === "&&" || op === "||" ? 9 :
                            op === ":" ? 9 :
                                op === "?:" || op === "=;" ? 8 :
                                    op === "=>" ? 7 :
                                        // op === "()" || op === "[]" || op === "{}" ? 6 :
                                        -1;
};
exports.operator_weight = operator_weight;
var assert = function (cond, msg) {
    if (!cond)
        throw new Error(msg || "assertion failed");
};
var stringify = function (ast) {
    if (ast.type == "number" || ast.type == "boolean" || ast.type == "null" || ast.type == "identifier" || ast.type == "string")
        return ast.value;
    if (ast.type == "typo")
        return "typo: " + ast.value;
    return ast.type + " " + ast.children.map(stringify).join(" ");
};
var rearange = function (nod) {
    assert(nod != undefined, "rearange error");
    //@ts-expect-error
    if (nod.children.includes(undefined))
        throw new Error("rearange error " + stringify(nod));
    var node = __assign(__assign({}, nod), { children: nod.children.map(exports.rearange) });
    if (binaryops.concat(":").includes(node.type)) {
        var _a = node.children, fst = _a[0], snd = _a[1];
        if ((binaryops.includes(fst.type) || ternaryops.includes(fst.type) || unaryops.includes(fst.type))
            && ((0, exports.operator_weight)(fst.type) < (0, exports.operator_weight)(node.type) || fst.type == "=>" && node.type == "=>")) {
            return (0, exports.rearange)(__assign(__assign({}, fst), { children: __spreadArray(__spreadArray([], fst.children.slice(0, -1), true), [__assign(__assign({}, node), { children: [fst.children.slice(-1)[0], snd] })], false) }));
        }
    }
    if (ternaryops.includes(node.type)) {
        assertEq(node.children.length, 3, "rearange error" + stringify(node));
        var _b = node.children, fst = _b[0], snd = _b[1], trd = _b[2];
        if (binaryops.includes(fst.type) && (0, exports.operator_weight)(fst.type) < (0, exports.operator_weight)(node.type)) {
            return (0, exports.rearange)(__assign(__assign({}, fst), { children: [(fst.children[0]), __assign(__assign({}, node), { children: [fst.children[1], snd, trd] })] }));
        }
    }
    return node;
};
exports.rearange = rearange;
var compile = function (s) { return (0, exports.build)(((0, exports.rearange)(((0, exports.parse)((0, exports.tokenize)(s)))))); };
var getAst = function (tokens) { return (0, exports.rearange)((0, exports.parse)(tokens)); };
exports.getAst = getAst;
var execAst = function (parsed) {
    var compt = (0, exports.build)(parsed);
    try {
        // const args = {stringify, assert, assertEq, print:console.log}
        var args = {};
        var FN = Function.apply(void 0, __spreadArray(__spreadArray([], Object.keys(args), false), ["return " + compt], false));
        return FN.apply(void 0, Object.values(args));
    }
    catch (e) {
        throw new Error("runtime error in:" + compt + "\n" + e.message);
    }
};
exports.execAst = execAst;
var runfun = function (code) { return (0, exports.execAst)((0, exports.getAst)((0, exports.tokenize)(code))); };
var range = function (start, end) { return Array.from({ length: end - start }, function (_, i) { return i + start; }); };
var flat_errors = function (ast) {
    return ast.type == "typo" ? [ast] :
        ast.children.map(exports.flat_errors).flat();
};
exports.flat_errors = flat_errors;
var highlighted = function (toks, ast) {
    var _a;
    var errors = new Set((0, exports.flat_errors)(ast).map(function (e) { return range(e.start, e.end); }).flat());
    var chs = toks.map(function (tok) { return tok.value.split("\n").map(function (s) { return [{ code: s, cls: (errors.has(tok.start) || errors.has(tok.end) ? '.err.' : '.') +
                (tok.type == "typo" ? 'red' :
                    tok.type == "identifier" || tok.type == "number" || tok.value == '.' ? "code1" :
                        tok.type == "string" || tok.type == "boolean" || tok.type == "comment" ? "code2" :
                            "?:=;".includes(tok.value) ? "code3" :
                                tok.type == "symbol" ? "code4" :
                                    "") }]; }); });
    var lines = chs.slice(1).reduce(function (p, c) { return __spreadArray(__spreadArray(__spreadArray([], p.slice(0, -1), true), [__spreadArray(__spreadArray([], last(p), true), c[0], true)], false), c.slice(1), true); }, (_a = chs[0]) !== null && _a !== void 0 ? _a : [[]]);
    return lines.map(function (l) { return l.map(function (c) { return c.code.split('').map(function (ch) { return ({ cls: c.cls }); }); }).flat(); });
};
exports.highlighted = highlighted;
{
    // const code = (()=>22).toString()
    var code = "function(){}";
    console.log(code);
    var toks = (0, exports.tokenize)(code);
    var ast = (0, exports.getAst)(toks);
    var res = (0, exports.execAst)(ast);
    console.log("res:", res.toString());
}
