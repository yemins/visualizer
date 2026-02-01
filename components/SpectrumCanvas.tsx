import React, { useEffect, useRef } from 'react';
import { AudioVisualizer } from '../services/audioUtils';

// Note: TrackCard now handles connection to UnifiedAudioGraph for 3D visuals.
// This component uses a localized visualizer for surgical spectrum analysis only.

interface SpectrumCanvasProps {
  audioRef: React.RefObject<HTMLAudioElement>;
  isPlaying: boolean;
  color: string;
  height?: number;
}

const SpectrumCanvas: React.FC<SpectrumCanvasProps> = ({ audioRef, isPlaying, color, height = 100 }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const visualizerRef = useRef<AudioVisualizer | null>(null);

  useEffect(() => {
    if (!visualizerRef.current) {
      visualizerRef.current = new AudioVisualizer();
    }
    
    // Connect audio node when available
    // Note: Creating multiple sources for same element is generally okay if managed well, 
    // but in a real app we might want to tap into the UnifiedGraph. 
    // For this specific 'isolated' spectrum view, a local analyser is acceptable for display.
    if (audioRef.current) {
        visualizerRef.current.connect(audioRef.current);
    }
  }, [audioRef]);

  useEffect(() => {
    let animationId: number;

    const render = () => {
      if (canvasRef.current && visualizerRef.current) {
        const canvas = canvasRef.current;
        const parent = canvas.parentElement;
        if(parent) canvas.width = parent.clientWidth;
        canvas.height = height;
        visualizerRef.current.drawBars(canvas, color);
      }
      if (isPlaying) {
        animationId = requestAnimationFrame(render);
      }
    };

    if (isPlaying) {
        render();
    } else {
        render(); // Draw static
    }

    return () => cancelAnimationFrame(animationId);
  }, [isPlaying, color, height]);

  return <canvas ref={canvasRef} className="w-full rounded bg-black/20" />;
};

export default SpectrumCanvas;