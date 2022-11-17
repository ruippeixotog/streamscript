import React from "react";
import { useAppSelector } from "./hooks";
import { WSEvent } from "../types";
import repr from "../../viz/repr";

function eventToText(ev: WSEvent): string {
  switch (ev.type) {
    case "node": {
      return `${repr.formatNode(ev.node, ev.graphName)} ${ev.event.toUpperCase()}`;
    }
    case "edge": {
      const eventRepr =
        ev.event === "next" ? `DATA ${JSON.stringify(ev.value)}` :
          ev.event === "request" ? `REQUEST ${ev.value}` :
            ev.event.toUpperCase();

      return `${repr.formatEdge(ev.from, ev.to, ev.graphName)} ${eventRepr}`;
    }
  }
}

export default function EventText(): JSX.Element {
  const visibleHistory = useAppSelector(state => state.visibleHistory);
  const visibleEventIdx = useAppSelector(state => state.visibleEventIdx);

  let content = `(${visibleEventIdx + 1}/${visibleHistory.length + 1}) `;
  content += visibleEventIdx === 0 ?
    "initial state" :
    eventToText(visibleHistory[visibleEventIdx - 1]);

  return (
    <div className="eventcontainer">
      <span id="event">{content}</span>
    </div>
  );
}
