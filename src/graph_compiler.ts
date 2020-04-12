import { run } from "./ast";
import Graph from "./graph";
import util from "./graph_util";
import GraphX from "./graph_x";
import parser from "./parser";
import type { SSNode } from "./ast";
import type { NodeSpec } from "./graph";

export type SubgraphSpec = {
  spec: NodeSpec,
  impl: Graph
}

function compileGraph(
  ast: SSNode,
  graph: Graph,
  rootModuleName: string | null,
  isRoot: boolean): NodeSpec {

  const graphX = new GraphX(graph, rootModuleName ?? "__main");

  if (rootModuleName === "io") {
    graph.addNode(graphX.nodeIdForVar(rootModuleName, "stdout"), "core/Output");
  }

  function build(node: SSNode): NodeSpec {
    return run<NodeSpec>(node, {
      Module: ({ stmts }) => {
        const moduleNode = graphX.addModuleNode();
        if (isRoot) {
          graph.setExternalIns(moduleNode.ins);
        }
        stmts.forEach(build);
        return moduleNode;
      },
      Import: ({ moduleName }) => {
        // TODO: implement module system
        const moduleAst = parser.parseFile(`sslib/${moduleName}.ss`);
        const importedModuleNode = compileGraph(moduleAst, graph, moduleName, false);
        graph.connectNodes(graphX.addModuleNode(), importedModuleNode);
        return importedModuleNode;
      },
      FunDecl: ({ funName, funDef }) => {
        // build(funDef);
        // graph.addSubgraph(funName, )
        // nodeSpec = build(funDef)
        // st.recordSubgraph(funName, g)
        throw new Error("not implemented");
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
          return graph.connectNodes(lhsSpec, rhsSpec, false);
        }
        if (operator === "<-") {
          return graph.connectNodes(rhsSpec, lhsSpec, false);
        }
        const componentId = ops[operator];
        const nodeId = `${componentId.split("/")[1]}: #${uuid}`;
        return graph.connectNodesBin(lhsSpec, rhsSpec, graph.addNode(nodeId, componentId));
      },
      UnOp: ({ uuid, operator, arg }) => {
        const argSpec = build(arg);
        const ops: { [key: string]: string } = {
          "-": "streamscript/Negate",
          "!": "streamscript/Not"
        };

        const componentId = ops[operator];
        const nodeId = `${componentId.split("/")[1]}_${uuid}`;
        return graph.connectNodes(argSpec, graph.addNode(nodeId, componentId));
      },
      Var: ({ moduleName, name }) => {
        return moduleName ?
          graph.getNode(graphX.nodeIdForVar(moduleName, name)) :
          graphX.addLocalVarNode(name);
      },
      Index: ({ uuid, coll, index }) => {
        const [collSpec, indexSpec] = [build(coll), build(index)];
        util.assertOutArity(1, collSpec);
        util.assertOutArity(1, indexSpec);
        const node = graph.addNode(`Index_${uuid}`, "streamscript/Index");
        return graph.connectNodesMulti([collSpec, indexSpec], node);
      },
      Lambda: ({ uuid, ins, outs, body }) => {
        // const innerGraph = new Graph(graph.components);
        // graphX.openScope(uuid);
        // // g = new Graph()
        // // st.pushVars(ins, outs)
        // // g.addNode(ins, outs)
        // body.forEach(build);
        // graphX.closeScope();
        throw new Error("not implemented");
      },
      FunAppl: ({ func, args }) => {
        throw new Error("not implemented");
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
            const node = graph.addNode(`ArrayPush: #${uuid}_${elemIdx}`, "streamscript/ArrayPush");
            return graph.connectNodesMulti([arr, elem], node);
          },
          graphX.addConstNode([])
        );
      },
      Object: ({ uuid, elems }) => {
        const elemSpecs: [string, NodeSpec][] = elems.map(([k, v]) => [k, build(v)]);
        return elemSpecs.reduce(
          (obj, [key, value], elemIdx) => {
            util.assertOutArity(1, value);
            const node = graph.addNode(`SetPropertyValue: #${uuid}_${elemIdx}`, "objects/SetPropertyValue");
            graph.setInitial(node.ins[0], key);
            graph.connectPorts(value.outs[0], node.ins[1]);
            graph.connectPorts(obj.outs[0], node.ins[2]);
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
