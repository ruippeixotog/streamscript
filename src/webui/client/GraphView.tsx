import React, { useEffect, useRef, useState } from "react";
import { closeSubgraph, openSubgraph } from "./store";
import { useAppDispatch, useAppSelector } from "./hooks";
import { graphviz } from "d3-graphviz";
import * as d3 from "d3";
import dot from "../../viz/dot";
import repr from "../../viz/repr";
import { WSEvent, WSEventEdgeType, WSEventNodeType } from "../types";

const nodeStateEvents = new Set<WSEventNodeType>(["terminated"]);
const edgeStateEvents = new Set<WSEventEdgeType>(["completed", "errored"]);

function drawEvent(ev: WSEvent, doCommit: boolean, isForward: boolean): void {
  switch (ev.type) {
    case "node": {
      if (nodeStateEvents.has(ev.event) === doCommit) {
        const nodeVizId = repr.formatNode(ev.node, ev.graphName);
        d3.select(`[id="${nodeVizId}"]`).classed(ev.event, isForward);
      }
      break;
    }
    case "edge": {
      if (edgeStateEvents.has(ev.event) === doCommit) {
        const edgeVizId = repr.formatEdge(ev.from, ev.to, ev.graphName);
        d3.select(`[id="${edgeVizId}"]`).classed(ev.event, isForward);
        switch (ev.event) {
          case "next": {
          // case "request":
            const edgeText = document.querySelector(`[id="${edgeVizId}"] > text`);
            if (edgeText !== null) {
              edgeText.childNodes[0].textContent = isForward ? JSON.stringify(ev.value) : null;
            }
            break;
          }
        }
      }
      break;
    }
  }
}

const commitEvent = (ev: WSEvent): void => drawEvent(ev, true, true);
const revertEvent = (ev: WSEvent): void => drawEvent(ev, true, false);
const activateEvent = (ev: WSEvent): void => drawEvent(ev, false, true);
const deactivateEvent = (ev: WSEvent): void => drawEvent(ev, false, false);

export default function GraphView(): JSX.Element {
  const [renderingState, setRenderingState] = useState<"idle" | "rendering" | "rendered">("idle");

  const graph = useAppSelector(state => state.graph);
  const openedSubgraphs = useAppSelector(state => state.openedSubgraphs);
  const serverHistory = useAppSelector(state => state.serverHistory);
  const currentEventIdx = useAppSelector(state => state.currentEventIdx);
  const dispatch = useAppDispatch();

  const prevCurrIndexRef = useRef(0);
  let triggeredRender = false;

  useEffect(() => {
    if (!graph) return;

    // if (currentEventIdx > 0) {
    //   deactivateEvent(visibleHistory[currentEventIdx - 1]);
    // }

    const dotStr = dot.toDOT(graph, {
      includeSubgraphs: [...openedSubgraphs],
      renderEmptyEdgeLabels: true
    });

    graphviz("#main")
      // .transition(() =>
      //   d3.transition()
      //     .duration(2000)
      //     .ease(d3.easeQuad)
      // )
      .fit(true)
      .attributer(function (datum) {
        switch (datum.attributes.class) {
          case "cluster": {
            (this as Element).addEventListener("click", () => {
              dispatch(closeSubgraph((datum.key as string).replace("cluster_", "")));
            });
            break;
          }
          case "node": {
            if (datum.key.startsWith("Function")) {
              (this as Element).addEventListener("click", () => {
                dispatch(openSubgraph(datum.key));
              });
            }
            break;
          }
        }
      })
      .on("renderEnd", () => setRenderingState("rendered"))
      .onerror(console.error)
      .renderDot(dotStr);

    setRenderingState("rendering");
    triggeredRender = true;
  }, [graph, openedSubgraphs]);

  useEffect(() => {
    if (renderingState !== "rendered") return;

    for (let i = 0; i < currentEventIdx; i++) {
      commitEvent(serverHistory[i]);
    }
    if (currentEventIdx > 0) {
      activateEvent(serverHistory[currentEventIdx - 1]);
    }
    prevCurrIndexRef.current = currentEventIdx;
    setRenderingState("idle");
  }, [renderingState]);

  useEffect(() => {
    if (renderingState !== "idle" || triggeredRender) return;

    if (prevCurrIndexRef.current) {
      deactivateEvent(serverHistory[prevCurrIndexRef.current - 1]);
    }
    for (let i = (prevCurrIndexRef.current || 0) + 1; i <= currentEventIdx; i++) {
      commitEvent(serverHistory[i - 1]);
    }
    for (let i = (prevCurrIndexRef.current || 0); i > currentEventIdx; i--) {
      revertEvent(serverHistory[i - 1]);
    }
    if (currentEventIdx > 0) {
      activateEvent(serverHistory[currentEventIdx - 1]);
    }

    // for (let i = (prevCurrIndexRef.current || 0) + 1; i <= currentEventIdx; i++) {
    //   if (i > 1) deactivateEvent(serverHistory[i - 2]);
    //   commitEvent(serverHistory[i - 1]);
    //   activateEvent(serverHistory[i - 1]);
    // }
    // for (let i = (prevCurrIndexRef.current || 0); i > currentEventIdx; i--) {
    //   deactivateEvent(serverHistory[i - 1]);
    //   revertEvent(serverHistory[i - 1]);
    //   if (i > 1) activateEvent(serverHistory[i - 2]);
    // }
    prevCurrIndexRef.current = currentEventIdx;
  }, [currentEventIdx]);

  return <div id="main" />;
}
