// export type SSLang<T> = {
//   Module: { stmts: T[] },
//   Import: { moduleName: string },
//   FunDecl: { funName: string, body: T },
//   BinOp: { operator: string, lhs: T, rhs: T },
//   UnOp: { operator: string, arg: T },
//   Var: { moduleName: ?string, name: string },
//   Index: { coll: T, index: T },
//   Lambda: { ins: T[], outs: ?T[], body: T },
//   FunAppl: { func: T, args: T[] },
//   Tuple: { elems: T[] },
//   Literal: { value: string | number | boolean | null },
//   Array: { elems: T[] },
//   Object: { elems: [string, T][] }
// };

// export type SSNodeType = $Keys<SSLang<any>>;

// type ToNode = <K, V>(K, V) => { ...V, uuid: string, type: K };
// export type SSNode = $Values<$ObjMapi<SSLang<SSNode>, ToNode>>;
// type ToReducer<T> = <V>(V) => V => T;
// export type SSAlgebra<T> = $ObjMap<SSLang<T>, ToReducer<T>>;

export type SSNode =
  { uuid: string, type: 'Module', stmts: SSNode[] } |
  { uuid: string, type: 'Import', moduleName: string } |
  { uuid: string, type: 'FunDecl', funName: string, funDef: SSNode } |
  { uuid: string, type: 'BinOp', operator: string, lhs: SSNode, rhs: SSNode } |
  { uuid: string, type: 'UnOp', operator: string, arg: SSNode } |
  { uuid: string, type: 'Var', moduleName: string | null, name: string } |
  { uuid: string, type: 'Index', coll: SSNode, index: SSNode } |
  { uuid: string, type: 'Lambda', ins: SSNode[], outs: SSNode[] | null, body: SSNode[] } |
  { uuid: string, type: 'FunAppl', func: SSNode, args: SSNode[] } |
  { uuid: string, type: 'Tuple', elems: SSNode[] } |
  { uuid: string, type: 'Literal', value: string | number | boolean | null } |
  { uuid: string, type: 'Array', elems: SSNode[] } |
  { uuid: string, type: 'Object', elems: [string, SSNode][] };

export type SSNodeType = SSNode['type']; // $PropertyType<SSNode, 'type'>;

export type SSAlgebra<T> = {
  Module: (x: { uuid: string, stmts: T[] }) => T,
  Import: (x: { uuid: string, moduleName: string }) => T,
  FunDecl: (x: { uuid: string, funName: string, funDef: T }) => T,
  BinOp: (x: { uuid: string, operator: string, lhs: T, rhs: T }) => T,
  UnOp: (x: { uuid: string, operator: string, arg: T }) => T,
  Var: (x: { uuid: string, moduleName: string | null, name: string }) => T,
  Index: (x: { uuid: string, coll: T, index: T }) => T,
  Lambda: (x: { uuid: string, ins: T[], outs: T[] | null, body: T[] }) => T,
  FunAppl: (x: { uuid: string, func: T, args: T[] }) => T,
  Tuple: (x: { uuid: string, elems: T[] }) => T,
  Literal: (x: { uuid: string, value: string | number | boolean | null }) => T,
  Array: (x: { uuid: string, elems: T[] }) => T,
  Object: (x: { uuid: string, elems: [string, T][] }) => T
};

function fold<T>(node: SSNode, fs: SSAlgebra<T>): T {
  const fold1 = (n: SSNode) => fold(n, fs);
  switch (node.type) {
    case "Module":
      return fs[node.type]({ ...node, stmts: node.stmts.map(fold1) });
    case "Import":
      return fs[node.type](node);
    case "FunDecl":
      return fs[node.type]({ ...node, funDef: fold1(node.funDef) });
    case "BinOp":
      return fs[node.type]({ ...node, lhs: fold1(node.lhs), rhs: fold1(node.rhs) });
    case "UnOp":
      return fs[node.type]({ ...node, arg: fold1(node.arg) });
    case "Var":
      return fs[node.type](node);
    case "Index":
      return fs[node.type]({ ...node, coll: fold1(node.coll), index: fold1(node.index) });
    case "Lambda":
      return fs[node.type]({
        ...node,
        ins: node.ins.map(fold1),
        outs: node.outs ? node.outs.map(fold1) : null,
        body: node.body.map(fold1)
      });
    case "FunAppl":
      return fs[node.type]({ ...node, func: fold1(node.func), args: node.args.map(fold1) });
    case "Tuple":
      return fs[node.type]({ ...node, elems: node.elems.map(fold1) });
    case "Literal":
      return fs[node.type](node);
    case "Array":
      return fs[node.type]({ ...node, elems: node.elems.map(fold1) });
    case "Object":
      return fs[node.type]({ ...node, elems: node.elems.map(([k, v]) => [k, fold1(v)]) });
    default:
      throw new Error("fail");
  }
}

function render(node: SSNode): string {
  return fold<string>(node, {
    Module: ({ stmts }) => stmts.join("\n"),
    Import: ({ moduleName }) => `import ${moduleName}`,
    FunDecl: ({ funName, funDef }) => `${funName}${funDef}`,
    BinOp: ({ operator, lhs, rhs }) => `${lhs} ${operator} ${rhs}`,
    UnOp: ({ operator, arg }) => `${operator}${arg}`,
    Var: ({ moduleName, name }) => `${moduleName ? moduleName + "." : ""}${name}`,
    Index: ({ coll, index }) => `${coll}[${index}]`,
    Lambda: ({ ins, outs, body }) => `(${ins.join(",")}) => (${(outs ?? []).join(",")}) {\n${body.join("\n")}\n}}`,
    FunAppl: ({ func, args }) => `${func}(${args.join(",")})`,
    Tuple: ({ elems }) => `(${elems.join(",")})`,
    Literal: ({ value }) => JSON.stringify(value),
    Array: ({ elems }) => `[${elems.join(",")}]`,
    Object: ({ elems }) => `{${elems.map(([k, v]) => `"${k}": ${v}`).join(",")}}`
  });
}

export { fold, render };
