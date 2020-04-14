// export type SSLang<T> = {
//   Module: { stmts: T[] },
//   Import: { moduleName: string },
//   FunDecl: { funName: string, body: T },
//   BinOp: { operator: string, lhs: T, rhs: T },
//   UnOp: { operator: string, arg: T },
//   Var: { moduleName: string | null, name: string },
//   Index: { coll: T, index: T },
//   Lambda: { ins: T[], outs: T[] | null, body: T },
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
  { uuid: string, type: 'Lambda', ins: string[], outs: string[] | null, body: SSNode[] } |
  { uuid: string, type: 'FunAppl', func: SSNode, args: (SSNode | '_')[] } |
  { uuid: string, type: 'Tuple', elems: SSNode[] } |
  { uuid: string, type: 'Literal', value: string | number | boolean | null } |
  { uuid: string, type: 'Array', elems: SSNode[] } |
  { uuid: string, type: 'Object', elems: [string, SSNode][] };

export type SSNodeType = SSNode['type']; // $PropertyType<SSNode, 'type'>;

export type SSAction<T, U> = {
  Module: (x: { uuid: string, stmts: T[] }) => U,
  Import: (x: { uuid: string, moduleName: string }) => U,
  FunDecl: (x: { uuid: string, funName: string, funDef: T }) => U,
  BinOp: (x: { uuid: string, operator: string, lhs: T, rhs: T }) => U,
  UnOp: (x: { uuid: string, operator: string, arg: T }) => U,
  Var: (x: { uuid: string, moduleName: string | null, name: string }) => U,
  Index: (x: { uuid: string, coll: T, index: T }) => U,
  Lambda: (x: { uuid: string, ins: string[], outs: string[] | null, body: T[] }) => U,
  FunAppl: (x: { uuid: string, func: T, args: (T | '_')[] }) => U,
  Tuple: (x: { uuid: string, elems: T[] }) => U,
  Literal: (x: { uuid: string, value: string | number | boolean | null }) => U,
  Array: (x: { uuid: string, elems: T[] }) => U,
  Object: (x: { uuid: string, elems: [string, T][] }) => U
};

function fold<T>(node: SSNode, fs: SSAction<T, T>): T {
  const fold1 = (n: SSNode) => fold(n, fs);
  return run<T>(node, {
    Module: v => fs['Module']({ ...v, stmts: v.stmts.map(fold1) }),
    Import: v => fs['Import'](v),
    FunDecl: v => fs['FunDecl']({ ...v, funDef: fold1(v.funDef) }),
    BinOp: v => fs['BinOp']({ ...v, lhs: fold1(v.lhs), rhs: fold1(v.rhs) }),
    UnOp: v => fs['UnOp']({ ...v, arg: fold1(v.arg) }),
    Var: v => fs['Var'](v),
    Index: v => fs['Index']({ ...v, coll: fold1(v.coll), index: fold1(v.index) }),
    Lambda: v => fs['Lambda']({...v, body: v.body.map(fold1) }),
    FunAppl: v => fs['FunAppl']({ ...v, func: fold1(v.func), args: v.args.map(fold1) }),
    Tuple: v => fs['Tuple']({ ...v, elems: v.elems.map(fold1) }),
    Literal: v => fs['Literal'](v),
    Array: v => fs['Array']({ ...v, elems: v.elems.map(fold1) }),
    Object: v => fs['Object']({ ...v, elems: v.elems.map(([k, v]) => [k, fold1(v)]) })
  });
}

function run<T>(node: SSNode, fs: SSAction<SSNode, T>): T {
  // @ts-ignore: type of fs ensures node has the correct type
  return fs[node.type](node);
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

export { fold, run, render };
