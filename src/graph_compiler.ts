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
  rootModuleName: string | null,
  isRoot: boolean): NodeSpec {

  const graphX = new GraphX(graph, rootModuleName ?? "__main");

  if (rootModuleName === "io") {
    graphX.graph().addNode(graphX.nodeIdForVar(rootModuleName, "stdout"), "core/Output");
  }

  function build(node: SSNode): NodeSpec {
    return run<NodeSpec>(node, {
      Module: ({ stmts }) => {
        const moduleNode = graphX.addModuleNode();
        if (isRoot) {
          // moduleNode.ins.forEach(p => graphX.graph().addExternalIn(p));
          graphX.graph().setInitial(moduleNode.ins[0], {});
        }
        stmts.forEach(build);
        return moduleNode; // return graphX.graph().asNodeSpec();
      },
      Import: ({ moduleName }) => {
        // TODO: implement module system
        const moduleAst = parser.parseFile(`sslib/${moduleName}.ss`);
        const importedModuleNode = compileGraph(moduleAst, graphX.graph(), moduleName, false);
        graphX.graph().connectNodes(graphX.addModuleNode(), importedModuleNode);
        return importedModuleNode;
      },
      FunDecl: ({ funName, funDef }) => {
        build(funDef);
        // TODO: do this without renaming
        graphX.graph().addSubgraph(
          funName,
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
          graphX.addLocalVarNode(name);
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
          graphX.addLocalVarNode(name, true).ins.forEach(p =>
            graphX.graph().addExternalIn(name, p)
          )
        );
        outs.forEach(name =>
          graphX.addLocalVarNode(name, true).outs.forEach(p =>
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
        if (func.moduleName) {
          throw new Error("Function application on module functions is not implemented");
        }
        const argNodes = args.map(build);
        const node = graphX.addLocalFunctionNode(func.name, uuid);
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
