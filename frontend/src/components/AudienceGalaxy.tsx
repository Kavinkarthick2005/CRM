"use client";

import React, { useEffect, useRef, useState } from "react";
import * as d3 from "d3-force";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";

interface Node extends d3.SimulationNodeDatum {
  id: string;
  radius: number;
  color: string;
  label: string;
  value: number;
  pulse?: boolean;
}

interface AudienceGalaxyProps {
  segments: {
    active: number;
    at_risk: number;
    churned: number;
    vip: number;
  };
}

export default function AudienceGalaxy({ segments }: AudienceGalaxyProps) {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const [nodes, setNodes] = useState<Node[]>([]);
  
  useEffect(() => {
    if (!containerRef.current) return;
    
    const width = containerRef.current.clientWidth;
    const height = containerRef.current.clientHeight;

    // Base sizes
    const total = Math.max(1, segments.active + segments.at_risk + segments.churned + segments.vip);
    
    // Scale radii based on proportion but with min/max bounds so they are always visible
    const getRadius = (val: number) => {
      const proportion = val / total;
      return Math.max(30, Math.min(100, proportion * 150));
    };

    const initialNodes: Node[] = [
      { id: "vip", label: "VIP", value: segments.vip, radius: getRadius(segments.vip), color: "#8b5cf6", pulse: true, x: width/2 + 50, y: height/2 - 50 },
      { id: "active", label: "Active", value: segments.active, radius: getRadius(segments.active), color: "#10b981", pulse: true, x: width/2 - 50, y: height/2 - 50 },
      { id: "at_risk", label: "At Risk", value: segments.at_risk, radius: getRadius(segments.at_risk), color: "#f59e0b", x: width/2 - 50, y: height/2 + 50 },
      { id: "churned", label: "Churned", value: segments.churned, radius: getRadius(segments.churned), color: "#ef4444", x: width/2 + 50, y: height/2 + 50 },
    ];

    const simulation = d3.forceSimulation<Node>(initialNodes)
      .force("charge", d3.forceManyBody().strength(10)) // slight repulsion
      .force("center", d3.forceCenter(width / 2, height / 2).strength(0.05))
      .force("collision", d3.forceCollide().radius((d: any) => d.radius + 10).iterations(2))
      .on("tick", () => {
        setNodes([...simulation.nodes()]);
      });

    // Slight continuous movement
    const interval = setInterval(() => {
      simulation.alpha(0.1).restart();
    }, 3000);

    return () => {
      simulation.stop();
      clearInterval(interval);
    };
  }, [segments]);

  const handleNodeClick = (id: string) => {
    router.push(`/customers?status=${id}`);
  };

  return (
    <div ref={containerRef} className="w-full h-full relative overflow-hidden flex items-center justify-center">
      {nodes.map((node) => (
        <motion.div
          key={node.id}
          onClick={() => handleNodeClick(node.id)}
          className="absolute flex flex-col items-center justify-center rounded-full cursor-pointer transition-transform hover:scale-110 shadow-lg"
          style={{
            width: node.radius * 2,
            height: node.radius * 2,
            left: (node.x || 0) - node.radius,
            top: (node.y || 0) - node.radius,
            backgroundColor: `${node.color}33`, // 20% opacity background
            border: `2px solid ${node.color}`,
          }}
          whileHover={{ zIndex: 10 }}
        >
          {node.pulse && (
            <div 
              className="absolute inset-0 rounded-full animate-ping opacity-20 pointer-events-none"
              style={{ backgroundColor: node.color }}
            ></div>
          )}
          
          <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent rounded-full pointer-events-none"></div>
          
          <span className="text-white font-bold text-center z-10" style={{ fontSize: Math.max(12, node.radius / 4) }}>
            {node.label}
          </span>
          <span className="text-white/80 font-medium z-10" style={{ fontSize: Math.max(10, node.radius / 5) }}>
            {node.value}
          </span>
        </motion.div>
      ))}
    </div>
  );
}
