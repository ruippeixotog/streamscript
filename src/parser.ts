import fs from "fs";
import ohm from "ohm-js";
import type { SSNodeType, SSNode } from "./ast";

const grammar = ohm.grammar(fs.readFileSync("src/grammar.ohm", "utf8"));
const semantics = grammar.createSemantics();

let nodeNumber = 0;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function lift<T>(func: (...args: any[]) => T): (...args: ohm.Node[]) => T {
  const liftedFunc = (...args): T => func(...args.map(a => a.ast));
  // ohm checks if the action functions have the correct number of arguments, so we need to
  // propagate the original arity to the lifted function
  Object.defineProperty(liftedFunc, "length", { value: func.length });
  return liftedFunc;
}

function astNode<T>(type: SSNodeType, data: T): { uuid: string; type: SSNodeType } & T {
  return { uuid: (++nodeNumber).toString(), type, ...data };
}

/* eslint-disable @typescript-eslint/camelcase */
semantics.addAttribute("ast", {
  Module: lift(stmts => astNode("Module", { stmts })),
  Import: lift((_, moduleName) => astNode("Import", { moduleName })),
  FunDecl: lift((funName, funDef) => astNode("FunDecl", { funName, funDef })),
  Expr_operator: lift((lhs, operator, rhs) => astNode("BinOp", { operator, lhs, rhs })),
  Expr1_operator: lift((lhs, operator, rhs) => astNode("BinOp", { operator, lhs, rhs })),
  Expr2_operator: lift((lhs, operator, rhs) => astNode("BinOp", { operator, lhs, rhs })),
  Expr3_operator: lift((lhs, operator, rhs) => astNode("BinOp", { operator, lhs, rhs })),
  Expr4_operator: lift((lhs, operator, rhs) => astNode("BinOp", { operator, lhs, rhs })),
  Expr5_operator: lift((lhs, operator, rhs) => astNode("BinOp", { operator, lhs, rhs })),
  Expr6_operator: lift((operator, arg) => astNode("UnOp", { operator, arg })),
  VarAccess: lift((moduleName, _1, name, _2, indices, _3) =>
    indices.reduce(
      (coll, index) => astNode("Index", { coll, index }),
      astNode("Var", { moduleName: moduleName[0], name })
    )),

  FunAppl: lift((func, _1, args, _2) => astNode("FunAppl", { func, args })),
  Lambda_simple: lift((_1, ins, _2, _3, out, _4, body, _5) => astNode(
    "Lambda",
    { ins, outs: [out[0]], body }
  )),
  Lambda_full: lift((_1, ins, _2, _3, _4, outs, _5, _6, body, _7) => astNode(
    "Lambda",
    { ins, outs, body }
  )),

  Tuple: lift((_1, elems, _2) => astNode("Tuple", { elems })),

  Literal: lift(value => astNode("Literal", { value })),
  Array: lift((_1, elems, _2) => astNode("Array", { elems })),
  Object: lift((_1, elems, _2) => astNode("Object", { elems })),
  ObjectPair: lift((k, _, v) => [k, v]),
  Wildcard: _ => astNode("Wildcard", {}),
  Void: _ => astNode("Void", {}),

  EmptyListOf: () => [],
  NonemptyListOf: lift((first, _, rest) => [first, ...rest]),

  ident: lift((first, rest) => [first, ...rest].join("")),
  number_fract: lift((wholePart, _, decPart) =>
    parseFloat(wholePart.join("") + "." + decPart.join(""))),
  number_integer: lift(wholePart => parseInt(wholePart.join(""))),
  bool: v => v.primitiveValue === "true",
  null: _ => null,
  string: lift((_1, str, _2) => JSON.parse(`"${str.join("")}"`)),
  stringChar_escaped: lift((_, escaped) => `\\${escaped}`),
  stringSpecialChar_codePoint: lift((_, h1, h2, h3, h4) => `u${h1}${h2}${h3}${h4}`),

  _terminal: function () { return this.primitiveValue; }
});
/* eslint-enable @typescript-eslint/camelcase */

function parse(moduleContent: string): SSNode {
  const match = grammar.match(moduleContent);
  if (match.failed()) {
    throw new Error(`Unable to parse module\n${match.message}`);
  }
  // console.log(require("util").inspect(semantics(match).ast, { showHidden: false, depth: null }));
  return semantics(match).ast;
}

function parseFile(modulePath: string): SSNode {
  return parse(fs.readFileSync(modulePath, "utf8"));
}

export default { parse, parseFile };
