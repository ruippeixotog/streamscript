import assert from "assert";
import { run } from "../parser/ast";
import Graph from "./graph";
import util from "./util";
import GraphX from "./graph_x";
import parser from "../parser";
import type { SSNode } from "../parser/ast";
import type { InPortRef, PartRef } from "./graph";

function compileGraphAux(
  ast: SSNode,
  graphX: GraphX,
  importRootDir: string,
  thisModuleName: string | null): PartRef {

  function build(node: SSNode): PartRef {
    return run<PartRef>(node, {
      Module: ({ stmts }) => {
        stmts.forEach(build);
        return { ins: [], outs: [] };
      },
      Import: ({ moduleName }) => {
        const moduleAst = parser.parseFile(`${importRootDir}/${moduleName}.ss`);
        compileGraphAux(moduleAst, graphX, importRootDir, moduleName);
        return { ins: [], outs: [] };
      },
      FunDecl: ({ funName, funDef }) => {
        build(funDef);
        // TODO: do this without renaming
        graphX.graph().addSubgraph(
          graphX.fullVarName(thisModuleName, funName),
          graphX.graph().getSubgraph(`Lambda_${funDef.uuid}`)
        );
        return { ins: [], outs: [] };
      },
      BinOp: ({ uuid, operator, lhs, rhs }) => {
        const [lhsRef, rhsRef] = [build(lhs), build(rhs)];
        if (operator === "->") {
          return graphX.connect(lhsRef, rhsRef, false);
        }
        if (operator === "<-") {
          return graphX.connect(rhsRef, lhsRef, false);
        }
        const componentId = graphX.graph().componentStore.specials.binOps[operator];
        const nodeId = `${componentId.split("/")[1]}: #${uuid}`;
        return graphX.connectBin(lhsRef, rhsRef, graphX.graph().addNode(nodeId, componentId));
      },
      UnOp: ({ uuid, operator, arg }) => {
        const argRef = build(arg);

        const componentId = graphX.graph().componentStore.specials.unOps[operator];
        const nodeId = `${componentId.split("/")[1]}_${uuid}`;
        return graphX.connect(argRef, graphX.graph().addNode(nodeId, componentId));
      },
      Var: ({ moduleName, name }) => {
        return graphX.addVarNode(moduleName ?? thisModuleName, name, false, moduleName !== null);
      },
      Index: ({ uuid, coll, index }) => {
        const [collRef, indexRef] = [build(coll), build(index)];
        util.assertOutArity(1, collRef);
        util.assertOutArity(1, indexRef);
        const node = graphX.graph().addNode(`Index_${uuid}`, graphX.graph().componentStore.specials.index);
        return graphX.connectBin(collRef, indexRef, node);
      },
      Lambda: ({ uuid, ins, outs, body }) => {
        if (!outs) {
          throw new Error("Short lambda form not supported currently");
        }
        graphX.openScope(uuid);
        ins.forEach(name =>
          graphX.addVarNode(thisModuleName, name, true, false).ins.forEach(p =>
            graphX.graph().addExternalIn(name, p)
          )
        );
        outs.forEach(name =>
          graphX.addVarNode(thisModuleName, name, true, false).outs.forEach(p =>
            graphX.graph().addExternalOut(name, p)
          )
        );
        body.map(build);
        const innerGraph = graphX.closeScope();
        graphX.graph().addSubgraph(`Lambda_${uuid}`, innerGraph);

        return { ins: [], outs: [] };
      },
      FunAppl: ({ uuid, func, args }) => {
        if (func.type !== "Var") {
          throw new Error("Function application on non-variables is not implemented");
        }
        if (func.name === "extern") {
          assert.equal(1, args.length, "`extern` should be called with a single argument");
          assert.equal("string", typeof (args[0] as { value?: unknown }).value, "`extern` can only be called with a literal string");
          return graphX.addExternNode((args[0] as { value: string }).value, uuid);
        }
        const node = graphX.addFunctionNode(func.moduleName ?? thisModuleName, func.name, uuid);
        util.assertInArity(args.length, node);

        const openIns = args.reduce<InPortRef[]>((ins, arg, i) => {
          if (arg.type === "Wildcard") {
            return ins.concat(node.ins[i]);
          } else {
            const argNode = build(arg);
            util.assertOutArity(1, argNode);
            graphX.graph().addEdge(argNode.outs[0], node.ins[i]);
            return ins;
          }
        }, []);

        return { ins: openIns, outs: node.outs };
      },
      Tuple: ({ elems }) => {
        const elemRefs = elems.map(build);
        const ins = elemRefs.every(e => e.ins.length === 1) ? elemRefs.map(e => e.ins[0]) : [];
        const outs = elemRefs.every(e => e.outs.length === 1) ? elemRefs.map(e => e.outs[0]) : [];

        if (elemRefs.length !== 0 && ins.length === 0 && outs.length === 0) {
          throw new Error("bad tuple");
        }
        return { ins, outs };
      },
      Literal: ({ uuid, value }) => graphX.addConstNode(value, uuid),
      Array: ({ uuid, elems }) => {
        let emptyRef = graphX.addConstNode([], uuid);
        if (elems.length === 0) return emptyRef;

        const repComponentId = graphX.graph().componentStore.specials.unOps["@"];
        const repNodeId = `${repComponentId.split("/")[1]}_${uuid}`;
        emptyRef = graphX.connect(emptyRef, graphX.graph().addNode(repNodeId, repComponentId));

        const elemRefs = elems.map(build);
        return elemRefs.reduce(
          (arr, elem, elemIdx) => {
            util.assertOutArity(1, elem);
            const componentId = graphX.graph().componentStore.specials.arrayPush;
            const node = graphX.graph().addNode(`ArrayPush: #${uuid}_${elemIdx}`, componentId);
            return graphX.connectBin(arr, elem, node);
          },
          emptyRef
        );
      },
      Object: ({ uuid, elems }) => {
        let emptyRef = graphX.addConstNode({}, uuid);
        if (elems.length === 0) return emptyRef;

        const repComponentId = graphX.graph().componentStore.specials.unOps["@"];
        const repNodeId = `${repComponentId.split("/")[1]}_${uuid}`;
        emptyRef = graphX.connect(emptyRef, graphX.graph().addNode(repNodeId, repComponentId));

        const elemRefs: [PartRef, PartRef][] = elems.map(([k, v]) => [build(k), build(v)]);
        return elemRefs.reduce(
          (obj, [key, value], elemIdx) => {
            util.assertOutArity(1, key);
            util.assertOutArity(1, value);
            const componentId = graphX.graph().componentStore.specials.objectSet;
            const node = graphX.graph().addNode(`SetPropertyValue: #${uuid}_${elemIdx}`, componentId);
            graphX.graph().addEdge(key.outs[0], node.ins[0]);
            graphX.graph().addEdge(value.outs[0], node.ins[1]);
            graphX.graph().addEdge(obj.outs[0], node.ins[2]);
            return { ins: [], outs: node.outs };
          },
          emptyRef
        );
      },
      Wildcard: () => {
        // return placeholder
        return { ins: [], outs: [] };
      },
      Void: () => {
        return graphX.graph().getVoidNode();
      }
    });
  }

  return build(ast);
}

function compileGraph(
  ast: SSNode,
  graph: Graph,
  importRootDir: string,
  preludeModule: string | null = "core"): void {

  const graphX = new GraphX(graph, preludeModule);

  if (preludeModule) {
    const moduleAst = parser.parseFile(`${importRootDir}/${preludeModule}.ss`);
    compileGraphAux(moduleAst, graphX, importRootDir, preludeModule);
  }
  compileGraphAux(ast, graphX, importRootDir, null);
}

export default { compileGraph };
