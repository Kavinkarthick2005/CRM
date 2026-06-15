"use client";

import React, { useEffect, useMemo } from 'react';
import {
  ReactFlow,
  useNodesState,
  useEdgesState,
  MarkerType,
  Position,
  Handle,
  Background
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import dagre from 'dagre';
import { motion } from 'framer-motion';
import { CheckCircle, AlertTriangle, XCircle, Loader2 } from 'lucide-react';

const dagreGraph = new dagre.graphlib.Graph();
dagreGraph.setDefaultEdgeLabel(() => ({}));

const nodeWidth = 250;
const nodeHeight = 100;

const getLayoutedElements = (nodes: any[], edges: any[], direction = 'TB') => {
  dagreGraph.setGraph({ rankdir: direction, nodesep: 50, ranksep: 80 });

  nodes.forEach((node) => {
    dagreGraph.setNode(node.id, { width: nodeWidth, height: nodeHeight });
  });

  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  dagre.layout(dagreGraph);

  const newNodes = nodes.map((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);
    const newNode = { ...node };
    newNode.targetPosition = Position.Top;
    newNode.sourcePosition = Position.Bottom;
    
    // We pass a slightly randomized coordinate to trigger React Flow layout re-render if needed, 
    // but dagre gives us deterministic relative positioning.
    newNode.position = {
      x: nodeWithPosition.x - nodeWidth / 2,
      y: nodeWithPosition.y - nodeHeight / 2,
    };
    return newNode;
  });

  return { nodes: newNodes, edges };
};

const CustomAgentNode = ({ data }: any) => {
  const { label, status, confidence, fallback_used } = data;
  
  let bgColor = "bg-slate-800";
  let borderColor = "border-slate-600";
  let Icon = Loader2;
  let iconColor = "text-slate-400";
  let animatePulse = false;

  if (status === "executing") {
    bgColor = "bg-blue-900/40";
    borderColor = "border-blue-500";
    Icon = Loader2;
    iconColor = "text-blue-400";
  } else if (status === "failed") {
    bgColor = "bg-red-900/40";
    borderColor = "border-red-500";
    Icon = XCircle;
    iconColor = "text-red-400";
    animatePulse = true;
  } else if (fallback_used) {
    bgColor = "bg-amber-900/40";
    borderColor = "border-amber-500";
    Icon = AlertTriangle;
    iconColor = "text-amber-400";
  } else if (status === "completed") {
    bgColor = "bg-emerald-900/40";
    borderColor = "border-emerald-500";
    Icon = CheckCircle;
    iconColor = "text-emerald-400";
  }

  const radius = 16;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = confidence !== undefined ? circumference - (confidence / 100) * circumference : circumference;

  return (
    <motion.div 
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
      className={`relative w-[250px] rounded-xl border-2 ${borderColor} ${bgColor} p-4 backdrop-blur-md shadow-xl`}
    >
      {animatePulse && (
        <div className="absolute inset-0 rounded-xl bg-red-500/20 animate-pulse pointer-events-none"></div>
      )}
      <Handle type="target" position={Position.Top} className="!bg-slate-500 !w-3 !h-3" />
      
      <div className="flex items-center justify-between z-10 relative">
        <div className="flex items-center space-x-3">
          <div className={`${iconColor} ${status === 'executing' ? 'animate-spin' : ''}`}>
            <Icon className="w-6 h-6" />
          </div>
          <div>
            <h4 className="text-white font-bold text-sm">{label}</h4>
            <span className={`text-xs ${iconColor} font-medium capitalize`}>
              {fallback_used ? "Fallback Used" : status || "Not Executed"}
            </span>
          </div>
        </div>
        
        {confidence !== undefined && (
          <div className="relative flex items-center justify-center w-10 h-10">
            <svg className="w-10 h-10 transform -rotate-90">
              <circle cx="20" cy="20" r={radius} stroke="currentColor" strokeWidth="3" fill="transparent" className="text-slate-700" />
              <circle 
                cx="20" cy="20" r={radius} 
                stroke="currentColor" strokeWidth="3" fill="transparent" 
                strokeDasharray={circumference} strokeDashoffset={strokeDashoffset} 
                className={`${confidence > 80 ? 'text-emerald-400' : confidence > 50 ? 'text-amber-400' : 'text-red-400'} transition-all duration-1000 ease-in-out`} 
              />
            </svg>
            <span className="absolute text-[10px] font-bold text-white">{confidence}%</span>
          </div>
        )}
      </div>

      <Handle type="source" position={Position.Bottom} className="!bg-slate-500 !w-3 !h-3" />
    </motion.div>
  );
};

const nodeTypes = {
  agentNode: CustomAgentNode,
};

