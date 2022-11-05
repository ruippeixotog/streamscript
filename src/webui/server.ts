import Graph from "../compiler/graph";
import PacketListener from "../runtime/listener/PacketListener";
import type { WSServerMessage, WSEvent } from "./types";
import express, { Request, Express } from "express";
import expressWs from "./express_ws";
import { AddressInfo } from "net";
import { WebSocket } from "ws";

type WSHandler = (ws: WebSocket, req: Request) => void;
type WSExpress = Express & {
  ws: (path: string, handler: WSHandler) => void
}

function sendMessage(ws: WebSocket, msg: WSServerMessage): void {
  ws.send(JSON.stringify(msg));
}

async function serveWs(graph: Graph, port: number): Promise<PacketListener> {

  let wss: WebSocket[] = [];
  const events: WSEvent[] = [];

  const app: WSExpress = expressWs(express());

  app.ws("/api/listen", (ws: WebSocket, _req: Request) => {
    wss.push(ws);
    sendMessage(ws, { type: "graph", graph: graph.toJSON() });
    sendMessage(ws, { type: "history", events });

    ws.on("close", () => {
      wss = wss.filter(w => w !== ws);
    });
  });

  app.use(express.static("dist"));

  const server = app.listen(port, () => {
    console.log("Debugging server listening on port %s", (server.address() as AddressInfo).port);
  });

  function handleEvent(ev: WSEvent): void {
    wss.forEach(ws => sendMessage(ws, { type: "event", event: ev }));
    events.push(ev);
  }

  return {
    nodeListenerFor: (node, graphName) => ({
      onTerminate: () => handleEvent({ type: "node", graphName, node, event: "terminated" })
    }),
    edgeListenerFor: (from, to, graphName) => ({
      downstream: {
        onSubscribe: () => {},
        onNext: value => handleEvent({ type: "edge", graphName, from, to, event: "next", value }),
        onError: () => handleEvent({ type: "edge", graphName, from, to, event: "errored" }),
        onComplete: () => handleEvent({ type: "edge", graphName, from, to, event: "completed" })
      },
      upstream: {
        request: n => handleEvent({ type: "edge", graphName, from, to, event: "request", value: n }),
        cancel: () => handleEvent({ type: "edge", graphName, from, to, event: "cancel" })
      }
    })
  };
}

export default { serveWs };
