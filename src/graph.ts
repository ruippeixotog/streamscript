import util from "./graph_util";
import DeepMap from "./util/DeepMap";
import DeepSet from "./util/DeepSet";
import { ComponentStore } from "./types";

export type InPort = { nodeId: string; portName: string };
export type OutPort = { nodeId: string; portName: string };

export type NodeImpl =
  { componentId: string } |
  { subgraphId: string }

export type NodeSpec = {
  ins: InPort[];
  outs: OutPort[];
};

export type ExternalInPort = {
  portName: string;
  innerPort: InPort;
  implicit: boolean;
};

export type ExternalOutPort = {
  portName: string;
  innerPort: OutPort;
  implicit: boolean;
};

class Graph {
  componentStore: ComponentStore<any>;
  nodes: DeepMap<string, NodeImpl>;
  edges: DeepSet<[OutPort, InPort]>;
  initials: DeepMap<InPort, any>;
  subgraphs: DeepMap<string, Graph>;
  externalIns: ExternalInPort[];
  externalOuts: ExternalOutPort[];

  static VOID_NODE = "void";

  constructor(componentStore: ComponentStore<any>) {
    this.componentStore = componentStore;
    this.nodes = new DeepMap();
    this.edges = new DeepSet();
    this.initials = new DeepMap();
    this.subgraphs = new DeepMap();
    this.externalIns = [];
    this.externalOuts = [];
  }

  addNode(nodeId: string, componentId: string): NodeSpec {
    const component = this.componentStore.components[componentId];
    if (!component) {
      throw new Error(`Unknown component: ${componentId}`);
    }
    this.nodes.set(nodeId, { componentId });
    return this.getNode(nodeId);
  }

  addSubgraphNode(nodeId: string, subgraphId: string): NodeSpec {
    this.subgraphs.getOrElse(subgraphId, () => {
      throw new Error(`Unknown subgraph: ${subgraphId}`);
    });
    this.nodes.set(nodeId, { subgraphId });
    return this.getNode(nodeId);
  }

  getNode(nodeId: string): NodeSpec {
    if (nodeId === Graph.VOID_NODE) {
      return this.getVoidNode();
    }
    const nodeImpl = this.nodes.getOrElse(nodeId, () => {
      throw new Error(`Unknown node: ${nodeId}`);
    });
    if ("componentId" in nodeImpl) {
      const component = this.componentStore.components[nodeImpl.componentId];
      if (!component) {
        throw new Error(`Unknown component: ${nodeImpl.componentId}`);
      }
      return {
        ins: component.spec.ins.map(portName => ({ nodeId, portName })),
        outs: component.spec.outs.map(portName => ({ nodeId, portName }))
      };
    } else {
      const subgraph = this.subgraphs.getOrElse(nodeImpl.subgraphId, () => {
        throw new Error(`Unknown subgraph: ${nodeImpl.subgraphId}`);
      });
      return subgraph.asNodeSpec(nodeId);
    }
  }

  setInitial(port: InPort, value: any): void {
    this.initials.set(port, value);
  }

  connectPorts(from: OutPort, to: InPort): void {
    if (from.nodeId !== Graph.VOID_NODE && to.nodeId !== Graph.VOID_NODE) {
      this.edges.add([from, to]);
    }
  }

  connectNodes(from: NodeSpec, to: NodeSpec, closeIns = true): NodeSpec {
    util.assertConnectArity(from, to);
    for (let i = 0; i < to.ins.length; i++) {
      this.connectPorts(from.outs[i], to.ins[i]);
    }
    return { ins: closeIns ? [] : from.ins, outs: to.outs };
  }

  connectNodesBin(from1: NodeSpec, from2: NodeSpec, to: NodeSpec): NodeSpec {
    return this.connectNodesMulti([from1, from2], to);
  }

  connectNodesMulti(from: NodeSpec[], to: NodeSpec, closeIns = true): NodeSpec {
    for (let k = 0; k < from.length; k++) {
      util.assertOutArity(1, from[k]);
    }
    util.assertInArity(from.length, to);
    for (let k = 0; k < from.length; k++) {
      this.connectPorts(from[k].outs[0], to.ins[k]);
    }
    return { ins: closeIns ? [] : from.map(e => e.ins[0]), outs: to.outs };
  }

  connectNodesMultiFluid(from: NodeSpec[], to: NodeSpec, closeIns = true): NodeSpec {
    util.assertInArity(from.reduce((sum, e) => sum + e.outs.length, 0), to);
    let toIdx = 0;
    for (let k = 0; k < from.length; k++) {
      for (let i = 0; i < from[k].outs.length; i++) {
        this.connectPorts(from[k].outs[i], to.ins[toIdx++]);
      }
    }
    return { ins: closeIns ? [] : from.flatMap(e => e.ins), outs: to.outs };
  }

  getSubgraph(subgraphId): Graph {
    return this.subgraphs.getOrElse(subgraphId, () => {
      throw new Error(`Unknown subgraph: ${subgraphId}`);
    });
  }

  addSubgraph(subgraphId: string, subgraph: Graph): void {
    this.subgraphs.set(subgraphId, subgraph);
  }

  addExternalIn(portName: string, innerPort: InPort, implicit = false): void {
    this.externalIns.push({ portName, innerPort, implicit });
  }

  addExternalOut(portName: string, innerPort: OutPort, implicit = false): void {
    this.externalOuts.push({ portName, innerPort, implicit });
  }

  asNodeSpec(nodeId: string): NodeSpec {
    return {
      ins: this.externalIns.filter(p => !p.implicit)
        .map(p => ({ portName: p.portName, nodeId })),
      outs: this.externalOuts.filter(p => !p.implicit)
        .map(p => ({ portName: p.portName, nodeId }))
    };
  }

  getVoidNode(): NodeSpec {
    return {
      ins: [{ nodeId: Graph.VOID_NODE, portName: "in" }],
      outs: [{ nodeId: Graph.VOID_NODE, portName: "out" }]
    };
  }
}

export default Graph;
