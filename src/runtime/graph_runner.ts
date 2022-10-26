import Graph from "../compiler/graph";
import { ComponentStore } from "../types";
import { Component, Publisher, Subscriber } from "./types";
import { ComponentClass } from "./component_loader";
import Builder from "./lib/PublisherBuilder";
import PacketListener from "./listener/PacketListener";

function toComponent(
  graph: Graph,
  componentStore: ComponentStore<ComponentClass>,
  listener?: PacketListener,
  graphName?: string
): Component<unknown[], unknown[]> {
  const nodeComponents: { [nodeId: string]: Component<unknown[], unknown[]> } = {};

  graph.nodes.forEach((nodeImpl, nodeId) => {
    nodeComponents[nodeId] =
      "componentId" in nodeImpl ?
        new componentStore.components[nodeImpl.componentId].impl() :
        toComponent(graph.getSubgraph(nodeImpl.subgraphId), componentStore, listener, nodeId);

    if (listener) {
      nodeComponents[nodeId].whenTerminated()
        .then(listener.nodeListenerFor(nodeId, graphName).onTerminate);
    }
  });

  graph.edges.forEach(({ from, to }) => {
    const fromComp = nodeComponents[from.nodeId];
    const toComp = nodeComponents[to.nodeId];

    let builder = Builder.from(fromComp.publisherFor(fromComp.spec.outs.indexOf(from.portName)));
    if (listener) {
      const edgeListener = listener.edgeListenerFor(from, to, graphName);
      builder = builder.tap(edgeListener.downstream, edgeListener.upstream);
    }
    builder.to(toComp.subscriberFor(toComp.spec.ins.indexOf(to.portName)));
  });

  graph.initials.forEach((value, port) => {
    const toComp = nodeComponents[port.nodeId];
    Builder
      .fromSingle(value).async()
      .to(toComp.subscriberFor(toComp.spec.ins.indexOf(port.portName)));
  });

  // function printStatus(): void {
  //   console.log(graphName);
  //   console.log(Object.entries(nodeComponents).map(([key, comp]) => [key, comp.isTerminated()]));
  //   setTimeout(printStatus, 1000);
  // }
  // setTimeout(printStatus, 1000);

  return {
    spec: {
      ins: graph.externalIns.map(p => p.portName),
      outs: graph.externalOuts.map(p => p.portName),
    },

    publisherFor<K extends number & keyof unknown>(idx: K): Publisher<unknown> {
      const port = graph.externalOuts[idx].innerPort;
      const comp = nodeComponents[port.nodeId];
      return comp.publisherFor(comp.spec.outs.indexOf(port.portName));
    },

    subscriberFor<K extends number & keyof unknown>(idx: K): Subscriber<unknown> {
      const port = graph.externalIns[idx].innerPort;
      const comp = nodeComponents[port.nodeId];
      return comp.subscriberFor(comp.spec.ins.indexOf(port.portName));
    },

    start(): void {
      Object.entries(nodeComponents).forEach(([_, comp]) => comp.start());
    },

    terminate(): void {
      Object.entries(nodeComponents).forEach(([_, comp]) => comp.terminate());
    },

    isTerminated(): boolean {
      return Object.entries(nodeComponents).every(([_, comp]) => comp.isTerminated());
    },

    whenTerminated(): Promise<unknown> {
      return Promise.all(
        Object.entries(nodeComponents).map(([_, comp]) => comp.whenTerminated())
      );
    }
  };
}

function runGraph(
  graph: Graph,
  componentStore: ComponentStore<ComponentClass>,
  listener?: PacketListener
): Component<unknown[], unknown[]> {
  const comp = toComponent(graph, componentStore, listener);
  comp.start();
  return comp;
}

export default { runGraph };
