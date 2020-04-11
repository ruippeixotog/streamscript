import { run } from "./ast";
import util from "./graph_util";
// import SymbolTable from "./symbol_table";
import type { SSNode } from "./ast";
// import type { SymbolInfo } from "./symbol_table";
import Graph from "./graph";
import type { NodeSpec } from "./graph";
import parser from "./parser";

// const st = new SymbolTable();

function compileGraph(
  ast: SSNode,
  graph: Graph,
  rootModuleName: string | null,
  isRoot: boolean): NodeSpec {

  const moduleNode = graph.addNode(
    util.nodeIdForModule(rootModuleName ?? "__main"),
    "core/Repeat"
  );
  if (isRoot) {
    graph.addExternalIn(moduleNode.ins[0]);
  }

  if (rootModuleName === "io") {
    graph.addNode(util.nodeIdForVar(rootModuleName, "stdout"), "core/Output");
  }

  function createNodeForConst(value: any): NodeSpec {
    const node = graph.addNode(util.nodeIdForConst(value), "core/Kick");
    graph.connectPorts(moduleNode.outs[0], node.ins[0]);
    graph.setInitial(node.ins[1], value);
    return { ins: [], outs: node.outs };
  }

  function build(node: SSNode): NodeSpec {
    return run<NodeSpec>(node, {
      Module: ({ stmts }) => {
        stmts.map(build);
        return moduleNode;
      },
      Import: ({ moduleName }) => {
        // TODO: implement module system
        // if (moduleName === "io") {
        //   graph.addNode(util.nodeIdForVar(moduleName, "stdout"), "core/Output");
        //   // st.pushModule("io", {
        //   //   stdout: { ins: [{ nodeId: stdoutNodeId, portName: "in" }], outs: [] }
        //   // });
        // } else {
        const moduleAst = parser.parseFile(`sslib/${moduleName}.ss`);
        const importedModuleNode = compileGraph(moduleAst, graph, moduleName, false);
        graph.connectNodes(moduleNode, importedModuleNode);
        return importedModuleNode;
        // }
      },
      FunDecl: ({ funName, funDef }) => {
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
          graph.getNode(util.nodeIdForVar(moduleName, name)) :
          graph.addNode(util.nodeIdForVar(moduleName, name), "core/Repeat");
        // const nodeId = `__var_${moduleName ?? ""}_${name}`;
        // let nodeInfo = st.getSymbol(moduleName, name);

        // if (!nodeInfo) {
        //   if (moduleName) {
        //     throw new Error(`Module symbol not found: ${moduleName}.${name}`);
        //   }
        //   graph.addNode(nodeId, "core/Repeat");
        //   nodeInfo = { ins: [{ nodeId, portName: "in" }], outs: [{ nodeId, portName: "out" }] };
        //   st.pushSymbol(name, nodeInfo);
        // }
        // return nodeInfo;
      },
      Index: ({ uuid, coll, index }) => {
        const [collSpec, indexSpec] = [build(coll), build(index)];
        util.assertOutArity(1, collSpec);
        util.assertOutArity(1, indexSpec);
        const node = graph.addNode(`Index_${uuid}`, "streamscript/Index");
        return graph.connectNodesMulti([collSpec, indexSpec], node);
      },
      Lambda: ({ ins, outs, body }) => {
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
      Literal: ({ value }) => createNodeForConst(value),
      Array: ({ uuid, elems }) => {
        const elemSpecs = elems.map(build);
        return elemSpecs.reduce(
          (arr, elem, elemIdx) => {
            util.assertOutArity(1, elem);
            const node = graph.addNode(`ArrayPush: #${uuid}_${elemIdx}`, "streamscript/ArrayPush");
            return graph.connectNodesMulti([arr, elem], node);
          },
          createNodeForConst([])
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
          createNodeForConst({})
        );
      }
    });
  }

  return build(ast);
}

export default { compileGraph };
