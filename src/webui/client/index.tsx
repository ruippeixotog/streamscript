import React from "react";
import ReactDOM from "react-dom/client";
import store, { wsEvent, wsGraph, wsHistory } from "./store";
import { Provider } from "react-redux";
import { WSServerMessage } from "../types";
import Graph from "../../compiler/graph";
import GraphView from "./GraphView";
import Slider from "./Slider";
import EventText from "./EventText";

const root = ReactDOM.createRoot(document.getElementById("root") as Element);

root.render(
  <Provider store={store}>
    <GraphView />
    <Slider />
    <EventText />
  </Provider>
);

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
      store.dispatch(wsGraph(Graph.fromJSON(msg.graph)));
      break;
    case "history":
      console.log("History received", msg.events);
      store.dispatch(wsHistory(msg.events));
      break;
    case "event":
      console.log("New event received", msg.event);
      store.dispatch(wsEvent(msg.event));
  }
};
