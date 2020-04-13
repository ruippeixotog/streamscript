import assert from "assert";
import { run } from "./ast";
import Graph from "./graph";
import util from "./graph_util";
import GraphX from "./graph_x";
import parser from "./parser";
import type { SSNode } from "./ast";
import type { NodeSpec } from "./graph";

function compileGraph(
  ast: SSNode,
  graph: Graph,
  thisModuleName: string | null = null): NodeSpec {

  const graphX = new GraphX(graph);

  function build(node: SSNode): NodeSpec {
    return run<NodeSpec>(node, {
      Module: ({ stmts }) => {
        stmts.forEach(build);
        return { ins: [], outs: [] };
      },
      Import: ({ moduleName }) => {
        const moduleAst = parser.parseFile(`sslib/${moduleName}.ss`);
        compileGraph(moduleAst, graphX.graph(), moduleName);
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
        const ops: { [key: string]: string } = {
          "||": "streamscript/Or",
          "&&": "streamscript/And",
          "<=": "streamscript/Lte",
          "<": "streamscript/Lt",
          "==": "streamscript/Eq",
          "!=": "streamscript/Neq",
          ">=": "streamscript/Gte",
          ">": "streamscript/Gt",
          "+": "math/Add",
          "-": "math/Subtract",
          "*": "math/Multiply",
          "/": "math/Divide",
          "%": "math/Modulo"
        };

        if (operator === "->") {
          return graphX.graph().connectNodes(lhsSpec, rhsSpec, false);
        }
        if (operator === "<-") {
          return graphX.graph().connectNodes(rhsSpec, lhsSpec, false);
        }
        const componentId = ops[operator];
        const nodeId = `${componentId.split("/")[1]}: #${uuid}`;
        return graphX.graph().connectNodesBin(lhsSpec, rhsSpec, graphX.graph().addNode(nodeId, componentId));
      },
      UnOp: ({ uuid, operator, arg }) => {
        const argSpec = build(arg);
        const ops: { [key: string]: string } = {
          "-": "streamscript/Negate",
          "!": "streamscript/Not"
        };

        const componentId = ops[operator];
        const nodeId = `${componentId.split("/")[1]}_${uuid}`;
        return graphX.graph().connectNodes(argSpec, graphX.graph().addNode(nodeId, componentId));
      },
      Var: ({ moduleName, name }) => {
        return moduleName ?
          graphX.graph().getNode(graphX.nodeIdForVar(moduleName, name)) :
          graphX.addVarNode(thisModuleName, name);
      },
      Index: ({ uuid, coll, index }) => {
        const [collSpec, indexSpec] = [build(coll), build(index)];
        util.assertOutArity(1, collSpec);
        util.assertOutArity(1, indexSpec);
        const node = graphX.graph().addNode(`Index_${uuid}`, "streamscript/Index");
        return graphX.graph().connectNodesBin(collSpec, indexSpec, node);
      },
      Lambda: ({ uuid, ins, outs, body }) => {
        if (!outs) {
          throw new Error("Short lambda form not supported currently");
        }
        graphX.openScope(uuid);
        ins.forEach(name =>
          graphX.addVarNode(thisModuleName, name, true).ins.forEach(p =>
            graphX.graph().addExternalIn(name, p)
          )
        );
        outs.forEach(name =>
          graphX.addVarNode(thisModuleName, name, true).outs.forEach(p =>
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
          assert.equal("Literal", args[0].type, "`extern` can only be called with a literal value");
          assert(typeof (<any> args[0]).value === "string", "`extern` can only be called with a string");
          return graphX.addExternNode((<any> args[0]).value, uuid);
        }
        const argNodes = args.map(build);
        console.log(func.moduleName ?? thisModuleName, func.name);
        const node = graphX.addFunctionNode(func.moduleName ?? thisModuleName, func.name, uuid);
        return graphX.graph().connectNodesMulti(argNodes, node);
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
      Literal: ({ value }) => graphX.addConstNode(value),
      Array: ({ uuid, elems }) => {
        const elemSpecs = elems.map(build);
        return elemSpecs.reduce(
          (arr, elem, elemIdx) => {
            util.assertOutArity(1, elem);
            const node = graphX.graph().addNode(`ArrayPush: #${uuid}_${elemIdx}`, "streamscript/ArrayPush");
            return graphX.graph().connectNodesBin(arr, elem, node);
          },
          graphX.addConstNode([])
        );
      },
      Object: ({ uuid, elems }) => {
        const elemSpecs: [string, NodeSpec][] = elems.map(([k, v]) => [k, build(v)]);
        return elemSpecs.reduce(
          (obj, [key, value], elemIdx) => {
            util.assertOutArity(1, value);
            const node = graphX.graph().addNode(`SetPropertyValue: #${uuid}_${elemIdx}`, "objects/SetPropertyValue");
            graphX.graph().setInitial(node.ins[0], key);
            graphX.graph().connectPorts(value.outs[0], node.ins[1]);
            graphX.graph().connectPorts(obj.outs[0], node.ins[2]);
            return { ins: [], outs: node.outs };
          },
          graphX.addConstNode({})
        );
      }
    });
  }

  return build(ast);
}

export default { compileGraph };
