import type noflo from "noflo";
import type { SymbolInfo, InPort, OutPort } from "./symbol_table";
import assert from "assert";
import SymbolTable from "./symbol_table";
import type { NodeSpec } from "./graph";

const moduleInitNode = (moduleName: string) => `__${moduleName}_module_init`;

class GraphUtil {
  graph: noflo.Graph;

  constructor(graph: noflo.Graph) {
    this.graph = graph;
  }

  setRootModule(moduleName: string): void {
    this.graph.addInport("in", moduleInitNode(moduleName), "in");
  }

  // addModuleInitNode(moduleName: string): SymbolInfo {
  //   this.graph.addNode(moduleInitNode(moduleName), "core/Repeat");
  //   return {
  //     ins: [{ nodeId: moduleInitNode(moduleName), portName: "in" }],
  //     outs: [{ nodeId: moduleInitNode(moduleName), portName: "out" }]
  //   };
  // }

  // connect(from: InPort, to: OutPort): void {
  //   this.graph.addEdge(from.nodeId, from.portName, to.nodeId, to.portName);
  // }
  //
  // connectNodes(from: SymbolInfo, to: SymbolInfo): SymbolInfo {
  //   this.assertConnectArity(from, to);
  //   for (let i = 0; i < to.ins.length; i++) {
  //     this.connect(from.outs[i], to.ins[i]);
  //   }
  //   return { ins: from.ins, outs: to.outs };
  // }
  //
  // connectNodesMulti(from: SymbolInfo[], to: SymbolInfo): SymbolInfo {
  //   this.assertInArity(from.reduce((sum, e) => sum + e.outs.length, 0), to);
  //   let toIdx = 0;
  //   for (let k = 0; k < from.length; k++) {
  //     for (let i = 0; i < from[k].outs.length; i++) {
  //       this.connect(from[k].outs[i], to.ins[toIdx++]);
  //     }
  //   }
  //   return { ins: from.flatMap(e => e.ins), outs: to.outs };
  // }

}

function nodeIdForConst(value: any): string {
  return `Const: ${JSON.stringify(value)}`;
}

function nodeIdForVar(moduleName: string | null, name: string): string {
  return `Var: ${moduleName ? moduleName + "." : ""}${name}`;
}

function nodeIdForModule(name: string): string {
  return `Module: ${name}`;
}

function withClosedIns(s: NodeSpec): NodeSpec {
  return { ins: [], outs: s.outs };
}

function assertConnectArity(from: NodeSpec, to: NodeSpec): void {
  assert.equal(to.ins.length, from.outs.length,
    `Mismatch between in-arity of ${to.toString()} (${to.ins.length})
      and out-arity of ${from.toString()} (${from.outs.length})`);
}

function assertInArity(arity: number, sym: NodeSpec): void {
  assert.equal(arity, sym.ins.length,
    `Expected in-arity of ${sym.toString()} to be ${arity},
      was ${sym.ins.length} instead`);
}

function assertOutArity(arity: number, sym: NodeSpec): void {
  assert.equal(arity, sym.outs.length,
    `Expected out-arity of ${sym.toString()} to be ${arity},
      was ${sym.outs.length} instead`);
}

export default { nodeIdForModule, nodeIdForConst, nodeIdForVar, withClosedIns, assertConnectArity, assertInArity, assertOutArity };
