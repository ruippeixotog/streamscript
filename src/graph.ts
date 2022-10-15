import DeepMap from "./util/DeepMap";
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

export type EdgeSpec = {
  from: OutPort;
  to: InPort;
};

class Graph {
  componentStore: ComponentStore<unknown>;
  nodes: DeepMap<string, NodeImpl>;
  edges: EdgeSpec[];
  initials: DeepMap<InPort, unknown>;
  subgraphs: DeepMap<string, Graph>;
  externalIns: ExternalInPort[];
  externalOuts: ExternalOutPort[];

  static VOID_NODE = "void";

  constructor(componentStore: ComponentStore<unknown>) {
    this.componentStore = componentStore;
    this.nodes = new DeepMap();
    this.edges = [];
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

  setInitial(port: InPort, value: unknown): void {
    this.initials.set(port, value);
  }

  connectPorts(from: OutPort, to: InPort): void {
    if (from.nodeId !== Graph.VOID_NODE && to.nodeId !== Graph.VOID_NODE) {
      this.edges.push({ from, to });
    }
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