export default function AgentGraph({ activeNodes }: { activeNodes: any[] }) {
  const initialNodes = [
    { id: 'Intent Agent', type: 'agentNode', data: { label: 'Intent Agent', status: 'pending' }, position: { x: 0, y: 0 } },
    { id: 'RAG Agent', type: 'agentNode', data: { label: 'RAG Agent', status: 'pending' }, position: { x: 0, y: 0 } },
    { id: 'Segment Agent', type: 'agentNode', data: { label: 'Segment Agent', status: 'pending' }, position: { x: 0, y: 0 } },
    { id: 'Message Agent', type: 'agentNode', data: { label: 'Message Agent', status: 'pending' }, position: { x: 0, y: 0 } },
    { id: 'Validator Agent', type: 'agentNode', data: { label: 'Validator Agent', status: 'pending' }, position: { x: 0, y: 0 } },
    { id: 'Recovery Agent', type: 'agentNode', data: { label: 'Recovery Agent', status: 'pending' }, position: { x: 0, y: 0 } },
    { id: 'Emergency Agent', type: 'agentNode', data: { label: 'Emergency Agent', status: 'pending' }, position: { x: 0, y: 0 } },
    { id: 'Campaign Sent', type: 'agentNode', data: { label: 'Campaign Sent', status: 'pending' }, position: { x: 0, y: 0 } },
    { id: 'Messages Delivered', type: 'agentNode', data: { label: 'Messages Delivered', status: 'pending' }, position: { x: 0, y: 0 } },
    { id: 'Messages Opened', type: 'agentNode', data: { label: 'Messages Opened', status: 'pending' }, position: { x: 0, y: 0 } },
    { id: 'Messages Clicked', type: 'agentNode', data: { label: 'Messages Clicked', status: 'pending' }, position: { x: 0, y: 0 } },
  ];

  const initialEdges = [
    { id: 'e1', source: 'Intent Agent', target: 'RAG Agent', type: 'smoothstep', animated: false },
    { id: 'e2', source: 'RAG Agent', target: 'Segment Agent', type: 'smoothstep', animated: false },
    { id: 'e3', source: 'Segment Agent', target: 'Message Agent', type: 'smoothstep', animated: false },
    { id: 'e4', source: 'Message Agent', target: 'Validator Agent', type: 'smoothstep', animated: false },
    { id: 'e5', source: 'Message Agent', target: 'Recovery Agent', type: 'smoothstep', animated: false },
    { id: 'e6', source: 'Recovery Agent', target: 'Emergency Agent', type: 'smoothstep', animated: false },
    { id: 'e7', source: 'Recovery Agent', target: 'Validator Agent', type: 'smoothstep', animated: false },
    { id: 'e8', source: 'Validator Agent', target: 'Campaign Sent', type: 'smoothstep', animated: false },
    { id: 'e9', source: 'Campaign Sent', target: 'Messages Delivered', type: 'smoothstep', animated: false },
    { id: 'e10', source: 'Messages Delivered', target: 'Messages Opened', type: 'smoothstep', animated: false },
    { id: 'e11', source: 'Messages Opened', target: 'Messages Clicked', type: 'smoothstep', animated: false },
  ];

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  useEffect(() => {
    // Update node states based on activeNodes
    const updatedNodes = initialNodes.map(node => {
      const activeNode = activeNodes.find(n => n.agent_name === node.id);
      if (activeNode) {
        return {
          ...node,
          data: {
            ...node.data,
            status: activeNode.status,
            confidence: activeNode.confidence_score,
            fallback_used: activeNode.fallback_used
          }
        };
      }
      return {
        ...node,
        data: {
          ...node.data,
          status: 'pending'
        }
      };
    });

    // Animate edges pointing from active executing/completed nodes
    const updatedEdges = initialEdges.map(edge => {
      const sourceActive = activeNodes.find(n => n.agent_name === edge.source);
      const isAnimated = sourceActive?.status === 'executing' || sourceActive?.status === 'completed';
      return {
        ...edge,
        animated: isAnimated,
        style: { stroke: isAnimated ? '#6366f1' : '#475569', strokeWidth: 2 },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: isAnimated ? '#6366f1' : '#475569',
        },
      };
    });

    const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(updatedNodes, updatedEdges);
    setNodes(layoutedNodes);
    setEdges(layoutedEdges);
  }, [activeNodes, setNodes, setEdges]);

  return (
    <div className="w-full h-[600px] bg-slate-950 rounded-xl border border-slate-800 overflow-hidden">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        fitView
        attributionPosition="bottom-right"
        proOptions={{ hideAttribution: true }}
      >
        <Background color="#334155" gap={20} size={1} />
      </ReactFlow>
    </div>
  );
}
