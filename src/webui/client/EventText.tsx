import React from "react";
import { useAppSelector } from "./hooks";
import { WSEvent } from "../types";
import edgeRepr from "../../viz/edge_repr";

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

export default function EventText(): JSX.Element {
  const visibleHistory = useAppSelector(state => state.visibleHistory);
  const currentEventIdx = useAppSelector(state => state.currentEventIdx);

  let content = `(${currentEventIdx + 1}/${visibleHistory.length + 1}) `;
  content += currentEventIdx === 0 ?
    "initial state" :
    eventToText(visibleHistory[currentEventIdx - 1]);

  return (
    <div className="eventcontainer">
      <span id="event">{content}</span>
    </div>
  );
}
