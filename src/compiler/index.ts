import assert from "assert";
import { run } from "../parser/ast";
import Graph from "../graph";
import util from "./util";
import GraphX from "./graph_x";
import parser from "../parser";
import type { SSNode } from "../parser/ast";
import type { InPort, NodeSpec } from "../graph";

function compileGraphAux(
  ast: SSNode,
  graphX: GraphX,
  importRootDir: string,
  thisModuleName: string | null): NodeSpec {

  function build(node: SSNode): NodeSpec {
    return run<NodeSpec>(node, {
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
        const [lhsSpec, rhsSpec] = [build(lhs), build(rhs)];
        if (operator === "->") {
          return graphX.graph().connectNodes(lhsSpec, rhsSpec, false);
        }
        if (operator === "<-") {
          return graphX.graph().connectNodes(rhsSpec, lhsSpec, false);
        }
        const componentId = graphX.graph().componentStore.specials.binOps[operator];
        const nodeId = `${componentId.split("/")[1]}: #${uuid}`;
        return graphX.graph().connectNodesBin(lhsSpec, rhsSpec, graphX.graph().addNode(nodeId, componentId));
      },
      UnOp: ({ uuid, operator, arg }) => {
        const argSpec = build(arg);

        const componentId = graphX.graph().componentStore.specials.unOps[operator];
        const nodeId = `${componentId.split("/")[1]}_${uuid}`;
        return graphX.graph().connectNodes(argSpec, graphX.graph().addNode(nodeId, componentId));
      },
      Var: ({ moduleName, name }) => {
        return graphX.addVarNode(moduleName ?? thisModuleName, name, false, moduleName !== null);
      },
      Index: ({ uuid, coll, index }) => {
        const [collSpec, indexSpec] = [build(coll), build(index)];
        util.assertOutArity(1, collSpec);
        util.assertOutArity(1, indexSpec);
        const node = graphX.graph().addNode(`Index_${uuid}`, graphX.graph().componentStore.specials.index);
        return graphX.graph().connectNodesBin(collSpec, indexSpec, node);
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

        const openIns = args.reduce<InPort[]>((ins, arg, i) => {
          if (arg.type === "Wildcard") {
            return ins.concat(node.ins[i]);
          } else {
            const argNode = build(arg);
            util.assertOutArity(1, argNode);
            graphX.graph().connectPorts(argNode.outs[0], node.ins[i]);
            return ins;
          }
        }, []);

        return { ins: openIns, outs: node.outs };
      },
      Tuple: ({ elems }) => {
        const elemSpecs = elems.map(build);
        const ins = elemSpecs.every(e => e.ins.length === 1) ? elemSpecs.map(e => e.ins[0]) : [];
        const outs = elemSpecs.every(e => e.outs.length === 1) ? elemSpecs.map(e => e.outs[0]) : [];

        if (elemSpecs.length !== 0 && ins.length === 0 && outs.length === 0) {
          throw new Error("bad tuple");
        }
        return { ins, outs };
      },
      Literal: ({ uuid, value }) => graphX.addConstNode(value, uuid),
      Array: ({ uuid, elems }) => {
        let emptySpec = graphX.addConstNode([], uuid);
        if (elems.length === 0) return emptySpec;

        const repComponentId = graphX.graph().componentStore.specials.unOps["@"];
        const repNodeId = `${repComponentId.split("/")[1]}_${uuid}`;
        emptySpec = graphX.graph().connectNodes(emptySpec, graphX.graph().addNode(repNodeId, repComponentId));

        const elemSpecs = elems.map(build);
        return elemSpecs.reduce(
          (arr, elem, elemIdx) => {
            util.assertOutArity(1, elem);
            const componentId = graphX.graph().componentStore.specials.arrayPush;
            const node = graphX.graph().addNode(`ArrayPush: #${uuid}_${elemIdx}`, componentId);
            return graphX.graph().connectNodesBin(arr, elem, node);
          },
          emptySpec
        );
      },
      Object: ({ uuid, elems }) => {
        let emptySpec = graphX.addConstNode({}, uuid);
        if (elems.length === 0) return emptySpec;

        const repComponentId = graphX.graph().componentStore.specials.unOps["@"];
        const repNodeId = `${repComponentId.split("/")[1]}_${uuid}`;
        emptySpec = graphX.graph().connectNodes(emptySpec, graphX.graph().addNode(repNodeId, repComponentId));

        const elemSpecs: [NodeSpec, NodeSpec][] = elems.map(([k, v]) => [build(k), build(v)]);
        return elemSpecs.reduce(
          (obj, [key, value], elemIdx) => {
            util.assertOutArity(1, key);
            util.assertOutArity(1, value);
            const componentId = graphX.graph().componentStore.specials.objectSet;
            const node = graphX.graph().addNode(`SetPropertyValue: #${uuid}_${elemIdx}`, componentId);
            graphX.graph().connectPorts(key.outs[0], node.ins[0]);
            graphX.graph().connectPorts(value.outs[0], node.ins[1]);
            graphX.graph().connectPorts(obj.outs[0], node.ins[2]);
            return { ins: [], outs: node.outs };
          },
          emptySpec
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
