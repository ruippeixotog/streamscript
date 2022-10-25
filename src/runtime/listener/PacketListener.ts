import { InPortRef, OutPortRef } from "../../compiler/graph";
import { Subscriber, Subscription } from "../types";

export type NodeListener = {
  onTerminate(): void
}

export type EdgeListener = {
  downstream: Subscriber<unknown>,
  upstream: Subscription
}

interface PacketListener {
  nodeListenerFor(nodeId: string, graphName?: string): NodeListener;
  edgeListenerFor(from: OutPortRef, to: InPortRef, graphName?: string): EdgeListener;
}

export default PacketListener;
