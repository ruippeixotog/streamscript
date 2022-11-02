import type { InPortRef, OutPortRef } from "../compiler/graph";
import { GraphJSON } from "../compiler/graph";

export type WSEventNodeType = "terminate";
export type WSEventEdgeType = "next" | "error" | "complete" | "request" | "cancel";

export type WSEvent =
  { type: "node", graphName?: string, node: string, event: WSEventNodeType } |
  { type: "edge", graphName?: string, from: OutPortRef, to: InPortRef, event: WSEventEdgeType, value?: unknown };

export type WSServerMessage =
  { type: "graph", graph: GraphJSON } |
  { type: "history", events: WSEvent[] } |
  { type: "event", event: WSEvent };
