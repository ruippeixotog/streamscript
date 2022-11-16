import type { InPortRef, OutPortRef } from "../compiler/graph";
import { GraphJSON } from "../compiler/graph";

export const NODE_TYPES = ["terminated"] as const;
export const EDGE_TYPES = ["next", "errored", "completed", "request", "cancel"] as const;

export type WSEventNodeType = typeof NODE_TYPES[number];
export type WSEventEdgeType = typeof EDGE_TYPES[number];

export type WSEvent =
  { type: "node", graphName?: string, node: string, event: WSEventNodeType } |
  { type: "edge", graphName?: string, from: OutPortRef, to: InPortRef, event: WSEventEdgeType, value?: unknown };

export type WSServerMessage =
  { type: "graph", graph: GraphJSON } |
  { type: "history", events: WSEvent[] } |
  { type: "event", event: WSEvent };
