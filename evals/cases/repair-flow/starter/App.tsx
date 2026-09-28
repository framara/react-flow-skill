import { useState } from 'react';
import { ReactFlow, Handle, Position, useNodesData, type Node, type NodeProps, type Edge } from '@xyflow/react';

type ValueNode = Node<{ value: number }, 'value'>;
type ResultNodeType = Node<Record<string, never>, 'result'>;
type AppNode = ValueNode | ResultNodeType;
const initialNodes: AppNode[] = [
  { id: 'source', type: 'value', position: { x: 100, y: 180 }, data: { value: 2 } },
  { id: 'result', type: 'result', position: { x: 500, y: 180 }, data: {} },
];
const initialEdges: Edge[] = [{ id: 'source-result', source: 'source', target: 'result' }];

function SourceNode({ data }: NodeProps<ValueNode>) {
  return <div style={{ padding: 16, background: 'white', border: '1px solid #555' }}>
    <label>Value <input type="number" value={data.value}
      onChange={(event) => { data.value = Number(event.target.value); }} /></label>
  </div>;
}
function ResultNode() {
  const source = useNodesData<ValueNode>('source');
  return <div style={{ padding: 16, background: 'white', border: '1px solid #555' }}>
    <Handle type="target" position={Position.Left} />
    <output aria-label="Result">{2 * (source?.data.value ?? 0)}</output>
  </div>;
}
const nodeTypes = { value: SourceNode, result: ResultNode };
export default function App() {
  const [nodes] = useState(initialNodes);
  const [edges] = useState(initialEdges);
  return <div style={{ width: '100%', height: 600 }}>
    <ReactFlow nodes={nodes} edges={edges} nodeTypes={nodeTypes} />
  </div>;
}
