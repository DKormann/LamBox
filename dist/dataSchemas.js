"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InterSchema = exports.UnionSchema = exports.ObjectSchema = exports.ItemSchema = exports.ArraySchema = exports.NullSchema = exports.BooleanSchema = exports.NumberSchema = exports.StringSchema = exports.AnySchema = exports.checkType = void 0;
exports.cast = cast;
var checkType = function (value, type) {
    if (type === "any")
        return true;
    if (type === "string")
        return typeof value === "string";
    if (type === "number")
        return typeof value === "number";
    if (type === "boolean")
        return typeof value === "boolean";
    if (type === "null")
        return value === null;
    if (type.tag === "array") {
        return Array.isArray(value) && value.every(function (v) { return (0, exports.checkType)(v, type.type); });
    }
    if (type.tag === "item") {
        if (typeof value != "object")
            return false;
        var k = value[type.key];
        if (k == undefined)
            return false;
        return (0, exports.checkType)(k, type.value);
    }
    if (type.tag === "union")
        return (0, exports.checkType)(value, type.A) || (0, exports.checkType)(value, type.B);
    if (type.tag === "inter")
        return (0, exports.checkType)(value, type.A) && (0, exports.checkType)(value, type.B);
    return false;
};
exports.checkType = checkType;
exports.AnySchema = "any";
exports.StringSchema = "string";
exports.NumberSchema = "number";
exports.BooleanSchema = "boolean";
exports.NullSchema = "null";
var ArraySchema = function (type) { return ({ tag: "array", type: type }); };
exports.ArraySchema = ArraySchema;
var ItemSchema = function (key, value) { return ({ tag: "item", key: key, value: value }); };
exports.ItemSchema = ItemSchema;
var ObjectSchema = function (obj) {
    var itr = Object.entries(obj);
    return itr.slice(1).reduce(function (acc, _a) {
        var key = _a[0], value = _a[1];
        return (0, exports.UnionSchema)(acc, (0, exports.ItemSchema)(key, value));
    }, (0, exports.ItemSchema)(itr[0][0], itr[0][1]));
};
exports.ObjectSchema = ObjectSchema;
var UnionSchema = function (A, B) { return ({ tag: "union", A: A, B: B }); };
exports.UnionSchema = UnionSchema;
var InterSchema = function (A, B) { return ({ tag: "inter", A: A, B: B }); };
exports.InterSchema = InterSchema;
function cast(value, type) {
    if ((0, exports.checkType)(value, type))
        return value;
    return null;
}
