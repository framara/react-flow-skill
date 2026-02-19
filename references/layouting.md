# Layouting

## When to use this reference

Use this file when positioning nodes with layout algorithms, creating sub-flows with parent-child relationships, or integrating external layout libraries like dagre, elkjs, or d3.

## Contents

- [Layout library comparison](#layout-library-comparison)
- [Dagre integration](#dagre-integration)
- [ELK integration](#elk-integration)
- [D3-Hierarchy integration](#d3-hierarchy-integration)
- [D3-Force integration](#d3-force-integration)
- [Sub-flows (parent-child nodes)](#sub-flows-parent-child-nodes)
- [Layout on initial render](#layout-on-initial-render)
- [useAutoLayout hook (dagre)](#useautolayout-hook-dagre)
- [Animated layout transitions](#animated-layout-transitions)

## Layout library comparison

React Flow does not include built-in layout algorithms. Use an external library:

| Library | Best for | Dynamic sizes | Sub-flows | Edge routing | Bundle size |
|---------|----------|---------------|-----------|--------------|-------------|
| **dagre** | Tree/DAG with minimal config | Yes | Partial | No | Small |
| **elkjs** | Complex, highly configurable layouts | Yes | Yes | Yes | Large (~1.4MB) |
| **d3-hierarchy** | Single-root tree structures | No (uniform) | No | No | Small |
| **d3-force** | Physics-based, organic layouts | Yes | No | No | Small |

## Dagre integration

Best for tree-shaped graphs with straightforward requirements.

```tsx
import dagre from '@dagrejs/dagre';

const dagreGraph = new dagre.graphlib.Graph().setDefaultEdgeLabel(() => ({}));

function getLayoutedElements(nodes, edges, direction = 'TB') {
  const isHorizontal = direction === 'LR';
  dagreGraph.setGraph({ rankdir: direction });

  nodes.forEach((node) => {
    dagreGraph.setNode(node.id, {
      width: node.measured?.width ?? 172,
      height: node.measured?.height ?? 36,
    });
  });

  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  dagre.layout(dagreGraph);

  const layoutedNodes = nodes.map((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);
    return {
      ...node,
      position: {
        x: nodeWithPosition.x - (node.measured?.width ?? 172) / 2,
        y: nodeWithPosition.y - (node.measured?.height ?? 36) / 2,
      },
      targetPosition: isHorizontal ? 'left' : 'top',
      sourcePosition: isHorizontal ? 'right' : 'bottom',
    };
  });

  return { nodes: layoutedNodes, edges };
}
```

### Using dagre layout

```tsx
function LayoutFlow() {
  const [nodes, setNodes] = useState(initialNodes);
  const [edges, setEdges] = useState(initialEdges);

  const onLayout = useCallback(
    (direction) => {
      const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(
        nodes,
        edges,
        direction,
      );
      setNodes([...layoutedNodes]);
      setEdges([...layoutedEdges]);
    },
    [nodes, edges],
  );

  return (
    <ReactFlow nodes={nodes} edges={edges} fitView>
      <Panel position="top-right">
        <button onClick={() => onLayout('TB')}>Vertical</button>
        <button onClick={() => onLayout('LR')}>Horizontal</button>
      </Panel>
    </ReactFlow>
  );
}
```

**Note**: Dagre centers nodes by default. Subtract half the width/height to get the top-left origin React Flow expects.

## ELK integration

Best for complex graphs needing edge routing and advanced layout options.

```tsx
import ELK from 'elkjs/lib/elk.bundled.js';

const elk = new ELK();

const elkOptions = {
  'elk.algorithm': 'layered',
  'elk.layered.spacing.nodeNodeBetweenLayers': '100',
  'elk.spacing.nodeNode': '80',
};

async function getLayoutedElements(nodes, edges, options = {}) {
  const graph = {
    id: 'root',
    layoutOptions: { ...elkOptions, ...options },
    children: nodes.map((node) => ({
      id: node.id,
      width: node.measured?.width ?? 150,
      height: node.measured?.height ?? 50,
      targetPosition: 'top',
      sourcePosition: 'bottom',
    })),
    edges: edges.map((edge) => ({
      id: edge.id,
      sources: [edge.source],
      targets: [edge.target],
    })),
  };

  const layoutedGraph = await elk.layout(graph);

  const layoutedNodes = nodes.map((node) => {
    const layoutedNode = layoutedGraph.children?.find((n) => n.id === node.id);
    return {
      ...node,
      position: { x: layoutedNode?.x ?? 0, y: layoutedNode?.y ?? 0 },
    };
  });

  return { nodes: layoutedNodes, edges };
}
```

**Note**: ELK runs asynchronously. Handle the layout in a `useEffect` or event handler with `await`.

## D3-Hierarchy integration

Best for tree structures with a single root node.

```tsx
import { stratify, tree } from 'd3-hierarchy';

function getLayoutedElements(nodes, edges) {
  const hierarchy = stratify()
    .id((d) => d.id)
    .parentId((d) => edges.find((e) => e.target === d.id)?.source);

  const root = hierarchy(nodes);
  const layout = tree().nodeSize([200, 100]);
  layout(root);

  return {
    nodes: root.descendants().map((d) => ({
      ...d.data,
      position: { x: d.x, y: d.y },
    })),
    edges,
  };
}
```

**Limitation**: Requires single root, all nodes must be reachable, uniform node sizes.

## D3-Force integration

Best for organic, physics-based layouts with interactive simulation.

```tsx
import { forceSimulation, forceLink, forceManyBody, forceX, forceY } from 'd3-force';

function useLayoutedElements() {
  const { getNodes, getEdges, setNodes } = useReactFlow();

  return useCallback(() => {
    const nodes = getNodes();
    const edges = getEdges();

    const simulation = forceSimulation(nodes)
      .force('link', forceLink(edges).id((d) => d.id).distance(100))
      .force('charge', forceManyBody().strength(-200))
      .force('x', forceX().strength(0.05))
      .force('y', forceY().strength(0.05));

    simulation.on('end', () => {
      setNodes(
        nodes.map((node) => ({
          ...node,
          position: { x: node.x, y: node.y },
        })),
      );
    });

    simulation.alpha(1).restart();
  }, [getNodes, getEdges, setNodes]);
}
```

## Sub-flows (parent-child nodes)

### Creating a sub-flow

Set `parentId` on child nodes. Children are positioned relative to their parent's top-left corner:

```tsx
const nodes = [
  // Parent must come BEFORE children in the array
  {
    id: 'group-1',
    type: 'group',
    position: { x: 0, y: 0 },
    style: { width: 400, height: 300 },
    data: {},
  },
  {
    id: 'child-1',
    parentId: 'group-1',
    position: { x: 20, y: 50 }, // relative to parent
    data: { label: 'Child Node' },
  },
  {
    id: 'child-2',
    parentId: 'group-1',
    position: { x: 200, y: 50 },
    data: { label: 'Another Child' },
    extent: 'parent', // restrict movement to parent bounds
  },
];
```

### Critical rules for sub-flows

1. **Parent first**: Parent nodes must appear before their children in the `nodes` array.
2. **Relative positioning**: Child `position` is relative to parent's top-left corner.
3. **Movement**: Children move with their parent. Without `extent: 'parent'`, children can be dragged outside.
4. **Edge rendering**: Edges connected to child nodes render above nodes (not below like normal edges).
5. **Parent dimensions**: Set explicit `style.width` and `style.height` on parent nodes.

### Constraining children

```tsx
// Constrain child to parent bounds
{ extent: 'parent' }

// Auto-expand parent when child is dragged to edge
{ expandParent: true }
```

### The group node type

The `group` type is a convenience — it has no handles and renders as a container:

```tsx
{ id: 'g1', type: 'group', position: { x: 0, y: 0 }, style: { width: 400, height: 300 }, data: {} }
```

Any node type can be a parent. Use custom types for parents that need handles or custom rendering.

### Connecting sub-flow nodes externally

Child nodes can have edges to nodes outside their parent group. This creates connections between the sub-flow and the outer flow.

## Layout on initial render

To layout nodes after they've been measured (so you have accurate dimensions):

```tsx
import { useNodesInitialized } from '@xyflow/react';

function Flow() {
  const nodesInitialized = useNodesInitialized();

  useEffect(() => {
    if (nodesInitialized) {
      // Nodes are measured — now apply layout
      const { nodes: layouted } = getLayoutedElements(nodes, edges);
      setNodes(layouted);
      // Optionally fit view after layout
      setTimeout(() => fitView(), 0);
    }
  }, [nodesInitialized]);
}
```

## useAutoLayout hook (dagre)

Reusable hook that auto-layouts on initialization and exposes a `runLayout` function:

```tsx
import { useCallback, useEffect, useRef } from 'react';
import { useReactFlow, useNodesInitialized } from '@xyflow/react';
import dagre from '@dagrejs/dagre';

interface UseAutoLayoutOptions {
  direction?: 'TB' | 'BT' | 'LR' | 'RL';
  nodesep?: number;
  ranksep?: number;
}

export function useAutoLayout(options: UseAutoLayoutOptions = {}) {
  const { direction = 'TB', nodesep = 50, ranksep = 50 } = options;
  const { getNodes, getEdges, setNodes, fitView } = useReactFlow();
  const nodesInitialized = useNodesInitialized();
  const layoutApplied = useRef(false);

  const runLayout = useCallback(() => {
    const nodes = getNodes();
    const edges = getEdges();

    const g = new dagre.graphlib.Graph();
    g.setGraph({ rankdir: direction, nodesep, ranksep });
    g.setDefaultEdgeLabel(() => ({}));

    nodes.forEach((node) => {
      g.setNode(node.id, {
        width: node.measured?.width ?? 172,
        height: node.measured?.height ?? 36,
      });
    });
    edges.forEach((edge) => g.setEdge(edge.source, edge.target));
    dagre.layout(g);

    const layouted = nodes.map((node) => {
      const pos = g.node(node.id);
      const w = node.measured?.width ?? 172;
      const h = node.measured?.height ?? 36;
      return { ...node, position: { x: pos.x - w / 2, y: pos.y - h / 2 } };
    });

    setNodes(layouted);
    window.requestAnimationFrame(() => fitView({ duration: 200 }));
  }, [direction, nodesep, ranksep, getNodes, getEdges, setNodes, fitView]);

  useEffect(() => {
    if (nodesInitialized && !layoutApplied.current) {
      runLayout();
      layoutApplied.current = true;
    }
  }, [nodesInitialized, runLayout]);

  return { runLayout };
}
```

Usage:

```tsx
function Flow() {
  const { runLayout } = useAutoLayout({ direction: 'LR', ranksep: 100 });
  return (
    <>
      <button onClick={runLayout}>Re-layout</button>
      <ReactFlow ... />
    </>
  );
}
```

## Animated layout transitions

Add smooth position changes when re-laying out:

```css
.react-flow__node {
  transition: transform 300ms ease-out;
}
```

## Do / Don't

- Do use dagre for quick tree layouts with minimal configuration.
- Do use elkjs when you need edge routing or complex layout options.
- Do ensure parent nodes appear before children in the `nodes` array.
- Do set explicit dimensions on parent/group nodes.
- Do apply layout after nodes are measured (use `useNodesInitialized`).
- Don't expect React Flow to layout nodes automatically — it only handles rendering and interaction.
- Don't mix layout libraries without understanding their constraints (e.g., d3-hierarchy needs a single root).
