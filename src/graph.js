/* @flow */

import util from "./graph_util";
import { Set, Map } from "immutable";

export type InPort = { nodeId: string, portName: string };
export type OutPort = { nodeId: string, portName: string };

export type ComponentSpec = {
  ins: string[],
  outs: string[],
};

export type NodeSpec = {
  ins: InPort[],
  outs: OutPort[]
};

class Graph {
  components: Map<string, ComponentSpec>;
  nodes: Map<string, string>;
  edges: Set<[InPort, OutPort]>;
  initials: Map<InPort, any>;
  externalIns: Set<InPort>;
  externalOuts: Set<OutPort>;

  constructor(components: Map<string, ComponentSpec>) {
    this.components = components;
    this.nodes = new Map();
    this.edges = new Set();
    this.initials = new Map();
    this.externalIns = new Set();
    this.externalOuts = new Set();
  }

  addNode(nodeId: string, componentId: string): NodeSpec {
    const component = this.components.get(componentId);
    if (!component) {
      throw new Error(`Unknown component: ${componentId}`);
    }
    this.nodes = this.nodes.set(nodeId, componentId);
    return this.getNode(nodeId);
  }

  getNode(nodeId: string): NodeSpec {
    const componentId = this.nodes.get(nodeId);
    if (!componentId) {
      throw new Error(`Unknown node: ${nodeId}`);
    }
    const component = this.components.get(componentId);
    if (!component) {
      throw new Error(`Unknown component: ${componentId}`);
    }
    return {
      ins: component.ins.map(portName => ({ nodeId, portName })),
      outs: component.outs.map(portName => ({ nodeId, portName }))
    };
  }

  setInitial(port: InPort, value: any): void {
    this.initials = this.initials.set(port, value);
  }

  connectPorts(from: InPort, to: OutPort): void {
    this.edges = this.edges.add([from, to]);
  }

  connectNodes(from: NodeSpec, to: NodeSpec, closeIns: boolean = true): NodeSpec {
    util.assertConnectArity(from, to);
    for (let i = 0; i < to.ins.length; i++) {
      this.connectPorts(from.outs[i], to.ins[i]);
    }
    return { ins: closeIns ? [] : from.ins, outs: to.outs };
  }

  connectNodesBin(from1: NodeSpec, from2: NodeSpec, to: NodeSpec): NodeSpec {
    util.assertOutArity(1, from1);
    util.assertOutArity(1, from2);
    util.assertInArity(2, to);
    this.connectPorts(from1.outs[0], to.ins[0]);
    this.connectPorts(from2.outs[0], to.ins[1]);
    return { ins: [], outs: to.outs };
  }

  connectNodesMulti(from: NodeSpec[], to: NodeSpec, closeIns: boolean = true): NodeSpec {
    util.assertInArity(from.reduce((sum, e) => sum + e.outs.length, 0), to);
    let toIdx = 0;
    for (let k = 0; k < from.length; k++) {
      for (let i = 0; i < from[k].outs.length; i++) {
        this.connectPorts(from[k].outs[i], to.ins[toIdx++]);
      }
    }
    return { ins: closeIns ? [] : from.flatMap(e => e.ins), outs: to.outs };
  }

  addExternalIn(port: InPort): void {
    this.externalIns = this.externalIns.add(port);
  }

  addExternalOut(port: OutPort): void {
    this.externalOuts = this.externalOuts.add(port);
  }

  print() {
    console.log("Nodes:");
    this.nodes.forEach((v, k) => console.log(k, "->", v));
    console.log("Edges:");
    this.edges.forEach(v => console.log(v));
    console.log("Initials:");
    this.initials.forEach((v, k) => console.log(k, "<-", v));
    console.log("External inputs:");
    this.externalIns.forEach(v => console.log(v));
    console.log("External outputs:");
    this.externalOuts.forEach(v => console.log(v));
  }
}

export default Graph;
