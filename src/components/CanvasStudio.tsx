import React, { useState, useRef, useEffect } from 'react';
import { CanvasNode, CanvasConnection } from '../types';
import {
  ZoomIn,
  ZoomOut,
  Maximize2,
  Plus,
  StickyNote,
  Square,
  Sparkles,
  Trash2,
  Move,
  Link,
  Check,
  X
} from 'lucide-react';

interface CanvasStudioProps {
  nodes: CanvasNode[];
  connections: CanvasConnection[];
  onUpdateNode: (node: CanvasNode) => void;
  onAddNode: (node: CanvasNode) => void;
  onDeleteNode: (id: string) => void;
  onAddConnection: (connection: CanvasConnection) => void;
  onDeleteConnection: (id: string) => void;
}

export const CanvasStudio: React.FC<CanvasStudioProps> = ({
  nodes,
  connections,
  onUpdateNode,
  onAddNode,
  onDeleteNode,
  onAddConnection,
  onDeleteConnection
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 50, y: 30 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });

  const [activeNodeId, setActiveNodeId] = useState<string | null>(null);
  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  const [connectingFromId, setConnectingFromId] = useState<string | null>(null);

  // New Node Quick Creator Modal
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newType, setNewType] = useState<'card' | 'sticky' | 'decision'>('sticky');
  const [newDesc, setNewDesc] = useState('');

  // Handle Canvas Pan
  const handleMouseDown = (e: React.MouseEvent) => {
    // Only pan if clicking canvas background
    if ((e.target as HTMLElement).closest('.canvas-node')) return;
    setIsPanning(true);
    setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isPanning) {
      setPan({
        x: e.clientX - panStart.x,
        y: e.clientY - panStart.y
      });
    } else if (draggingNodeId) {
      const node = nodes.find((n) => n.id === draggingNodeId);
      if (node) {
        const newX = Math.round((e.clientX - pan.x) / zoom - dragOffset.x);
        const newY = Math.round((e.clientY - pan.y) / zoom - dragOffset.y);
        onUpdateNode({
          ...node,
          x: Math.max(0, newX),
          y: Math.max(0, newY)
        });
      }
    }
  };

  const handleMouseUp = () => {
    setIsPanning(false);
    setDraggingNodeId(null);
  };

  // Node Drag
  const startDragNode = (e: React.MouseEvent, node: CanvasNode) => {
    e.stopPropagation();
    if (connectingFromId) {
      if (connectingFromId !== node.id) {
        // Create connection
        onAddConnection({
          id: `conn-${Date.now()}`,
          fromId: connectingFromId,
          toId: node.id,
          label: 'Linked',
          color: '#6366f1'
        });
      }
      setConnectingFromId(null);
      return;
    }

    setActiveNodeId(node.id);
    setDraggingNodeId(node.id);
    const mouseWorldX = (e.clientX - pan.x) / zoom;
    const mouseWorldY = (e.clientY - pan.y) / zoom;
    setDragOffset({
      x: mouseWorldX - node.x,
      y: mouseWorldY - node.y
    });
  };

  const handleCreateNode = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    const newNode: CanvasNode = {
      id: `node-${Date.now()}`,
      type: newType,
      title: newTitle.trim(),
      description: newDesc.trim() || undefined,
      x: Math.round((-pan.x + 300) / zoom),
      y: Math.round((-pan.y + 200) / zoom),
      width: newType === 'sticky' ? 240 : 280,
      height: newType === 'sticky' ? 180 : 160,
      color: newType === 'sticky' ? '#312e81' : '#18181b',
      tags: [newType.toUpperCase()]
    };

    onAddNode(newNode);
    setNewTitle('');
    setNewDesc('');
    setShowAddMenu(false);
  };

  // Calculate Cubic Bezier paths between nodes
  const renderConnections = () => {
    return connections.map((conn) => {
      const fromNode = nodes.find((n) => n.id === conn.fromId);
      const toNode = nodes.find((n) => n.id === conn.toId);
      if (!fromNode || !toNode) return null;

      const fromW = fromNode.width || 260;
      const fromH = fromNode.height || 160;
      const toW = toNode.width || 260;
      const toH = toNode.height || 160;

      const startX = fromNode.x + fromW;
      const startY = fromNode.y + fromH / 2;
      const endX = toNode.x;
      const endY = toNode.y + toH / 2;

      const dx = Math.abs(endX - startX) * 0.5;
      const cp1X = startX + Math.max(dx, 40);
      const cp1Y = startY;
      const cp2X = endX - Math.max(dx, 40);
      const cp2Y = endY;

      const midX = (startX + endX) / 2;
      const midY = (startY + endY) / 2;

      return (
        <g key={conn.id} className="group cursor-pointer">
          <path
            d={`M ${startX} ${startY} C ${cp1X} ${cp1Y}, ${cp2X} ${cp2Y}, ${endX} ${endY}`}
            fill="none"
            stroke="rgba(99, 102, 241, 0.4)"
            strokeWidth="2.5"
            strokeDasharray="4 4"
            className="group-hover:stroke-indigo-400 group-hover:stroke-[3.5] transition-all"
          />
          {conn.label && (
            <g
              transform={`translate(${midX}, ${midY})`}
              onClick={(e) => {
                e.stopPropagation();
                onDeleteConnection(conn.id);
              }}
            >
              <rect
                x="-36"
                y="-11"
                width="72"
                height="22"
                rx="4"
                fill="#18181b"
                stroke="#3f3f46"
                strokeWidth="1"
              />
              <text
                x="0"
                y="3"
                textAnchor="middle"
                fontSize="10"
                fontFamily="JetBrains Mono"
                fill="#a1a1aa"
              >
                {conn.label}
              </text>
            </g>
          )}
        </g>
      );
    });
  };

  return (
    <div
      ref={containerRef}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      className="relative flex-1 h-full overflow-hidden bg-neutral-950 select-none cursor-default"
      style={{
        backgroundImage: `radial-gradient(circle at 1px 1px, rgba(255,255,255,0.07) 1px, transparent 0)`,
        backgroundSize: `${32 * zoom}px ${32 * zoom}px`,
        backgroundPosition: `${pan.x}px ${pan.y}px`
      }}
    >
      {/* Floating Canvas Controls */}
      <div className="absolute top-4 left-6 z-20 flex items-center gap-2 bg-neutral-900/90 border border-neutral-800 rounded-lg p-1.5 shadow-xl backdrop-blur-md">
        <button
          onClick={() => setZoom((z) => Math.min(2, Number((z + 0.1).toFixed(2))))}
          className="p-1.5 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded transition-colors"
          title="Zoom In"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
        <span className="font-mono text-xs text-neutral-300 w-12 text-center tabular-nums">
          {Math.round(zoom * 100)}%
        </span>
        <button
          onClick={() => setZoom((z) => Math.max(0.4, Number((z - 0.1).toFixed(2))))}
          className="p-1.5 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded transition-colors"
          title="Zoom Out"
        >
          <ZoomOut className="w-4 h-4" />
        </button>
        <div className="h-4 w-px bg-neutral-800" />
        <button
          onClick={() => {
            setZoom(1);
            setPan({ x: 50, y: 30 });
          }}
          className="p-1.5 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded transition-colors"
          title="Reset View"
        >
          <Maximize2 className="w-4 h-4" />
        </button>
        <div className="h-4 w-px bg-neutral-800" />
        <button
          onClick={() => setShowAddMenu(true)}
          className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-md transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add Node</span>
        </button>
      </div>

      {/* Linking Mode Helper Bar */}
      {connectingFromId && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-3 bg-indigo-950/95 border border-indigo-500/50 px-4 py-2 rounded-full shadow-2xl text-xs text-indigo-200">
          <span className="flex items-center gap-1.5 font-medium">
            <Link className="w-4 h-4 animate-spin text-indigo-400" />
            Click another node to connect line
          </span>
          <button
            onClick={() => setConnectingFromId(null)}
            className="text-neutral-400 hover:text-white ml-2 text-xs font-mono"
          >
            Cancel [ESC]
          </button>
        </div>
      )}

      {/* Canvas Viewport Matrix */}
      <div
        className="absolute inset-0 origin-top-left pointer-events-none"
        style={{
          transform: `matrix(${zoom}, 0, 0, ${zoom}, ${pan.x}, ${pan.y})`
        }}
      >
        {/* SVG Connection Layer */}
        <svg
          className="absolute inset-0 w-[5000px] h-[5000px] pointer-events-auto overflow-visible"
          style={{ transform: 'translate(0, 0)' }}
        >
          <defs>
            <marker
              id="arrowhead"
              markerWidth="8"
              markerHeight="6"
              refX="6"
              refY="3"
              orient="auto"
            >
              <polygon points="0 0, 8 3, 0 6" fill="#6366f1" />
            </marker>
          </defs>
          {renderConnections()}
        </svg>

        {/* Nodes Layer */}
        {nodes.map((node) => {
          const isSelected = activeNodeId === node.id;
          const isLinkSource = connectingFromId === node.id;

          return (
            <div
              key={node.id}
              className={`canvas-node absolute pointer-events-auto rounded-xl border transition-shadow duration-150 select-none ${
                isSelected
                  ? 'ring-2 ring-indigo-500/70 shadow-2xl z-10'
                  : 'shadow-md z-1'
              } ${
                isLinkSource
                  ? 'ring-2 ring-amber-400 ring-offset-2 ring-offset-neutral-950'
                  : ''
              } ${
                node.type === 'sticky'
                  ? 'bg-indigo-950/70 border-indigo-500/40 text-indigo-100'
                  : node.type === 'decision'
                  ? 'bg-neutral-900 border-purple-500/40 text-neutral-100'
                  : 'bg-neutral-900/90 border-neutral-800 text-neutral-100'
              }`}
              style={{
                left: `${node.x}px`,
                top: `${node.y}px`,
                width: `${node.width || 280}px`,
                minHeight: `${node.height || 150}px`
              }}
              onMouseDown={(e) => startDragNode(e, node)}
            >
              {/* Header bar of node */}
              <div className="px-3.5 py-2.5 border-b border-neutral-800/80 flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  {node.type === 'sticky' && <StickyNote className="w-3.5 h-3.5 text-indigo-400" />}
                  {node.type === 'asset' && <Square className="w-3.5 h-3.5 text-emerald-400" />}
                  {node.type === 'decision' && <Sparkles className="w-3.5 h-3.5 text-purple-400" />}
                  {node.type === 'card' && <Move className="w-3.5 h-3.5 text-neutral-400" />}
                  <span className="text-[10px] font-mono uppercase tracking-wider text-neutral-400">
                    {node.type}
                  </span>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setConnectingFromId(node.id);
                    }}
                    className="p-1 text-neutral-400 hover:text-indigo-300 hover:bg-neutral-800 rounded transition-colors"
                    title="Connect to node"
                  >
                    <Link className="w-3 h-3" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteNode(node.id);
                    }}
                    className="p-1 text-neutral-400 hover:text-rose-400 hover:bg-neutral-800 rounded transition-colors"
                    title="Delete Node"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>

              {/* Node Body */}
              <div className="p-3.5">
                <h4 className="text-sm font-semibold text-white mb-1.5 leading-snug">
                  {node.title}
                </h4>

                {node.description && (
                  <p className="text-xs text-neutral-300 mb-2 leading-relaxed">
                    {node.description}
                  </p>
                )}

                {/* If it has an image asset */}
                {node.image && (
                  <div className="mt-2 rounded-lg overflow-hidden border border-neutral-800 aspect-video bg-neutral-950">
                    <img
                      src={node.image}
                      alt={node.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}

                {/* Node Tags */}
                {node.tags && node.tags.length > 0 && (
                  <div className="mt-2.5 flex flex-wrap gap-1">
                    {node.tags.map((t) => (
                      <span
                        key={t}
                        className="text-[9px] font-mono text-neutral-400 bg-neutral-800/80 px-1.5 py-0.5 rounded"
                      >
                        #{t}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Add Node Modal Drawer */}
      {showAddMenu && (
        <div className="absolute inset-0 z-30 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <form
            onSubmit={handleCreateNode}
            className="w-full max-w-md bg-neutral-900 border border-neutral-800 rounded-xl p-5 shadow-2xl"
          >
            <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
              <h3 className="text-sm font-semibold text-white">Add Canvas Node</h3>
              <button
                type="button"
                onClick={() => setShowAddMenu(false)}
                className="text-neutral-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="mt-4 space-y-3">
              <div>
                <label className="block text-xs font-medium text-neutral-400 mb-1">
                  Node Type
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['card', 'sticky', 'decision'] as const).map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setNewType(type)}
                      className={`py-2 px-3 text-xs font-mono capitalize rounded-lg border text-center transition-colors ${
                        newType === type
                          ? 'border-indigo-500 bg-indigo-950/40 text-indigo-300'
                          : 'border-neutral-800 bg-neutral-950 text-neutral-400 hover:border-neutral-700'
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-400 mb-1">
                  Title
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Dark mode contrast audit"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-neutral-950 border border-neutral-800 rounded-lg text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-400 mb-1">
                  Notes / Description
                </label>
                <textarea
                  rows={3}
                  placeholder="Additional context, constraints, or links..."
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-neutral-950 border border-neutral-800 rounded-lg text-white focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <div className="mt-5 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowAddMenu(false)}
                className="px-3 py-1.5 text-xs text-neutral-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg shadow-sm"
              >
                Place on Canvas
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
