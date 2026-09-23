import React, { useState, useMemo, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
    Network, Sparkles, ZoomIn, ZoomOut, RotateCcw, Maximize2, Minimize2, 
    Plus, Minus, RefreshCw, X, Zap, CheckCircle, ArrowRight, Eye
} from 'lucide-react';
import MathRenderer from '../../../components/MathRenderer';

// Node Card Component
const MindMapNodeCard = ({ 
    node, 
    depth = 1, 
    isCollapsed = false, 
    onToggleCollapse, 
    onSelectNode, 
    color = '#3B82F6',
    isDarkMode = true,
    portIdLeft,
    portIdRight
}) => {
    const hasChildren = node.children && node.children.length > 0;

    // Border color and glow based on depth and branch color
    const borderColor = depth === 0 
        ? '#3B82F6' 
        : depth === 1 
            ? (color || '#10B981') 
            : '#F59E0B';

    const titleColor = depth === 0 
        ? (isDarkMode ? '#60A5FA' : '#1D4ED8') 
        : depth === 1 
            ? (isDarkMode ? '#34D399' : '#059669') 
            : (isDarkMode ? '#FBBF24' : '#D97706');

    return (
        <div className="relative flex items-center group my-1">
            {/* Left Port Anchor */}
            {portIdLeft && (
                <div 
                    data-port-id={portIdLeft}
                    className="absolute -left-1.5 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full pointer-events-none z-10 flex items-center justify-center opacity-0"
                />
            )}

            {/* Right Port Anchor */}
            {portIdRight && (
                <div 
                    data-port-id={portIdRight}
                    className="absolute -right-1.5 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full pointer-events-none z-10 flex items-center justify-center opacity-0"
                />
            )}

            {/* The Main Node Pill */}
            <div
                onClick={() => onSelectNode(node)}
                style={{
                    borderColor: `${borderColor}AA`,
                    boxShadow: depth === 0 
                        ? `0 0 28px ${borderColor}55, 0 4px 16px rgba(0,0,0,0.5)`
                        : depth === 1
                            ? `0 0 16px ${borderColor}33, 0 2px 10px rgba(0,0,0,0.4)`
                            : `0 0 12px ${borderColor}2A, 0 2px 8px rgba(0,0,0,0.3)`
                }}
                className={`w-[220px] sm:w-[250px] px-4 py-3 rounded-[12px] border transition-all duration-200 cursor-pointer text-left select-none relative ${
                    depth === 0
                        ? (isDarkMode ? 'bg-[#121c32]/95 backdrop-blur-md' : 'bg-blue-50/95 border-blue-400')
                        : depth === 1
                            ? (isDarkMode ? 'bg-[#0e1d23]/95 backdrop-blur-md' : 'bg-emerald-50/95')
                            : (isDarkMode ? 'bg-[#1a1c22]/95 backdrop-blur-md' : 'bg-amber-50/90')
                } hover:scale-[1.02] hover:border-white/70`}
            >
                {/* Node Title */}
                <h4 
                    style={{ color: titleColor }}
                    className={`font-black uppercase leading-snug tracking-tight truncate ${
                        depth === 0 ? 'text-xs sm:text-sm' : depth === 1 ? 'text-[11px] sm:text-xs' : 'text-[10px] sm:text-[11px]'
                    }`}
                >
                    {node.label || node.title}
                </h4>

                {/* Node Summary / Description */}
                {(node.summary || node.description) && (
                    <p className={`text-[9px] sm:text-[10px] font-normal line-clamp-2 mt-1 leading-relaxed ${
                        isDarkMode ? 'text-slate-300' : 'text-slate-600'
                    }`}>
                        {node.summary || node.description}
                    </p>
                )}

                {/* Quick Formula Badge Preview */}
                {node.formula && (
                    <div className="mt-1.5 pt-1 border-t border-white/10 text-[9px] font-mono truncate text-purple-400 flex items-center gap-1">
                        <Zap size={9} />
                        <span>Formula available</span>
                    </div>
                )}
            </div>

            {/* Expand / Collapse Port Handle */}
            {hasChildren && (
                <button
                    type="button"
                    onClick={(e) => {
                        e.stopPropagation();
                        onToggleCollapse(node.id || node.label);
                    }}
                    style={{ backgroundColor: borderColor }}
                    className={`absolute z-20 w-5 h-5 rounded-full flex items-center justify-center text-white shadow-lg transition-transform duration-150 hover:scale-125 cursor-pointer ${
                        portIdLeft && !portIdRight ? '-left-2.5' : '-right-2.5'
                    }`}
                    title={isCollapsed ? "Expand branch" : "Collapse branch"}
                >
                    {isCollapsed ? <Plus size={10} strokeWidth={3} /> : <Minus size={10} strokeWidth={3} />}
                </button>
            )}
        </div>
    );
};

