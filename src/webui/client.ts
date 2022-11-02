import * as d3 from "d3";
import { graphviz } from "d3-graphviz";
import Graph from "../compiler/graph";
import { WSServerMessage, WSEvent } from "./types";
import dot from "../viz/dot";

// ------
// Server state
// ------

let graph: Graph;
let history: WSEvent[] = [];

// ------
// Client state
// ------

const openedSubgraphs = new Set<string>();
const nodeIndex = {};
const edgeIndex = {};
let currentEventIdx = 0;

// ------
// UI elements
// ------

const historySlider = document.querySelector("#history") as HTMLInputElement;
const eventText = document.querySelector("#event") as HTMLSpanElement;

// ------
// UI setup
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
        (this as Element).addEventListener("click", () => {
          openedSubgraphs.delete((datum.key as string).replace("cluster_", ""));
          updateGraph();
        });
        break;
      }
      case "node": {
        nodeIndex[datum.key] = datum;
        if (datum.key.startsWith("Function")) {
          (this as Element).addEventListener("click", () => {
            openedSubgraphs.add(datum.key);
            updateGraph();
          });
        }
        break;
      }
      case "edge": {
        const [from, to] = datum.key.split("->");
        edgeIndex[from] ||= {};
        edgeIndex[from][to] = datum;
      }
    }
  })
  .on("renderEnd", () => {
    d3.select("svg")
      .attr("width", null)
      .attr("height", null);
  })
  .onerror(console.error);

function updateSliderAndEvent(): void {
  historySlider.setAttribute("max", history.length.toString());
  eventText.innerHTML = JSON.stringify(history[currentEventIdx]);
}

function updateGraph(): void {
  const dotStr = dot.toDOT(graph, [...openedSubgraphs]);
  d3Graph.renderDot(dotStr);
}

historySlider.oninput = () => {
  currentEventIdx = parseInt(historySlider.value) - 1;
  updateSliderAndEvent();
};

// ------
// WebSocket connection setup
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
