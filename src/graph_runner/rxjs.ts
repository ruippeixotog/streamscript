import Graph, { InPort, OutPort } from "../graph";
import { ComponentStore } from "../types";
import { Component } from "../component";
import { asyncScheduler, merge, Observable, scheduled, Subject, Subscription } from "rxjs";
import { tap } from "rxjs/operators";
import Logger from "./rxjs/Logger";
import DeepMap from "../util/DeepMap";

function toComponent(graph: Graph, logger: Logger, graphName?: string): Component {
  return {
    spec: {
      ins: graph.externalIns.map(p => p.portName),
      outs: graph.externalOuts.map(p => p.portName),
    },
    connect: (...externalIns) => {
      let componentStore: ComponentStore<Component> = graph.componentStore;

      let activateFuncs: (() => Subscription | null)[] = [];
      let inObservables = new DeepMap<InPort, Observable<any>[]>();
      let outSubjects = new DeepMap<OutPort, Subject<any>>();

      function inObservablesFor(port: InPort): Observable<any>[] {
        return inObservables.getOrElseSet(port, () => []);
      }

      function outSubjectFor(port: InPort): Subject<any> {
        return outSubjects.getOrElseSet(port, () => {
          const subj = new Subject<any>();
          subj.subscribe(logger.portSubscriber(port, graphName));
          return subj;
        });
      }

      graph.edges.forEach(([from, to]) =>
        inObservablesFor(to).push(
          outSubjectFor(from).pipe(tap(logger.edgeSubscriber(from, to, graphName)))
        )
      );

      graph.initials.forEach((value, port) => {
        const subj = new Subject();
        inObservablesFor(port).push(subj);
        activateFuncs.push(() => scheduled([value], asyncScheduler).subscribe(subj));
      });

      graph.externalIns.forEach((p, i) =>
        inObservablesFor(p.innerPort).push(externalIns[i])
      );

      graph.nodes.forEach((nodeImpl, nodeId) => {
        const component =
          "componentId" in nodeImpl ?
            componentStore.components[nodeImpl.componentId].impl :
            toComponent(graph.getSubgraph(nodeImpl.subgraphId), logger, nodeId);

        const ins = component.spec.ins.map(portName => {
          return merge(...inObservablesFor({ nodeId, portName }))
            .pipe(tap(logger.portSubscriber({ nodeId, portName }, graphName)));
        });

        const { outs, activate } = component.connect(...ins);
        activateFuncs.push(activate);

        component.spec.outs.forEach((portName, i) =>
          outs[i].subscribe(outSubjectFor({ nodeId, portName }))
        );
      });

      const externalOuts = graph.externalOuts.map(p =>
        outSubjectFor(p.innerPort)
      );

      const activate = () => {
        const aggSub = new Subscription();
        activateFuncs.forEach(f => {
          const sub = f();
          if (sub) {
            aggSub.add(sub);
          }
        });
        return aggSub;
      };

      return {
        outs: externalOuts,
        activate
      };
    }
  };
}

async function runGraph(graph: Graph): Promise<any> {
  const logger = new Logger("out/packets");
  toComponent(graph, logger).connect().activate();
}

export default { runGraph };