export const InteractiveMindMap = ({ 
    mindMapData, 
    isLoading, 
    onGenerate, 
    subjectName, 
    chapterName, 
    isDarkMode = true
}) => {
    const [zoomLevel, setZoomLevel] = useState(0.95);
    const [isFullScreen, setIsFullScreen] = useState(false);
    const [selectedNode, setSelectedNode] = useState(null);
    const [collapsedNodes, setCollapsedNodes] = useState({});
    const [lines, setLines] = useState([]);

    // Pan state
    const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const dragStartRef = useRef({ x: 0, y: 0, initialX: 0, initialY: 0 });
    const containerRef = useRef(null);
    const treeWrapperRef = useRef(null);

    const toggleNodeCollapse = (nodeId) => {
        setCollapsedNodes(prev => ({
            ...prev,
            [nodeId]: !prev[nodeId]
        }));
    };

    const handleZoomIn = () => setZoomLevel(prev => Math.min(prev + 0.15, 1.8));
    const handleZoomOut = () => setZoomLevel(prev => Math.max(prev - 0.15, 0.4));
    const handleResetZoom = () => {
        setZoomLevel(0.95);
        setPanOffset({ x: 0, y: 0 });
    };

    // ESC key listener to exit fullscreen
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape' && isFullScreen) {
                setIsFullScreen(false);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isFullScreen]);

    // Prevent background scrolling when in Fullscreen Portal
    useEffect(() => {
        if (isFullScreen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => {
            document.body.style.overflow = '';
        };
    }, [isFullScreen]);

    // Mouse drag pan handlers
    const handleMouseDown = (e) => {
        if (e.target.closest('button') || e.target.closest('.cursor-pointer')) return;
        setIsDragging(true);
        dragStartRef.current = {
            x: e.clientX,
            y: e.clientY,
            initialX: panOffset.x,
            initialY: panOffset.y
        };
    };

    const handleMouseMove = (e) => {
        if (!isDragging) return;
        const dx = e.clientX - dragStartRef.current.x;
        const dy = e.clientY - dragStartRef.current.y;
        setPanOffset({
            x: dragStartRef.current.initialX + dx,
            y: dragStartRef.current.initialY + dy
        });
    };

    const handleMouseUp = () => setIsDragging(false);

    // Root and Branch splitting for Bilateral (Left & Right) Mindmap
    const rootNode = mindMapData?.root || (mindMapData?.title ? {
        id: 'root',
        label: mindMapData.title,
        summary: mindMapData.summary || `Core concepts and formulas for ${chapterName}`,
        children: mindMapData.branches || []
    } : null);

    const { leftBranches, rightBranches } = useMemo(() => {
        const allBranches = rootNode?.children || [];
        if (allBranches.length === 0) return { leftBranches: [], rightBranches: [] };

        const mid = Math.ceil(allBranches.length / 2);
        const left = allBranches.slice(0, mid);
        const right = allBranches.slice(mid);
        return { leftBranches: left, rightBranches: right };
    }, [rootNode]);

    // Recalculate Animated Connecting Bezier Lines between Nodes
    const updateLines = () => {
        if (!treeWrapperRef.current) return;
        const wrapperRect = treeWrapperRef.current.getBoundingClientRect();
        if (!wrapperRect.width || !wrapperRect.height) return;

        const currentZoom = zoomLevel || 1;

        const getPortCoord = (elementId) => {
            const el = treeWrapperRef.current.querySelector(`[data-port-id="${elementId}"]`);
            if (!el) return null;
            const rect = el.getBoundingClientRect();
            return {
                x: (rect.left + rect.width / 2 - wrapperRect.left) / currentZoom,
                y: (rect.top + rect.height / 2 - wrapperRect.top) / currentZoom
            };
        };

        const newLines = [];

        // 1. Root left port -> Left Branches right ports
        const rootLeft = getPortCoord('root-port-left');
        const rootRight = getPortCoord('root-port-right');

        if (rootLeft) {
            leftBranches.forEach((branch, bIdx) => {
                const branchRight = getPortCoord(`branch-left-port-right-${bIdx}`);
                if (branchRight) {
                    const dx = Math.max(35, Math.abs(rootLeft.x - branchRight.x) * 0.5);
                    newLines.push({
                        id: `root-to-left-${bIdx}`,
                        pathD: `M ${rootLeft.x} ${rootLeft.y} C ${rootLeft.x - dx} ${rootLeft.y}, ${branchRight.x + dx} ${branchRight.y}, ${branchRight.x} ${branchRight.y}`,
                        color: '#10B981',
                        side: 'left',
                        startX: rootLeft.x,
                        startY: rootLeft.y,
                        endX: branchRight.x,
                        endY: branchRight.y
                    });

                    // If not collapsed, connect Branch left port -> Children right ports
                    const isCollapsed = !!collapsedNodes[branch.id || branch.label];
                    if (!isCollapsed && branch.children && branch.children.length > 0) {
                        const branchLeft = getPortCoord(`branch-left-port-left-${bIdx}`);
                        if (branchLeft) {
                            branch.children.forEach((child, cIdx) => {
                                const childRight = getPortCoord(`leaf-left-port-right-${bIdx}-${cIdx}`);
                                if (childRight) {
                                    const cdx = Math.max(25, Math.abs(branchLeft.x - childRight.x) * 0.5);
                                    newLines.push({
                                       id: `left-branch-${bIdx}-child-${cIdx}`,
                                       pathD: `M ${branchLeft.x} ${branchLeft.y} C ${branchLeft.x - cdx} ${branchLeft.y}, ${childRight.x + cdx} ${childRight.y}, ${childRight.x} ${childRight.y}`,
                                       color: '#F59E0B',
                                       side: 'left',
                                       startX: branchLeft.x,
                                       startY: branchLeft.y,
                                       endX: childRight.x,
                                       endY: childRight.y
                                    });
                                }
                            });
                        }
                    }
                }
            });
        }

        // 2. Root right port -> Right Branches left ports
        if (rootRight) {
            rightBranches.forEach((branch, bIdx) => {
                const branchLeft = getPortCoord(`branch-right-port-left-${bIdx}`);
                if (branchLeft) {
                    const dx = Math.max(35, Math.abs(branchLeft.x - rootRight.x) * 0.5);
                    newLines.push({
                        id: `root-to-right-${bIdx}`,
                        pathD: `M ${rootRight.x} ${rootRight.y} C ${rootRight.x + dx} ${rootRight.y}, ${branchLeft.x - dx} ${branchLeft.y}, ${branchLeft.x} ${branchLeft.y}`,
                        color: '#10B981',
                        side: 'right',
                        startX: rootRight.x,
                        startY: rootRight.y,
                        endX: branchLeft.x,
                        endY: branchLeft.y
                    });

                    // If not collapsed, connect Branch right port -> Children left ports
                    const isCollapsed = !!collapsedNodes[branch.id || branch.label];
                    if (!isCollapsed && branch.children && branch.children.length > 0) {
                        const branchRight = getPortCoord(`branch-right-port-right-${bIdx}`);
                        if (branchRight) {
                            branch.children.forEach((child, cIdx) => {
                                const childLeft = getPortCoord(`leaf-right-port-left-${bIdx}-${cIdx}`);
                                if (childLeft) {
                                    const cdx = Math.max(25, Math.abs(childLeft.x - branchRight.x) * 0.5);
                                    newLines.push({
                                        id: `right-branch-${bIdx}-child-${cIdx}`,
                                        pathD: `M ${branchRight.x} ${branchRight.y} C ${branchRight.x + cdx} ${branchRight.y}, ${childLeft.x - cdx} ${childLeft.y}, ${childLeft.x} ${childLeft.y}`,
                                        color: '#F59E0B',
                                        side: 'right',
                                        startX: branchRight.x,
                                        startY: branchRight.y,
                                        endX: childLeft.x,
                                        endY: childLeft.y
                                    });
                                }
                            });
                        }
                    }
                }
            });
        }

        setLines(newLines);
    };

    // Recompute on DOM layout, state, or resize changes
    useEffect(() => {
        const timer1 = setTimeout(() => updateLines(), 50);
        const timer2 = setTimeout(() => updateLines(), 200);

        window.addEventListener('resize', updateLines);
        let observer = null;
        if (treeWrapperRef.current && window.ResizeObserver) {
            observer = new ResizeObserver(() => {
                updateLines();
            });
            observer.observe(treeWrapperRef.current);
        }

        return () => {
            clearTimeout(timer1);
            clearTimeout(timer2);
            window.removeEventListener('resize', updateLines);
            if (observer) observer.disconnect();
        };
    }, [mindMapData, collapsedNodes, zoomLevel, isFullScreen, leftBranches, rightBranches]);

    const renderContent = (fullscreenMode) => (
        <div 
            ref={containerRef}
            className={`transition-all duration-300 flex flex-col select-none ${
                fullscreenMode 
                    ? 'fixed inset-0 z-[99999999] w-screen h-screen m-0 rounded-none bg-[#090D16] text-white shadow-2xl' 
                    : 'relative rounded-[5px] border overflow-hidden min-h-[580px] h-[650px] ' + (isDarkMode ? 'bg-[#0B0F19] border-white/10 text-white' : 'bg-slate-900 border-slate-700 text-white shadow-lg')
            }`}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
        >
            {/* Embedded Keyframe Styles for Flowing Animated Dashed Lines */}
            <style>{`
                @keyframes flowDashLeft {
                    0% { stroke-dashoffset: 0; }
                    100% { stroke-dashoffset: 24; }
                }
                @keyframes flowDashRight {
                    0% { stroke-dashoffset: 0; }
                    100% { stroke-dashoffset: -24; }
                }
                .mindmap-flow-left {
                    stroke-dasharray: 6 5;
                    animation: flowDashLeft 1.2s linear infinite;
                }
                .mindmap-flow-right {
                    stroke-dasharray: 6 5;
                    animation: flowDashRight 1.2s linear infinite;
                }
            `}</style>

            {/* Ambient Background Glow Effect */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(59,130,246,0.08)_0%,transparent_70%)] pointer-events-none" />

            {/* Subtle Dotted Grid Background */}
            <div 
                className="absolute inset-0 opacity-20 pointer-events-none" 
                style={{
                    backgroundImage: 'radial-gradient(#94a3b8 1px, transparent 1px)',
                    backgroundSize: '24px 24px'
                }}
            />

            {/* Top Toolbar Strip */}
            <div className="relative z-20 p-3 sm:p-4 border-b border-white/10 bg-black/50 backdrop-blur-md flex flex-wrap items-center justify-between gap-3 shrink-0">
                <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-[5px] bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white shrink-0 shadow-md">
                        <Network size={16} strokeWidth={2.2} />
                    </div>
                    <div className="min-w-0">
                        <div className="flex items-center gap-2">
                            <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-[5px] bg-blue-500/20 text-blue-400 border border-blue-500/30">
                                Concept Map
                            </span>
                            <span className="text-[9px] font-medium text-slate-400 truncate">
                                {subjectName}
                            </span>
                        </div>
                        <h3 className="text-xs sm:text-sm font-bold uppercase tracking-tight truncate mt-0.5 text-white">
                            {chapterName}
                        </h3>
                    </div>
                </div>

                {/* Right Actions: Zoom, Pan reset, Refresh, Fullscreen */}
                <div className="flex items-center gap-1.5 sm:gap-2">
                    {/* Zoom Controls */}
                    <div className="flex items-center rounded-[5px] border border-white/10 p-0.5 bg-white/5 text-slate-200">
                        <button
                            type="button"
                            onClick={handleZoomOut}
                            className="p-1.5 hover:bg-white/10 rounded-[5px] transition-colors cursor-pointer"
                            title="Zoom Out"
                        >
                            <ZoomOut size={13} />
                        </button>
                        <span className="text-[10px] font-mono px-2 select-none text-slate-400">
                            {Math.round(zoomLevel * 100)}%
                        </span>
                        <button
                            type="button"
                            onClick={handleZoomIn}
                            className="p-1.5 hover:bg-white/10 rounded-[5px] transition-colors cursor-pointer"
                            title="Zoom In"
                        >
                            <ZoomIn size={13} />
                        </button>
                        <button
                            type="button"
                            onClick={handleResetZoom}
                            className="p-1.5 hover:bg-white/10 rounded-[5px] transition-colors cursor-pointer text-slate-400 hover:text-white"
                            title="Reset View"
                        >
                            <RotateCcw size={11} />
                        </button>
                    </div>

                    {/* Regenerate AI Button */}
                    <button
                        type="button"
                        onClick={onGenerate}
                        disabled={isLoading}
                        className="px-3 py-1.5 rounded-[5px] bg-blue-600/20 hover:bg-blue-600 text-blue-400 hover:text-white border border-blue-500/30 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer shadow-sm active:scale-98 disabled:opacity-50"
                        title="Regenerate Mind Map"
                    >
                        <RefreshCw size={12} className={isLoading ? 'animate-spin' : ''} />
                        <span className="hidden sm:inline">Refresh</span>
                    </button>

                    {/* Fullscreen Toggle */}
                    <button
                        type="button"
                        onClick={() => setIsFullScreen(!isFullScreen)}
                        className={`p-2 rounded-[5px] border transition-all cursor-pointer flex items-center gap-1 text-[11px] font-semibold ${
                            fullscreenMode 
                                ? 'bg-red-500/20 text-red-300 border-red-500/40 hover:bg-red-500 hover:text-white' 
                                : 'bg-white/5 border-white/10 text-slate-300 hover:text-white hover:bg-white/10'
                        }`}
                        title={fullscreenMode ? "Exit Fullscreen (Esc)" : "Full Screen View"}
                    >
                        {fullscreenMode ? (
                            <>
                                <Minimize2 size={14} />
                                <span className="hidden sm:inline">Exit Fullscreen</span>
                            </>
                        ) : (
                            <>
                                <Maximize2 size={13} />
                                <span className="hidden sm:inline">Fullscreen</span>
                            </>
                        )}
                    </button>
                </div>
            </div>

            {/* Mind Map Canvas Area (Draggable Pan + Zoom) */}
            <div className={`flex-1 relative overflow-hidden flex items-center justify-center ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}>
                {isLoading ? (
                    <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
                        <div className="w-14 h-14 rounded-[5px] bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400 animate-pulse">
                            <Sparkles size={26} className="animate-spin" />
                        </div>
                        <div className="space-y-1">
                            <h4 className="text-sm sm:text-base font-bold uppercase tracking-tight text-white">
                                Generating Concept Mind Map...
                            </h4>
                            <p className="text-xs text-slate-400 max-w-sm">
                                Creating bilateral concept nodes and formulas for {chapterName}.
                            </p>
                        </div>
                    </div>
                ) : !rootNode || (!leftBranches.length && !rightBranches.length) ? (
                    <div className="flex flex-col items-center justify-center py-16 text-center space-y-4">
                        <div className="w-14 h-14 rounded-[5px] bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400">
                            <Network size={28} />
                        </div>
                        <div className="space-y-1">
                            <h4 className="text-sm sm:text-base font-bold uppercase tracking-tight text-white">
                                {chapterName} Mind Map
                            </h4>
                            <p className="text-xs text-slate-400 max-w-sm">
                                Generate an organic visual concept tree with branching formulas and key rules.
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={onGenerate}
                            className="px-5 py-2.5 rounded-[5px] bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs uppercase tracking-wider flex items-center gap-2 shadow-md transition-all cursor-pointer active:scale-98"
                        >
                            <Sparkles size={14} />
                            <span>Generate Mind Map</span>
                        </button>
                    </div>
                ) : (
                    /* BILATERAL ORGANIC TREE LAYOUT WITH ANIMATED SVG CONNECTOR LINES */
                    <div 
                        ref={treeWrapperRef}
                        className="transition-transform duration-75 flex items-center justify-center gap-14 sm:gap-24 p-12 min-w-max relative"
                        style={{
                            transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoomLevel})`
                        }}
                    >
                        {/* FULL CANVAS ANIMATED SVG CONNECTOR OVERLAY */}
                        <svg 
                            className="absolute inset-0 w-full h-full pointer-events-none z-0 overflow-visible"
                        >
                            {lines.map((line) => (
                                <g key={line.id}>
                                    {/* Ambient Glow Underlay */}
                                    <path
                                        d={line.pathD}
                                        fill="none"
                                        stroke={line.color}
                                        strokeWidth="4"
                                        strokeOpacity="0.25"
                                        strokeLinecap="round"
                                    />
                                    {/* Base Solid Guide Line */}
                                    <path
                                        d={line.pathD}
                                        fill="none"
                                        stroke={line.color}
                                        strokeWidth="1.5"
                                        strokeOpacity="0.4"
                                        strokeLinecap="round"
                                    />
                                    {/* Animated Flowing Dashed Beam */}
                                    <path
                                        d={line.pathD}
                                        fill="none"
                                        stroke={line.color}
                                        strokeWidth="2.2"
                                        strokeLinecap="round"
                                        className={line.side === 'left' ? 'mindmap-flow-left' : 'mindmap-flow-right'}
                                    />
                                    {/* Terminal Glowing Dot */}
                                    <circle
                                        cx={line.endX}
                                        cy={line.endY}
                                        r="3.5"
                                        fill={line.color}
                                        className="animate-pulse"
                                    />
                                </g>
                            ))}
                        </svg>

                        {/* 1. LEFT SIDE BRANCHES & LEAF NODES */}
                        <div className="flex flex-col items-end gap-12 relative z-10">
                            {leftBranches.map((branch, bIdx) => {
                                const isBranchCollapsed = !!collapsedNodes[branch.id || branch.label];
                                const subChildren = branch.children || [];
                                const showChildren = !isBranchCollapsed && subChildren.length > 0;

                                return (
                                    <div key={branch.id || bIdx} className="flex items-center gap-14 sm:gap-20">
                                        {/* Sub-children / Leaf Nodes (Extended to the far left) */}
                                        {showChildren && (
                                            <div className="flex flex-col items-end gap-3.5">
                                                {subChildren.map((child, cIdx) => (
                                                    <MindMapNodeCard
                                                        key={child.id || cIdx}
                                                        node={child}
                                                        depth={2}
                                                        isCollapsed={!!collapsedNodes[child.id || child.label]}
                                                        onToggleCollapse={toggleNodeCollapse}
                                                        onSelectNode={setSelectedNode}
                                                        color="#F59E0B"
                                                        isDarkMode={isDarkMode}
                                                        portIdRight={`leaf-left-port-right-${bIdx}-${cIdx}`}
                                                    />
                                                ))}
                                            </div>
                                        )}

                                        {/* Branch Level 1 Node */}
                                        <div className="relative">
                                            <MindMapNodeCard
                                                node={branch}
                                                depth={1}
                                                isCollapsed={isBranchCollapsed}
                                                onToggleCollapse={toggleNodeCollapse}
                                                onSelectNode={setSelectedNode}
                                                color="#10B981"
                                                isDarkMode={isDarkMode}
                                                portIdLeft={`branch-left-port-left-${bIdx}`}
                                                portIdRight={`branch-left-port-right-${bIdx}`}
                                            />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* 2. CENTRAL ROOT NODE (The Chapter Hub) */}
                        <div className="relative flex flex-col items-center z-10">
                            <MindMapNodeCard
                                node={rootNode}
                                depth={0}
                                isCollapsed={false}
                                onToggleCollapse={() => {}}
                                onSelectNode={setSelectedNode}
                                color="#3B82F6"
                                isDarkMode={isDarkMode}
                                portIdLeft="root-port-left"
                                portIdRight="root-port-right"
                            />
                        </div>

                        {/* 3. RIGHT SIDE BRANCHES & LEAF NODES */}
                        <div className="flex flex-col items-start gap-12 relative z-10">
                            {rightBranches.map((branch, bIdx) => {
                                const isBranchCollapsed = !!collapsedNodes[branch.id || branch.label];
                                const subChildren = branch.children || [];
                                const showChildren = !isBranchCollapsed && subChildren.length > 0;

                                return (
                                    <div key={branch.id || bIdx} className="flex items-center gap-14 sm:gap-20">
                                        {/* Branch Level 1 Node */}
                                        <div className="relative">
                                            <MindMapNodeCard
                                                node={branch}
                                                depth={1}
                                                isCollapsed={isBranchCollapsed}
                                                onToggleCollapse={toggleNodeCollapse}
                                                onSelectNode={setSelectedNode}
                                                color="#10B981"
                                                isDarkMode={isDarkMode}
                                                portIdLeft={`branch-right-port-left-${bIdx}`}
                                                portIdRight={`branch-right-port-right-${bIdx}`}
                                            />
                                        </div>

                                        {/* Sub-children / Leaf Nodes (Extended to the far right) */}
                                        {showChildren && (
                                            <div className="flex flex-col items-start gap-3.5">
                                                {subChildren.map((child, cIdx) => (
                                                    <MindMapNodeCard
                                                        key={child.id || cIdx}
                                                        node={child}
                                                        depth={2}
                                                        isCollapsed={!!collapsedNodes[child.id || child.label]}
                                                        onToggleCollapse={toggleNodeCollapse}
                                                        onSelectNode={setSelectedNode}
                                                        color="#F59E0B"
                                                        isDarkMode={isDarkMode}
                                                        portIdLeft={`leaf-right-port-left-${bIdx}-${cIdx}`}
                                                    />
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>

            {/* NODE DETAIL INSPECTOR MODAL */}
            {selectedNode && (
                <div className="fixed inset-0 z-[999999999] flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200">
                    <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={() => setSelectedNode(null)} />
                    <div className="relative w-full max-w-xl max-h-[85vh] rounded-[8px] overflow-hidden shadow-2xl border border-white/20 bg-[#10141D] text-white flex flex-col z-10 animate-in zoom-in-95">
                        {/* Modal Header */}
                        <div className="px-5 py-3.5 border-b border-white/10 bg-[#141926] flex items-center justify-between">
                            <div className="flex items-center gap-2.5 min-w-0">
                                <div className="w-3 h-3 rounded-full bg-blue-500 shrink-0" />
                                <div className="min-w-0">
                                    <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 block">
                                        Concept Details
                                    </span>
                                    <h4 className="text-sm sm:text-base font-bold uppercase tracking-tight truncate text-white">
                                        {selectedNode.label || selectedNode.title}
                                    </h4>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => setSelectedNode(null)}
                                className="p-1.5 rounded-[5px] text-slate-400 hover:text-white cursor-pointer"
                            >
                                <X size={16} />
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div className="p-5 sm:p-6 overflow-y-auto custom-scrollbar space-y-4">
                            {/* Summary */}
                            {(selectedNode.summary || selectedNode.description) && (
                                <div className="space-y-1">
                                    <h5 className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                        Overview
                                    </h5>
                                    <p className="text-xs sm:text-sm font-normal leading-relaxed text-slate-200">
                                        {selectedNode.summary || selectedNode.description}
                                    </p>
                                </div>
                            )}

                            {/* Core Formula / Rule */}
                            {selectedNode.formula && (
                                <div className="space-y-1.5">
                                    <h5 className="text-[10px] font-bold uppercase tracking-wider text-blue-400 flex items-center gap-1">
                                        <Zap size={11} className="fill-current" />
                                        Core Equation & Law
                                    </h5>
                                    <div className="p-4 rounded-[5px] border border-blue-500/30 bg-black/50 text-blue-200 overflow-x-auto">
                                        <MathRenderer html={selectedNode.formula} className="text-sm font-medium" />
                                    </div>
                                </div>
                            )}

                            {/* Key Takeaways & Exam Tips */}
                            {selectedNode.key_points && selectedNode.key_points.length > 0 && (
                                <div className="space-y-2 pt-1">
                                    <h5 className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                                        <CheckCircle size={11} className="text-emerald-400" />
                                        Key Takeaways & Exam Hooks
                                    </h5>
                                    <ul className="space-y-2">
                                        {selectedNode.key_points.map((pt, ptIdx) => (
                                            <li 
                                                key={ptIdx}
                                                className="p-2.5 rounded-[5px] border border-white/5 bg-[#141926] text-slate-300 text-xs font-normal flex items-start gap-2"
                                            >
                                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1.5 shrink-0" />
                                                <div className="flex-1 min-w-0">
                                                    <MathRenderer html={pt} />
                                                </div>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );

    // If Fullscreen is active, render via Portal to document.body to break out of all parent layout containers
    if (isFullScreen) {
        return (
            <>
                <div className="min-h-[580px] h-[650px] rounded-[5px] border border-dashed border-white/10 flex items-center justify-center text-slate-400 text-xs">
                    <span>Mind Map is currently expanded in Fullscreen Popup Mode.</span>
                </div>
                {createPortal(renderContent(true), document.body)}
            </>
        );
    }

    return renderContent(false);
};

export default InteractiveMindMap;
