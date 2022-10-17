import Graph from "../compiler/graph";
import { ComponentStore } from "../types";
import { Component, Publisher, Subscriber } from "./types";
import { ComponentClass } from "./component_loader";
import Builder from "./lib/PublisherBuilder";
import Logger from "./Logger";

function toComponent(
  graph: Graph,
  componentStore: ComponentStore<ComponentClass>,
  logger: Logger,
  graphName?: string
): Component<unknown[], unknown[]> {
  const nodeComponents: { [nodeId: string]: Component<unknown[], unknown[]> } = {};

  graph.nodes.forEach((nodeImpl, nodeId) => {
    nodeComponents[nodeId] =
      "componentId" in nodeImpl ?
        new componentStore.components[nodeImpl.componentId].impl() :
        toComponent(graph.getSubgraph(nodeImpl.subgraphId), componentStore, logger, nodeId);

    nodeComponents[nodeId].whenTerminated()
      .then(logger.nodeSubscriber(nodeId, graphName));
  });

  graph.edges.forEach(({ from, to }) => {
    const fromComp = nodeComponents[from.nodeId];
    const toComp = nodeComponents[to.nodeId];
    Builder
      .from(fromComp.publisherFor(fromComp.spec.outs.indexOf(from.portName)))
      .tap(...logger.edgeSubscriber(from, to, graphName))
      .to(toComp.subscriberFor(toComp.spec.ins.indexOf(to.portName)));
  });

  graph.initials.forEach((value, port) => {
    const toComp = nodeComponents[port.nodeId];
    Builder
      .fromSingle(value).async()
      .tap(...logger.edgeInitialSubscriber(value, port, graphName))
      .to(toComp.subscriberFor(toComp.spec.ins.indexOf(port.portName)));
  });

  // function printStatus() {
  //   console.log(graphName);
  //   console.log(Object.entries(nodeComponents).map(([key, comp]) => [key, comp.whenTerminated()]));
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

    whenTerminated(): Promise<unknown> {
      return Promise.all(
        Object.entries(nodeComponents).map(([_, comp]) => comp.whenTerminated())
      );
    }
  };
}

function runGraph(
  graph: Graph,
  componentStore: ComponentStore<ComponentClass>
): Component<unknown[], unknown[]> {

  const logger = new Logger("out/packets.log");
  const comp = toComponent(graph, componentStore, logger);
  comp.start();
  return comp;
}

export default { runGraph };
