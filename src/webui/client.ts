import * as d3 from "d3";
import { graphviz } from "d3-graphviz";
import Graph from "../compiler/graph";
import { WSServerMessage, WSEvent, WSEventNodeType, WSEventEdgeType } from "./types";
import dot from "../viz/dot";
import edgeRepr from "../viz/edge_repr";

// ------
// Server state
// ------

let graph: Graph;
let history: WSEvent[] = [];

// ------
// Client state
// ------

const openedSubgraphs = new Set<string>();
let currentEventIdx = 0;

// ------
// UI elements
// ------

const historySlider = document.querySelector("#history") as HTMLInputElement;
const eventText = document.querySelector("#event") as HTMLSpanElement;

// ------
// Graph UI
// ------

const d3Graph = graphviz("#main")
  // .transition(() =>
  //   d3.transition()
  //     .duration(2000)
  //     .ease(d3.easeQuad)
  // )
  .attributer(function (datum) {
    switch (datum.attributes.class) {
      case "cluster": {
        // (this as Element).addEventListener("click", () => {
        //   openedSubgraphs.delete((datum.key as string).replace("cluster_", ""));
        //   updateGraph();
        // });
        break;
      }
      case "node": {
        // if (datum.key.startsWith("Function")) {
        //   (this as Element).addEventListener("click", () => {
        //     openedSubgraphs.add(datum.key);
        //     updateGraph();
        //   });
        // }
        break;
      }
    }
  })
  .on("renderEnd", () => {
    d3.select("svg")
      .attr("width", null)
      .attr("height", null);
  })
  .onerror(console.error);

function updateGraph(): void {
  const dotStr = dot.toDOT(graph, {
    includeSubgraphs: [...openedSubgraphs],
    renderEmptyEdgeLabels: true
  });
  d3Graph.renderDot(dotStr);
}

// ------
// Events slider
// ------

const nodeStateEvents = new Set<WSEventNodeType>(["terminated"]);
const edgeStateEvents = new Set<WSEventEdgeType>(["completed", "errored"]);

function drawEvent(ev: WSEvent, doCommit: boolean, isForward: boolean): void {
  switch (ev.type) {
    case "node": {
      if (nodeStateEvents.has(ev.event) === doCommit) {
        d3.select(`[id="${ev.node}"]`).classed(ev.event, isForward);
      }
      break;
    }
    case "edge": {
      const edge = edgeRepr.formatEdge(ev.from, ev.to);
      if (edgeStateEvents.has(ev.event) === doCommit) {
        d3.select(`[id="${edge}"]`).classed(ev.event, isForward);
        switch (ev.event) {
          case "next":
          // case "request":
            d3.select(`[id="${edge}"] > text`)
              .text(isForward ? JSON.stringify(ev.value) : null);
            break;
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

historySlider.oninput = () => {
  const newEventIdx = parseInt(historySlider.value) - 1;
  for (let i = currentEventIdx + 1; i <= newEventIdx; i++) {
    if (i > 1) deactivateEvent(history[i - 2]);
    commitEvent(history[i - 1]);
    activateEvent(history[i - 1]);
  }
  for (let i = currentEventIdx; i > newEventIdx; i--) {
    deactivateEvent(history[i - 1]);
    revertEvent(history[i - 1]);
    if (i > 1) activateEvent(history[i - 2]);
  }
  currentEventIdx = newEventIdx;
  updateSliderAndEvent();
};

function updateSliderAndEvent(): void {
  function eventToText(ev: WSEvent): string {
    const graphRepr = ev.graphName ? `<<${ev.graphName}>> ` : "";
    switch (ev.type) {
      case "node": {
        return `${graphRepr} ${ev.node} ${ev.event.toUpperCase()}`;
      }
      case "edge": {
        const eventRepr =
          ev.event === "next" ? `DATA ${JSON.stringify(ev.value)}` :
            ev.event === "request" ? `REQUEST ${ev.value}` :
              ev.event.toUpperCase();

        return `${graphRepr} ${edgeRepr.formatEdge(ev.from, ev.to)} ${eventRepr}`;
      }
    }
  }

  historySlider.setAttribute("max", (history.length + 1).toString());
  eventText.textContent = currentEventIdx === 0 ?
    "initial state" :
    eventToText(history[currentEventIdx - 1]);
}

// ------
// WebSocket connection
// ------

const ws = new WebSocket(`ws://${window.location.hostname}:${window.location.port}/api/listen`);

ws.onopen = () => console.log("Connected to server");
ws.onclose = () => console.log("Connection lost");
ws.onerror = () => console.log("Connection error");
ws.onmessage = ev => {
  const msg: WSServerMessage = JSON.parse(ev.data);
  switch (msg.type) {
    case "graph":
      console.log("Graph received", msg.graph);
      graph = Graph.fromJSON(msg.graph);
      updateGraph();
      break;
    case "history":
      console.log("History received", msg.events);
      history = msg.events;
      updateSliderAndEvent();
      break;
    case "event":
      console.log("New event received", msg.event);
      history.push(msg.event);
      updateSliderAndEvent();
  }
};
