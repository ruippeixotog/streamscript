import { fold } from "./ast";
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

  return fold<NodeSpec>(ast, {
    Module: () => {
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
      const ops: {[key: string]: string} = {
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
        return graph.connectNodes(lhs, rhs, false);
      }
      if (operator === "<-") {
        return graph.connectNodes(rhs, lhs, false);
      }
      const componentId = ops[operator];
      const nodeId = `${componentId.split("/")[1]}: #${uuid}`;
      return graph.connectNodesBin(lhs, rhs, graph.addNode(nodeId, componentId));
    },
    UnOp: ({ uuid, operator, arg }) => {
      const ops: {[key: string]: string} = {
        "-": "streamscript/Negate",
        "!": "streamscript/Not"
      };

      const componentId = ops[operator];
      const nodeId = `${componentId.split("/")[1]}_${uuid}`;
      return graph.connectNodes(arg, graph.addNode(nodeId, componentId));
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
      util.assertOutArity(1, coll);
      util.assertOutArity(1, index);
      const node = graph.addNode(`Index_${uuid}`, "streamscript/Index");
      return graph.connectNodesMulti([coll, index], node);
    },
    Lambda: ({ ins, outs, body }) => {
      throw new Error("not implemented");
    },
    FunAppl: ({ func, args }) => {
      throw new Error("not implemented");
    },
    Tuple: ({ elems }) => {
      const ins = elems.every(e => e.ins.length === 1) ? elems.map(e => e.ins[0]) : [];
      const outs = elems.every(e => e.outs.length === 1) ? elems.map(e => e.outs[0]) : [];

      if (elems.length !== 0 && ins.length === 0 && outs.length === 0) {
        throw new Error("bad tuple");
      }
      return { ins, outs };
    },
    Literal: ({ value }) => {
      const node = graph.addNode(util.nodeIdForConst(value), "core/Kick");
      graph.connectPorts(moduleNode.outs[0], node.ins[0]);
      graph.setInitial(node.ins[1], value);
      return { ins: [], outs: node.outs };
    },
    Array: ({ uuid, elems }) => {
      const emptyArrNode = graph.addNode(util.nodeIdForConst([]), "core/Kick");
      graph.connectPorts(moduleNode.outs[0], emptyArrNode.ins[0]);
      graph.setInitial(emptyArrNode.ins[1], []);

      return elems.reduce(
        (arr, elem, elemIdx) => {
          util.assertOutArity(1, elem);
          const node = graph.addNode(`ArrayPush: #${uuid}_${elemIdx}`, "streamscript/ArrayPush");
          return graph.connectNodesMulti([arr, elem], node);
        },
        { ins: [], outs: emptyArrNode.outs }
      );
    },
    Object: ({ uuid, elems }) => {
      const emptyObjNode = graph.addNode(util.nodeIdForConst({}), "core/Kick");
      graph.connectPorts(moduleNode.outs[0], emptyObjNode.ins[0]);
      graph.setInitial(emptyObjNode.ins[1], {});

      return elems.reduce(
        (obj, [key, value], elemIdx) => {
          util.assertOutArity(1, value);
          const node = graph.addNode(`SetPropertyValue: #${uuid}_${elemIdx}`, "objects/SetPropertyValue");
          graph.setInitial(node.ins[0], key);
          graph.connectPorts(value.outs[0], node.ins[1]);
          graph.connectPorts(obj.outs[0], node.ins[2]);
          return { ins: [], outs: node.outs };
        },
        { ins: [], outs: emptyObjNode.outs }
      );
    }
  });
}

export default { compileGraph };
