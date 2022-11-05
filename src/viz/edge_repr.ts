import { InPortRef, OutPortRef } from "../compiler/graph";

const formatEdge = (from: OutPortRef, to: InPortRef): string =>
  `${from.nodeId}[${from.portName}] -> ${to.nodeId}[${to.portName}]`;

const parseEdge = (repr: string): { from: OutPortRef, to: InPortRef } => {
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  const [, fromId, fromPort, toId, toPort] = repr.match(/^(.+)\[(.+)\] -> (.+)\[(.+)\]$/)!;
  return {
    from: { nodeId: fromId, portName: fromPort },
    to: { nodeId: toId, portName: toPort }
  };
};

const formatInitialEdge = (data: unknown, to: InPortRef): string =>
  `CONST(${JSON.stringify(data)}) -> ${to.nodeId}[${to.portName}]`;

const parseInitialEdge = (repr: string): { data: unknown, to: InPortRef } => {
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  const [, dataJSON, toId, toPort] = repr.match(/^CONST\((.+)\) -> (.+)\[(.+)\]$/)!;
  return {
    data: JSON.parse(dataJSON),
    to: { nodeId: toId, portName: toPort }
  };
};

export default { formatEdge, parseEdge, formatInitialEdge, parseInitialEdge };
