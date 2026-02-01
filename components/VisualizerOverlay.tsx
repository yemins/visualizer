import React from 'react';
import Visualizer3D from './Visualizer3D';
import { AppConfig } from '../types';
import { TooltipWrapper } from './TooltipSystem';

interface VisualizerOverlayProps {
  immersive: boolean;
  mode: AppConfig['visualizerMode'];
  onExit: () => void;
}

const VisualizerOverlay: React.FC<VisualizerOverlayProps> = ({ immersive, mode, onExit }) => {
  return (
    <div className={`fixed top-0 left-0 w-full h-full -z-10 transition-all duration-1000 ${immersive ? 'z-50' : ''}`}>
      <Visualizer3D mode={mode} />
      
      {immersive && (
        <>
          <div className="absolute top-6 left-6 z-50">
            <TooltipWrapper description="Exit Immersive Mode." instruction="Click to return to standard studio view.">
              <button 
                onClick={onExit}
                className="flex items-center gap-2 bg-black/50 hover:bg-red-500/80 text-white px-6 py-3 rounded-full border border-white/20 hover:border-white transition-all backdrop-blur-md group"
              >
                <svg className="w-5 h-5 group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                <span className="font-bold tracking-wider text-sm">EXIT STUDIO</span>
              </button>
            </TooltipWrapper>
          </div>
          
          <div className="absolute bottom-10 left-0 w-full text-center pointer-events-none">
            <h2 className="text-white font-thin text-2xl tracking-[0.5em] animate-pulse">IMMERSIVE MODE</h2>
            <p className="text-xs text-gray-400 mt-2 tracking-widest uppercase">Audio Reactive Engine Active</p>
          </div>
        </>
      )}
    </div>
  );
};

export default VisualizerOverlay;