import { InPortRef, OutPortRef } from "../compiler/graph";

const formatNode = (nodeId: string, graphName?: string): string =>
  `${graphName ? `<<${graphName}>> ` : ""}${nodeId}`;

const formatEdge = (from: OutPortRef, to: InPortRef, graphName?: string): string =>
  `${graphName ? `<<${graphName}>> ` : ""}${from.nodeId}[${from.portName}] -> ${to.nodeId}[${to.portName}]`;

const formatInitialEdge = (data: unknown, to: InPortRef): string =>
  `CONST(${JSON.stringify(data)}) -> ${to.nodeId}[${to.portName}]`;

export default { formatNode, formatEdge, formatInitialEdge };
