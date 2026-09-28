import { memo, useCallback, useState } from 'react';
import {
  ReactFlow, Handle, Position, addEdge, useEdgesState, useNodesState,
  useNodesData, useReactFlow, type Node, type NodeProps, type Edge, type OnConnect,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

type ValueNode = Node<{ value: number }, 'value'>;
type ResultNodeType = Node<Record<string, never>, 'result'>;
type AppNode = ValueNode | ResultNodeType;
const initialNodes: AppNode[] = [
  { id: 'source', type: 'value', position: { x: 100, y: 180 }, data: { value: 2 } },
  { id: 'result', type: 'result', position: { x: 500, y: 180 }, data: {} },
];
const initialEdges: Edge[] = [{ id: 'source-result', source: 'source', target: 'result' }];

const SourceNode = memo(function SourceNode({ id, data }: NodeProps<ValueNode>) {
  const [value, setValue] = useState(String(data.value));
  const { updateNodeData } = useReactFlow<AppNode, Edge>();

  return <div style={{ padding: 16, background: 'white', border: '1px solid #555' }}>
    <label>Value <input type="number" className="nodrag nopan" value={value}
      onKeyDown={(event) => event.stopPropagation()}
      onChange={(event) => {
        const nextValue = event.target.value;
        setValue(nextValue);
        updateNodeData(id, { value: Number(nextValue) });
      }} /></label>
    <Handle type="source" position={Position.Right} />
  </div>;
});
const ResultNode = memo(function ResultNode() {
  const source = useNodesData<ValueNode>('source');
  return <div style={{ padding: 16, background: 'white', border: '1px solid #555' }}>
    <Handle type="target" position={Position.Left} />
    <output aria-label="Result">{2 * (source?.data.value ?? 0)}</output>
  </div>;
});
const nodeTypes = { value: SourceNode, result: ResultNode };
export default function App() {
  const [nodes, , onNodesChange] = useNodesState<AppNode>(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>(initialEdges);
  const onConnect = useCallback<OnConnect>((connection) => {
    setEdges((currentEdges) => addEdge(connection, currentEdges));
  }, [setEdges]);

  return <div style={{ width: '100%', height: 600 }}>
    <ReactFlow<AppNode, Edge> nodes={nodes} edges={edges} nodeTypes={nodeTypes}
      onNodesChange={onNodesChange} onEdgesChange={onEdgesChange} onConnect={onConnect} />
  </div>;
}
