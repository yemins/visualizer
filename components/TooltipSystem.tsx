import React, { createContext, useContext, useState, useRef, useEffect, ReactNode } from 'react';

interface TooltipState {
  visible: boolean;
  description: string;
  instruction: string;
  x: number;
  y: number;
}

const TooltipContext = createContext<{
  showTooltip: (desc: string, instr: string, x: number, y: number) => void;
  hideTooltip: () => void;
}>({
  showTooltip: () => {},
  hideTooltip: () => {},
});

export const TooltipProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [tooltip, setTooltip] = useState<TooltipState>({
    visible: false,
    description: '',
    instruction: '',
    x: 0,
    y: 0,
  });

  const showTooltip = (desc: string, instr: string, x: number, y: number) => {
    setTooltip({ visible: true, description: desc, instruction: instr, x, y });
  };

  const hideTooltip = () => {
    setTooltip(prev => ({ ...prev, visible: false }));
  };

  return (
    <TooltipContext.Provider value={{ showTooltip, hideTooltip }}>
      {children}
      {/* Fixed Tooltip Element */}
      <div 
        className={`fixed z-[100] pointer-events-none transition-opacity duration-200 ${tooltip.visible ? 'opacity-100' : 'opacity-0'}`}
        style={{ 
          left: Math.min(window.innerWidth - 220, tooltip.x + 15), // Prevent overflow right
          top: Math.min(window.innerHeight - 100, tooltip.y + 15), // Prevent overflow bottom
        }}
      >
        <div className="bg-gray-900/95 backdrop-blur-md border border-neon-blue/50 rounded-lg p-3 shadow-[0_0_15px_rgba(0,0,0,0.8)] max-w-[200px]">
          <h5 className="text-neon-blue font-bold text-xs uppercase tracking-wider mb-1">Function</h5>
          <p className="text-white text-xs mb-2 leading-snug">{tooltip.description}</p>
          <div className="h-px bg-gray-700 mb-2"></div>
          <h5 className="text-gray-400 font-bold text-[10px] uppercase tracking-wider mb-1">How-To</h5>
          <p className="text-gray-300 text-[10px] italic leading-snug">{tooltip.instruction}</p>
        </div>
      </div>
    </TooltipContext.Provider>
  );
};

interface TooltipWrapperProps {
  children: ReactNode;
  description: string;
  instruction: string;
  className?: string;
  // Pass-through standard HTML props if needed for layout
  [key: string]: any;
}

export const TooltipWrapper: React.FC<TooltipWrapperProps> = ({ 
  children, 
  description, 
  instruction, 
  className = "",
  ...props 
}) => {
  const { showTooltip, hideTooltip } = useContext(TooltipContext);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleMouseEnter = (e: React.MouseEvent) => {
    showTooltip(description, instruction, e.clientX, e.clientY);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    showTooltip(description, instruction, e.clientX, e.clientY);
  };

  const handleMouseLeave = () => {
    hideTooltip();
  };

  // Mobile Long Press Logic
  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    const x = touch.clientX;
    const y = touch.clientY;
    
    longPressTimer.current = setTimeout(() => {
      showTooltip(description, instruction, x, y);
    }, 500); // 500ms for long press
  };

  const handleTouchEnd = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
    }
    hideTooltip();
  };

  return (
    <div 
      className={className}
      onMouseEnter={handleMouseEnter}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
      {...props}
    >
      {children}
    </div>
  );
};