# Common Recipes

## When to use this reference

Use this file for quick implementation patterns for frequently requested React Flow features: adding nodes via UI interactions, drag-and-drop from a sidebar, context menus, detail panels, and exporting flows as images.

## Contents

- [Add nodes via context menu](#add-nodes-via-context-menu)
- [Drag-and-drop from sidebar](#drag-and-drop-from-sidebar)
- [Show node details in a sidebar panel](#show-node-details-in-a-sidebar-panel)
- [Delete selected nodes and edges with a button](#delete-selected-nodes-and-edges-with-a-button)
- [Export flow as image](#export-flow-as-image)
- [Fit view after adding nodes](#fit-view-after-adding-nodes)

## Add nodes via context menu

Right-click on the canvas pane to add a new node at the cursor position. Use `screenToFlowPosition` to convert screen coordinates to flow coordinates:

```tsx
import { useCallback, useState, useRef } from 'react';
import { ReactFlow, useReactFlow, Panel, type Node, type Edge } from '@xyflow/react';

let id = 0;
const getId = () => `node_${id++}`;

function Flow() {
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const { screenToFlowPosition } = useReactFlow();
  const [menu, setMenu] = useState<{ x: number; y: number } | null>(null);

  const onPaneContextMenu = useCallback((event: React.MouseEvent) => {
    event.preventDefault();
    setMenu({ x: event.clientX, y: event.clientY });
  }, []);

  const addNode = useCallback(
    (type: string) => {
      if (!menu) return;
      const position = screenToFlowPosition({ x: menu.x, y: menu.y });
      setNodes((nds) => [
        ...nds,
        { id: getId(), type, position, data: { label: `${type} node` } },
      ]);
      setMenu(null);
    },
    [menu, screenToFlowPosition, setNodes],
  );

  return (
    <>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onPaneContextMenu={onPaneContextMenu}
        onPaneClick={() => setMenu(null)}
        fitView
      />
      {menu && (
        <div
          style={{
            position: 'absolute',
            top: menu.y,
            left: menu.x,
            background: 'white',
            border: '1px solid #ccc',
            borderRadius: 4,
            padding: 8,
            zIndex: 1000,
          }}
        >
          <button onClick={() => addNode('default')}>Default Node</button>
          <button onClick={() => addNode('input')}>Input Node</button>
          <button onClick={() => addNode('output')}>Output Node</button>
        </div>
      )}
    </>
  );
}
```

**Note**: Wrap the component in `<ReactFlowProvider>` since it uses `useReactFlow`.

## Drag-and-drop from sidebar

Use the HTML Drag and Drop API to drag items from a sidebar onto the canvas. The key is converting the drop coordinates with `screenToFlowPosition`:

```tsx
import { useCallback } from 'react';
import { ReactFlow, useReactFlow, type Node } from '@xyflow/react';

let id = 0;
const getId = () => `dnd_${id++}`;

// Sidebar component
function Sidebar() {
  const onDragStart = (event: React.DragEvent, nodeType: string) => {
    event.dataTransfer.setData('application/reactflow', nodeType);
    event.dataTransfer.effectAllowed = 'move';
  };

  return (
    <aside style={{ padding: 10 }}>
      <div
        draggable
        onDragStart={(e) => onDragStart(e, 'default')}
        style={{ padding: 8, border: '1px solid #ccc', marginBottom: 8, cursor: 'grab' }}
      >
        Default Node
      </div>
      <div
        draggable
        onDragStart={(e) => onDragStart(e, 'input')}
        style={{ padding: 8, border: '1px solid #ccc', cursor: 'grab' }}
      >
        Input Node
      </div>
    </aside>
  );
}

// Flow component
function Flow() {
  const { screenToFlowPosition, addNodes } = useReactFlow();

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      const type = event.dataTransfer.getData('application/reactflow');
      if (!type) return;

      const position = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      addNodes({
        id: getId(),
        type,
        position,
        data: { label: `${type} node` },
      });
    },
    [screenToFlowPosition, addNodes],
  );

  return (
    <ReactFlow
      onDragOver={onDragOver}
      onDrop={onDrop}
      fitView
    />
  );
}
```

Use `application/reactflow` as the MIME type to avoid interfering with native drag-and-drop.

## Show node details in a sidebar panel

Display a detail panel when a node is selected. Use the `onNodeClick` callback or filter `nodes` for `selected`:

```tsx
import { useState, useCallback } from 'react';
import { ReactFlow, Panel, useReactFlow, type Node } from '@xyflow/react';

function Flow() {
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const { updateNodeData } = useReactFlow();

  const onNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    setSelectedNode(node);
  }, []);

  const onPaneClick = useCallback(() => {
    setSelectedNode(null);
  }, []);

  return (
    <div style={{ display: 'flex', height: '100vh' }}>
      <div style={{ flex: 1 }}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodeClick={onNodeClick}
          onPaneClick={onPaneClick}
          fitView
        />
      </div>
      {selectedNode && (
        <div style={{ width: 300, padding: 16, borderLeft: '1px solid #ccc' }}>
          <h3>Node: {selectedNode.id}</h3>
          <label>
            Label:
            <input
              value={selectedNode.data.label ?? ''}
              onChange={(e) => {
                updateNodeData(selectedNode.id, { label: e.target.value });
                setSelectedNode((n) => n && ({
                  ...n,
                  data: { ...n.data, label: e.target.value },
                }));
              }}
            />
          </label>
        </div>
      )}
    </div>
  );
}
```

**Tip**: For complex detail panels, use `useNodesData(selectedNode.id)` to subscribe to real-time updates from computed flows or collaborative editing.

## Delete selected nodes and edges with a button

Use `useReactFlow().deleteElements` to delete all currently selected elements:

```tsx
import { useCallback } from 'react';
import { Panel, useReactFlow } from '@xyflow/react';

function DeleteButton() {
  const { getNodes, getEdges, deleteElements } = useReactFlow();

  const onDelete = useCallback(() => {
    const selectedNodes = getNodes().filter((n) => n.selected);
    const selectedEdges = getEdges().filter((e) => e.selected);
    deleteElements({ nodes: selectedNodes, edges: selectedEdges });
  }, [getNodes, getEdges, deleteElements]);

  return (
    <Panel position="top-right">
      <button onClick={onDelete}>Delete Selected</button>
    </Panel>
  );
}
```

**Note**: React Flow already handles `Backspace`/`Delete` key deletion by default. This recipe is for toolbar-style delete buttons.

## Export flow as image

Use `html-to-image` (or `dom-to-image`) to capture the flow viewport as a PNG or SVG. Target the `.react-flow__viewport` element:

```bash
npm install html-to-image
```

```tsx
import { useCallback } from 'react';
import { Panel, useReactFlow, getNodesBounds, getViewportForBounds } from '@xyflow/react';
import { toPng } from 'html-to-image';

const IMAGE_WIDTH = 1024;
const IMAGE_HEIGHT = 768;

function DownloadButton() {
  const { getNodes } = useReactFlow();

  const onClick = useCallback(() => {
    const nodes = getNodes();
    const bounds = getNodesBounds(nodes);
    const viewport = getViewportForBounds(bounds, IMAGE_WIDTH, IMAGE_HEIGHT, 0.5, 2, 0.1);

    const viewportEl = document.querySelector<HTMLElement>('.react-flow__viewport');
    if (!viewportEl) return;

    toPng(viewportEl, {
      backgroundColor: '#ffffff',
      width: IMAGE_WIDTH,
      height: IMAGE_HEIGHT,
      style: {
        width: `${IMAGE_WIDTH}px`,
        height: `${IMAGE_HEIGHT}px`,
        transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.zoom})`,
      },
    }).then((dataUrl) => {
      const link = document.createElement('a');
      link.download = 'flow.png';
      link.href = dataUrl;
      link.click();
    });
  }, [getNodes]);

  return (
    <Panel position="top-right">
      <button onClick={onClick}>Download PNG</button>
    </Panel>
  );
}
```

**Note**: `getViewportForBounds` calculates the transform needed to fit all nodes within the target image dimensions. The last argument (`0.1`) is padding.

## Fit view after adding nodes

When adding nodes programmatically, call `fitView` after the state update to ensure all nodes are visible:

```tsx
import { useReactFlow } from '@xyflow/react';

function AddAndFit() {
  const { addNodes, fitView } = useReactFlow();

  const handleAdd = useCallback(() => {
    addNodes({
      id: 'new',
      position: { x: 500, y: 500 },
      data: { label: 'Far away node' },
    });

    // fitView runs after the next render when nodes are measured
    requestAnimationFrame(() => {
      fitView({ padding: 0.2, duration: 300 });
    });
  }, [addNodes, fitView]);

  return <button onClick={handleAdd}>Add & Fit</button>;
}
```

Use `requestAnimationFrame` or a short timeout because `fitView` needs the new node to be rendered and measured first.

## Do / Don't

- Do use `screenToFlowPosition` (not manual math) when converting mouse/drop coordinates to flow positions.
- Do use `application/reactflow` as the drag data MIME type to avoid conflicts with native browser drag-and-drop.
- Do use `deleteElements` instead of manually filtering nodes and edges — it handles connected edge cleanup automatically.
- Do target `.react-flow__viewport` (not the wrapper) when exporting to image.
- Don't call `fitView` synchronously after `addNodes` — the node hasn't been measured yet. Use `requestAnimationFrame`.
- Don't forget `event.preventDefault()` in `onDragOver` — without it, the drop event won't fire.
