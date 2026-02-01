import React, { useRef, useState, useEffect } from 'react';
import { TrackType, ProcessingStatus, AudioTrackState } from '../types';
import { enhanceAudioWithGemini } from '../services/geminiService';
import { getAudioGraph } from '../services/audioUtils';
import SpectrumCanvas from './SpectrumCanvas';
import { TooltipWrapper } from './TooltipSystem';

interface TrackCardProps {
  type: TrackType;
  trackState: AudioTrackState;
  onUpdate: (updatedState: AudioTrackState) => void;
  title: string;
  description: string;
  onPlay: (isPlaying: boolean) => void;
}

const TrackCard: React.FC<TrackCardProps> = ({ type, trackState, onUpdate, title, description, onPlay }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const originalAudioRef = useRef<HTMLAudioElement>(null);
  const enhancedAudioRef = useRef<HTMLAudioElement>(null);

  const [isPlayingOriginal, setIsPlayingOriginal] = useState(false);
  const [isPlayingEnhanced, setIsPlayingEnhanced] = useState(false);
  // State for simultaneous playback
  const [isPlayingBoth, setIsPlayingBoth] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const url = URL.createObjectURL(file);
      onUpdate({
        ...trackState,
        file,
        originalUrl: url,
        enhancedUrl: null,
        status: ProcessingStatus.READY_TO_ENHANCE,
        analysisReport: undefined
      });
    }
  };

  const handleEnhance = async () => {
    if (!trackState.file) return;
    onUpdate({ ...trackState, status: ProcessingStatus.PROCESSING });
    const result = await enhanceAudioWithGemini(trackState.file, type);
    if (result.success) {
      onUpdate({
        ...trackState,
        status: ProcessingStatus.COMPLETED,
        enhancedUrl: trackState.originalUrl, // Mocked for demo
        analysisReport: result.analysis
      });
    } else {
      onUpdate({ ...trackState, status: ProcessingStatus.ERROR, analysisReport: "Optimization failed. Please try again." });
    }
  };

  const connectToGraph = (audioEl: HTMLAudioElement) => {
    const graph = getAudioGraph();
    graph.connectElement(audioEl);
  };

  const stopAll = () => {
    if (originalAudioRef.current) {
      originalAudioRef.current.pause();
      setIsPlayingOriginal(false);
    }
    if (enhancedAudioRef.current) {
      enhancedAudioRef.current.pause();
      setIsPlayingEnhanced(false);
    }
    setIsPlayingBoth(false);
    onPlay(false);
  };

  const togglePlayOriginal = () => {
    if (!originalAudioRef.current) return;
    
    if (isPlayingOriginal && !isPlayingBoth) {
      // Normal pause
      stopAll();
    } else {
      // Play Only Original
      stopAll();
      originalAudioRef.current.currentTime = 0; // Optional: Reset to start for clarity
      originalAudioRef.current.play();
      connectToGraph(originalAudioRef.current);
      setIsPlayingOriginal(true);
      onPlay(true);
    }
  };

  const togglePlayEnhanced = () => {
    if (!enhancedAudioRef.current) return;

    if (isPlayingEnhanced && !isPlayingBoth) {
      // Normal pause
      stopAll();
    } else {
      // Play Only Enhanced
      stopAll();
      enhancedAudioRef.current.currentTime = 0;
      enhancedAudioRef.current.play();
      connectToGraph(enhancedAudioRef.current);
      setIsPlayingEnhanced(true);
      onPlay(true);
    }
  };

  const togglePlayBoth = () => {
    if (!originalAudioRef.current || !enhancedAudioRef.current) return;

    if (isPlayingBoth) {
      stopAll();
    } else {
      // Stop individual play first
      originalAudioRef.current.pause();
      enhancedAudioRef.current.pause();

      // Sync and Start Both
      const startProps = 0;
      originalAudioRef.current.currentTime = startProps;
      enhancedAudioRef.current.currentTime = startProps;
      
      originalAudioRef.current.play();
      enhancedAudioRef.current.play();
      
      // Connect original to graph for 3D visualizer (can only visualize one source centrally)
      // SpectrumCanvas handles local visualization for both via refs
      connectToGraph(originalAudioRef.current); 

      setIsPlayingOriginal(true);
      setIsPlayingEnhanced(true);
      setIsPlayingBoth(true);
      onPlay(true);
    }
  };

  const containerClass = (isPlayingOriginal || isPlayingEnhanced) 
    ? "bg-gray-850/90 border-neon-blue shadow-[0_0_20px_rgba(0,242,255,0.2)]" 
    : "bg-gray-850/50 border-gray-700 hover:border-gray-500";

  return (
    <div className={`border rounded-xl p-6 relative overflow-hidden group transition-all duration-500 backdrop-blur-sm ${containerClass}`}>
      {/* Decorative Glow */}
      <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-neon-blue to-neon-purple opacity-50 group-hover:opacity-100 transition-opacity" />

      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-xl font-bold text-white tracking-wide">{title}</h3>
          <p className="text-gray-400 text-sm mt-1">{description}</p>
        </div>
        <div className={`text-xs font-mono px-2 py-1 rounded bg-gray-700 border border-gray-600 ${trackState.status === 'COMPLETED' ? 'text-green-400 border-green-900' : 'text-neon-blue'}`}>
           {trackState.status === ProcessingStatus.IDLE ? 'WAITING' : trackState.status}
        </div>
      </div>

      {!trackState.file ? (
        <TooltipWrapper description="Upload Audio File." instruction="Click to open file browser (supports .mp3, .flac, .wav).">
          <div 
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-gray-600 hover:border-neon-blue hover:bg-gray-800/30 rounded-lg h-32 flex flex-col items-center justify-center cursor-pointer transition-all duration-300"
          >
            <svg className="w-8 h-8 text-gray-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            <span className="text-gray-400 text-sm font-medium">Click to upload FLAC, MP3, WAV</span>
            <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".flac,.mp3,.wav" className="hidden" />
          </div>
        </TooltipWrapper>
      ) : (
        <div className="space-y-6">
          <div className="flex items-center justify-between bg-gray-900/50 p-3 rounded border border-gray-700">
             <div className="flex items-center space-x-3 overflow-hidden">
              <div className="w-8 h-8 rounded bg-gray-700 flex items-center justify-center text-neon-purple">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/></svg>
              </div>
              <span className="text-sm text-gray-300 truncate font-mono">{trackState.file.name}</span>
            </div>
            <TooltipWrapper description="Remove File." instruction="Click to clear this track and upload a new one.">
              <button 
                onClick={() => onUpdate({...trackState, file: null, originalUrl: null, enhancedUrl: null, status: ProcessingStatus.IDLE})}
                className="text-gray-500 hover:text-red-400"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg>
              </button>
            </TooltipWrapper>
          </div>

          {trackState.status === ProcessingStatus.COMPLETED ? (
            <div className="grid gap-4 bg-black/60 p-4 rounded-xl border border-gray-700/80 backdrop-blur-md">
               <div className="flex flex-col gap-2 border-b border-gray-800 pb-2">
                 <div className="flex justify-between items-center">
                    <h4 className="text-[10px] uppercase font-bold text-gray-400 tracking-[0.2em]">Surgical Spectral Comparison</h4>
                    <span className="text-[9px] font-mono text-neon-blue">512-POINT LOGARITHMIC FFT</span>
                 </div>
                 
                 {/* SEPARATE BUTTON FOR SIMULTANEOUS PLAYBACK */}
                 <TooltipWrapper description="Sync Playback Mode." instruction="Plays both Original and Enhanced tracks simultaneously for phase checking.">
                  <button 
                    onClick={togglePlayBoth}
                    className={`w-full py-2 rounded text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2 border ${
                      isPlayingBoth 
                          ? 'bg-neon-blue text-black border-neon-blue shadow-[0_0_20px_rgba(0,242,255,0.4)]' 
                          : 'bg-gray-800 text-white border-gray-600 hover:border-white hover:bg-gray-700'
                    }`}
                  >
                    {isPlayingBoth ? (
                      <>
                          <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
                          <span className="w-2 h-2 bg-black rounded-full animate-pulse"></span>
                          SYNC ACTIVE: PLAYING A+B
                      </>
                    ) : (
                      <>
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
                          Play Both Simultaneously
                      </>
                    )}
                  </button>
                 </TooltipWrapper>
               </div>
               
               {/* STACKED VIEW */}
               <div className="relative h-24 bg-gray-900/50 rounded overflow-hidden group border border-gray-800">
                  <div className="absolute top-1 left-1 z-10 text-[9px] text-red-400 font-mono px-1 bg-black/50 rounded">RAW INPUT (A)</div>
                  <SpectrumCanvas audioRef={originalAudioRef} isPlaying={isPlayingOriginal} color="#f87171" height={96} />
                  <TooltipWrapper description="Preview Original Audio." instruction="Click to listen to the raw file before enhancement." className="absolute inset-0">
                    <button onClick={togglePlayOriginal} className={`w-full h-full flex items-center justify-center transition-colors ${isPlayingBoth ? 'pointer-events-none' : 'hover:bg-black/30'}`}>
                      {isPlayingOriginal && !isPlayingBoth ? <div className="p-2 bg-red-500 rounded-full shadow-lg scale-75"><svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg></div> : !isPlayingBoth && <svg className="w-8 h-8 text-white opacity-50 group-hover:opacity-100" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>}
                    </button>
                  </TooltipWrapper>
               </div>

               <div className="relative h-24 bg-gray-900/50 rounded overflow-hidden group border-t border-gray-800">
                  <div className="absolute top-1 left-1 z-10 text-[9px] text-neon-blue font-mono px-1 bg-black/50 rounded">MASTERED (B)</div>
                  <SpectrumCanvas audioRef={enhancedAudioRef} isPlaying={isPlayingEnhanced} color="#00f2ff" height={96} />
                  <TooltipWrapper description="Preview Enhanced Audio." instruction="Click to listen to the AI-mastered result." className="absolute inset-0">
                    <button onClick={togglePlayEnhanced} className={`w-full h-full flex items-center justify-center transition-colors ${isPlayingBoth ? 'pointer-events-none' : 'hover:bg-black/30'}`}>
                      {isPlayingEnhanced && !isPlayingBoth ? <div className="p-2 bg-neon-blue rounded-full shadow-lg scale-75"><svg className="w-4 h-4 text-black" fill="currentColor" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg></div> : !isPlayingBoth && <svg className="w-8 h-8 text-neon-blue opacity-50 group-hover:opacity-100" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>}
                    </button>
                  </TooltipWrapper>
               </div>

               <audio ref={originalAudioRef} src={trackState.originalUrl || ''} onEnded={() => {if(!isPlayingBoth) setIsPlayingOriginal(false)}} className="hidden" crossOrigin="anonymous" />
               <audio ref={enhancedAudioRef} src={trackState.enhancedUrl || ''} onEnded={() => {if(!isPlayingBoth) setIsPlayingEnhanced(false)}} className="hidden" crossOrigin="anonymous" />
            </div>
          ) : (
            <div className="bg-black/40 rounded-lg p-3 border border-gray-700">
               <div className="flex items-center space-x-3">
                  <TooltipWrapper description="Preview Audio." instruction="Click to play the uploaded file.">
                    <button onClick={togglePlayOriginal} className="w-10 h-10 flex items-center justify-center rounded-full bg-gray-700 hover:bg-white hover:text-black transition-colors">
                      {isPlayingOriginal ? <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg> : <svg className="w-4 h-4 ml-1" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>}
                    </button>
                  </TooltipWrapper>
                  <div className="flex-1 text-xs text-gray-500 uppercase tracking-wider font-semibold">Pre-Processing Preview</div>
               </div>
               <audio ref={originalAudioRef} src={trackState.originalUrl || ''} onEnded={() => setIsPlayingOriginal(false)} className="hidden" />
            </div>
          )}

          {trackState.analysisReport && (
            <div className="bg-gray-900/80 p-4 rounded text-xs text-gray-300 border-l-2 border-neon-purple mt-2 shadow-inner">
              <p className="font-bold text-neon-purple mb-2 uppercase tracking-wide">Gemini Analysis:</p>
              <p className="opacity-80 leading-relaxed whitespace-pre-line font-mono">{trackState.analysisReport}</p>
            </div>
          )}

          {trackState.status !== ProcessingStatus.COMPLETED && trackState.status !== ProcessingStatus.PROCESSING && (
            <TooltipWrapper description="Start AI Enhancement." instruction="Click to send audio to the processing engine.">
              <button
                onClick={handleEnhance}
                className="w-full py-4 rounded-lg bg-gradient-to-r from-gray-800 to-gray-900 hover:from-neon-blue hover:to-neon-purple hover:text-black text-white font-bold transition-all duration-300 border border-gray-600 hover:border-transparent flex items-center justify-center gap-2 group shadow-lg hover:shadow-[0_0_20px_rgba(188,19,254,0.4)]"
              >
                <svg className="w-5 h-5 group-hover:animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg>
                Enhance
              </button>
            </TooltipWrapper>
          )}

          {trackState.status === ProcessingStatus.PROCESSING && (
             <div className="relative w-full h-12 bg-gray-900 rounded overflow-hidden flex items-center justify-center border border-gray-700">
                <div className="absolute inset-0 bg-neon-blue/10 animate-pulse"></div>
                <span className="text-neon-blue font-mono text-sm z-10">Enhancing Audio...</span>
             </div>
          )}
        </div>
      )}
    </div>
  );
};

export default TrackCard;