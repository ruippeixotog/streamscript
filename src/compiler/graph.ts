import DeepMap from "../util/DeepMap";
import { ComponentStore } from "../types";

/**
 * A node in the graph, containing information about how it should be instantiated.
 */
export type Node =
  { componentId: string } |
  { subgraphId: string };

/**
 * An object that uniquely identifies an in port in the graph.
 */
export type InPortRef = { nodeId: string; portName: string };

/**
 * An object that uniquely identifies an out port in the graph.
 */
export type OutPortRef = { nodeId: string; portName: string };

/**
 * A specification of an edge in the graph.
 */
export type Edge = {
  from: OutPortRef;
  to: InPortRef;
};

/**
 * A reference to a connected section of this graph. A graph part can include one or more connected
 * nodes and can be seen as a single node in that it defines in and out ports.
 */
export type PartRef = {
  ins: InPortRef[];
  outs: OutPortRef[];
};

/**
 * A reference to an in port of the graph that is to be exposed externally.
 */
export type ExtInPortRef = {
  portName: string;
  innerPort: InPortRef;
  implicit: boolean;
};

/**
 * A reference to an out port of the graph that is to be exposed externally.
 */
export type ExtOutPortRef = {
  portName: string;
  innerPort: OutPortRef;
  implicit: boolean;
};

class Graph {
  componentStore: ComponentStore<unknown>;
  nodes: DeepMap<string, Node>;
  edges: Edge[];
  initials: DeepMap<InPortRef, unknown>;
  subgraphs: DeepMap<string, Graph>;
  externalIns: ExtInPortRef[];
  externalOuts: ExtOutPortRef[];

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

  addNode(nodeId: string, componentId: string): PartRef {
    const component = this.componentStore.components[componentId];
    if (!component) {
      throw new Error(`Unknown component: ${componentId}`);
    }
    this.nodes.set(nodeId, { componentId });
    return this.getNode(nodeId);
  }

  addSubgraphNode(nodeId: string, subgraphId: string): PartRef {
    this.subgraphs.getOrElse(subgraphId, () => {
      throw new Error(`Unknown subgraph: ${subgraphId}`);
    });
    this.nodes.set(nodeId, { subgraphId });
    return this.getNode(nodeId);
  }

  getNode(nodeId: string): PartRef {
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
      return subgraph.asSubgraphRef(nodeId);
    }
  }

  setInitial(port: InPortRef, value: unknown): void {
    this.initials.set(port, value);
  }

  addEdge(from: OutPortRef, to: InPortRef): void {
    if (from.nodeId !== Graph.VOID_NODE && to.nodeId !== Graph.VOID_NODE) {
      this.edges.push({ from, to });
    }
  }

  getSubgraph(subgraphId: string): Graph {
    return this.subgraphs.getOrElse(subgraphId, () => {
      throw new Error(`Unknown subgraph: ${subgraphId}`);
    });
  }

  addSubgraph(subgraphId: string, subgraph: Graph): void {
    this.subgraphs.set(subgraphId, subgraph);
  }

  addExternalIn(portName: string, innerPort: InPortRef, implicit = false): void {
    this.externalIns.push({ portName, innerPort, implicit });
  }

  addExternalOut(portName: string, innerPort: OutPortRef, implicit = false): void {
    this.externalOuts.push({ portName, innerPort, implicit });
  }

  asSubgraphRef(nodeId: string): PartRef {
    return {
      ins: this.externalIns.filter(p => !p.implicit)
        .map(p => ({ portName: p.portName, nodeId })),
      outs: this.externalOuts.filter(p => !p.implicit)
        .map(p => ({ portName: p.portName, nodeId }))
    };
  }

  getVoidNode(): PartRef {
    return {
      ins: [{ nodeId: Graph.VOID_NODE, portName: "in" }],
      outs: [{ nodeId: Graph.VOID_NODE, portName: "out" }]
    };
  }
}

export default Graph;
