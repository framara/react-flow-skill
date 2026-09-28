import { createContext, memo, useCallback, useContext, useRef, useState, type FormEvent } from 'react';
import {
  ReactFlow, Background, Handle, Position, addEdge,
  useNodesState, useEdgesState,
  type Connection, type Edge, type Node, type NodeProps,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import './App.css';

type StepNode = Node<{ label: string }, 'step'>;
const initialNodes: StepNode[] = [
  { id: 'source', type: 'step', position: { x: 100, y: 180 }, data: { label: 'Source' }, ariaLabel: 'Source' },
  { id: 'result', type: 'step', position: { x: 500, y: 180 }, data: { label: 'Result' }, ariaLabel: 'Result' },
];
const RenameContext = createContext<(id: string, label: string) => void>(() => {});

const Step = memo(function Step({ id, data, isConnectable }: NodeProps<StepNode>) {
  const rename = useContext(RenameContext);
  return (
    <div className="workflow-step">
      <Handle type="target" position={Position.Left} isConnectable={isConnectable} />
      <strong>{data.label || 'Untitled step'}</strong>
      {id === 'source' && (
        <label className="step-field" htmlFor="source-label">Source label
          <input id="source-label" className="nodrag nopan" value={data.label}
            onChange={(event) => rename(id, event.target.value)}
            onKeyDown={(event) => event.stopPropagation()} />
        </label>
      )}
      <Handle type="source" position={Position.Right} isConnectable={isConnectable} />
    </div>
  );
});
const nodeTypes = { step: Step };

export default function App() {
  const [nodes, setNodes, onNodesChange] = useNodesState<StepNode>(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [from, setFrom] = useState('source');
  const [to, setTo] = useState('result');
  const [status, setStatus] = useState({ text: 'Choose two steps to connect.', revision: 0 });
  const fromSelect = useRef<HTMLSelectElement>(null);
  const announce = useCallback((text: string) => {
    setStatus((previous) => ({ text, revision: previous.revision + 1 }));
  }, []);
  const rename = useCallback((id: string, label: string) => {
    setNodes((current) => current.map((node) => node.id === id
      ? { ...node, data: { ...node.data, label }, ariaLabel: label || 'Untitled step' }
      : node));
  }, [setNodes]);

  const validationMessage = useCallback((connection: Pick<Connection, 'source' | 'target'>) => {
    if (!nodes.some((node) => node.id === connection.source) || !nodes.some((node) => node.id === connection.target)) {
      return 'Choose two available steps.';
    }
    if (connection.source === connection.target) return 'A step cannot connect to itself. Choose different steps.';
    if (edges.some((edge) => edge.source === connection.source && edge.target === connection.target)) {
      return 'These steps are already connected.';
    }
    return null;
  }, [nodes, edges]);

  const connect = useCallback((connection: Connection) => {
    const error = validationMessage(connection);
    if (error) { announce(error); return; }
    const sourceLabel = nodes.find((node) => node.id === connection.source)?.data.label || 'Untitled step';
    const targetLabel = nodes.find((node) => node.id === connection.target)?.data.label || 'Untitled step';
    setEdges((current) => addEdge({ ...connection, ariaLabel: `${sourceLabel} to ${targetLabel}` }, current));
    announce(`Connected ${sourceLabel} to ${targetLabel}.`);
  }, [validationMessage, nodes, setEdges, announce]);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    connect({ source: from, target: to, sourceHandle: null, targetHandle: null });
  }

  return (
    <main className="workflow-editor">
      <h1>Workflow editor</h1>
      <p id="keyboard-help">Tab to a step, press Enter to select it, then use arrow keys to move. Delete or Backspace removes selected steps and connections.</p>
      <form className="connection-form" onSubmit={submit} aria-label="Connect workflow steps">
        <label htmlFor="from-step">From
          <select id="from-step" ref={fromSelect} value={nodes.some((node) => node.id === from) ? from : ''} onChange={(event) => setFrom(event.target.value)}>
            <option value="">Choose a step</option>
            {nodes.map((node) => <option key={node.id} value={node.id}>{node.data.label || 'Untitled step'}</option>)}
          </select>
        </label>
        <label htmlFor="to-step">To
          <select id="to-step" value={nodes.some((node) => node.id === to) ? to : ''} onChange={(event) => setTo(event.target.value)}>
            <option value="">Choose a step</option>
            {nodes.map((node) => <option key={node.id} value={node.id}>{node.data.label || 'Untitled step'}</option>)}
          </select>
        </label>
        <button type="submit">Connect steps</button>
      </form>
      <p className="connection-status" role="status" aria-live="polite" aria-atomic="true"><span key={status.revision}>{status.text}</span></p>
      <div className="flow-canvas" aria-label="Workflow canvas" aria-describedby="keyboard-help">
        <RenameContext.Provider value={rename}>
          <ReactFlow<StepNode, Edge> nodes={nodes} edges={edges} nodeTypes={nodeTypes}
            onNodesChange={onNodesChange} onEdgesChange={onEdgesChange}
            onConnect={connect} isValidConnection={(connection) => validationMessage(connection) === null}
            deleteKeyCode={['Backspace', 'Delete']} nodesFocusable edgesFocusable
            onDelete={() => {
              announce('Selection deleted.');
              requestAnimationFrame(() => fromSelect.current?.focus());
            }}>
            <Background />
          </ReactFlow>
        </RenameContext.Provider>
      </div>
    </main>
  );
}
