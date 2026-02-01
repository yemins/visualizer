import React, { useState, useEffect } from 'react';
import { TrackType, ProcessingStatus, AudioTrackState, AppConfig } from './types';
import TrackCard from './components/TrackCard';
import Combiner from './components/Combiner';
import VisualizerOverlay from './components/VisualizerOverlay';
import { getAudioGraph, getProxyUrl } from './services/audioUtils';
import { TooltipProvider, TooltipWrapper } from './components/TooltipSystem';

const initialTrackState = (id: string, type: TrackType): AudioTrackState => ({
  id,
  type,
  file: null,
  originalUrl: null,
  enhancedUrl: null,
  status: ProcessingStatus.IDLE,
  duration: 0
});

const App: React.FC = () => {
  const [workflow, setWorkflow] = useState<AppConfig['workflow']>('SPLIT');
  const [inputSource, setInputSource] = useState<AppConfig['inputSource'] | 'SOUNDCLOUD' | 'SYSTEM'>('FILE');
  const [visualizerMode, setVisualizerMode] = useState<AppConfig['visualizerMode']>('PARTICLE_SPHERE');
  const [immersive, setImmersive] = useState(false);
  const [isMicActive, setIsMicActive] = useState(false);
  const [isSystemAudioActive, setIsSystemAudioActive] = useState(false);
  
  // Account/Settings State
  const [showSettings, setShowSettings] = useState(false);
  const [spotifyConnected, setSpotifyConnected] = useState(false);
  const [youtubeQuery, setYoutubeQuery] = useState('');
  const [soundcloudQuery, setSoundcloudQuery] = useState('');
  const [isVideoLoaded, setIsVideoLoaded] = useState(false);
  
  // Track States
  const [vocalTrack, setVocalTrack] = useState<AudioTrackState>(initialTrackState('vocal', TrackType.VOCAL));
  const [instTrack, setInstTrack] = useState<AudioTrackState>(initialTrackState('inst', TrackType.INSTRUMENTAL));
  const [singleTrack, setSingleTrack] = useState<AudioTrackState>(initialTrackState('single', TrackType.COMBINED));

  const toggleMic = async () => {
    const graph = getAudioGraph();
    if (!isMicActive) {
      const success = await graph.connectMicrophone();
      if (success) {
        setInputSource('MICROPHONE');
        setIsMicActive(true);
        setIsSystemAudioActive(false);
      } else {
        alert("Microphone not found or permission denied.");
      }
    } else {
      graph.disconnect();
      setIsMicActive(false);
      setInputSource('FILE');
    }
  };

  const toggleSystemAudio = async (sourceType: 'SYSTEM' | 'SPOTIFY' = 'SYSTEM') => {
      const graph = getAudioGraph();
      const success = await graph.connectSystemAudio();
      if (success) {
          setInputSource(sourceType as any);
          setIsSystemAudioActive(true);
          setIsMicActive(false);
          // Safety Logic is handled by the browser: The user must select the tab/window.
          // AudioGraph does not route to destination, preventing feedback loop.
      } else {
          alert("System audio capture failed or cancelled.");
      }
  };

  const handleSourceChange = (source: AppConfig['inputSource'] | 'SOUNDCLOUD' | 'SYSTEM') => {
    setInputSource(source);
    const graph = getAudioGraph();
    
    // Cleanup active streams
    if (source !== 'MICROPHONE' && isMicActive) {
      graph.disconnect();
      setIsMicActive(false);
    }
    if (source !== 'SYSTEM' && source !== 'SPOTIFY' && isSystemAudioActive) {
        graph.disconnect();
        setIsSystemAudioActive(false);
    }
  };

  const toggleImmersive = () => {
    if (!immersive) {
      document.documentElement.requestFullscreen().catch((e) => console.log(e));
    } else {
      document.exitFullscreen().catch((e) => console.log(e));
    }
    setImmersive(!immersive);
  };

  return (
    <TooltipProvider>
      <div className={`min-h-screen bg-gray-950 text-white font-sans selection:bg-neon-blue selection:text-black pb-32 relative ${immersive ? 'cursor-none' : ''}`}>
        
        {/* 3D Visualizer Engine */}
        <VisualizerOverlay immersive={immersive} mode={visualizerMode} onExit={toggleImmersive} />

        {/* Main UI Container - Hidden in Immersive Mode */}
        <div className={`transition-opacity duration-500 ${immersive ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
          
          {/* Header */}
          <header className="border-b border-gray-800 bg-gray-950/80 backdrop-blur-md sticky top-0 z-40">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded bg-gradient-to-br from-neon-blue to-neon-purple flex items-center justify-center shadow-[0_0_15px_rgba(188,19,254,0.6)] animate-pulse-subtle">
                  <svg className="w-5 h-5 text-black" fill="currentColor" viewBox="0 0 24 24"><path d="M12 3v9.28a4.39 4.39 0 00-1.5-.28C8.01 12 6 14.01 6 16.5S8.01 21 10.5 21c2.31 0 4.2-1.75 4.45-4H15V6h4V3h-7z"/></svg>
                </div>
                <span className="text-xl font-bold tracking-tight">SonicPolish <span className="text-transparent bg-clip-text bg-gradient-to-r from-neon-blue to-neon-purple">AI</span></span>
              </div>
              
              <div className="flex items-center gap-4">
                {/* Visualizer Selector */}
                <TooltipWrapper description="Selects the active WebGL engine for audio visualization." instruction="Choose a style from the dropdown.">
                  <select 
                    value={visualizerMode}
                    onChange={(e) => setVisualizerMode(e.target.value as AppConfig['visualizerMode'])}
                    className="bg-gray-900 text-xs font-mono border border-gray-700 rounded px-2 py-1 text-gray-300 focus:outline-none focus:border-neon-blue hidden md:block"
                  >
                    <option value="PARTICLE_SPHERE">ENGINE: SPHERE</option>
                    <option value="FRACTAL_RIBBON">ENGINE: RIBBON</option>
                    <option value="MONSTERCAT">ENGINE: SPECTRUM</option>
                    <option value="NEBULA">ENGINE: NEBULA</option>
                    <option value="GEOMETRY_MORPH">ENGINE: MORPH</option>
                    <option value="KINETIC_PLANE">ENGINE: TOPOGRAPHY</option>
                  </select>
                </TooltipWrapper>

                <TooltipWrapper description="Enters Fullscreen 3D Mode." instruction="Click to hide the UI and focus on the visualization.">
                  <button 
                    onClick={toggleImmersive}
                    className="text-xs font-bold uppercase tracking-wider text-neon-blue hover:text-white border border-neon-blue/30 px-3 py-1 rounded hover:bg-neon-blue/10 transition-colors"
                  >
                    Immersive
                  </button>
                </TooltipWrapper>

                <TooltipWrapper description="Opens Account and Node Settings." instruction="Click to manage Spotify/YouTube connections.">
                  <button 
                    onClick={() => setShowSettings(true)}
                    className="p-2 text-gray-400 hover:text-white transition-colors"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                  </button>
                </TooltipWrapper>
              </div>
            </div>
          </header>

          <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 relative z-10">
            
            {/* Input Source Tabs */}
            <div className="flex justify-center mb-8 gap-2 md:gap-4 flex-wrap">
              <TooltipWrapper description="Upload local audio files." instruction="Select to process FLAC, MP3, or WAV files.">
                <button 
                  onClick={() => handleSourceChange('FILE')}
                  className={`px-4 py-2 rounded-full text-sm font-bold transition-all ${inputSource === 'FILE' ? 'bg-white text-black' : 'bg-gray-900 text-gray-500 hover:text-gray-300 border border-gray-800'}`}
                >
                  File Upload
                </button>
              </TooltipWrapper>

              <TooltipWrapper description="Real-time Microphone Input." instruction="Click to visualize audio from your mic.">
                <button 
                  onClick={toggleMic}
                  className={`px-4 py-2 rounded-full text-sm font-bold transition-all flex items-center gap-2 ${inputSource === 'MICROPHONE' ? 'bg-red-500 text-white animate-pulse' : 'bg-gray-900 text-gray-500 hover:text-gray-300 border border-gray-800'}`}
                >
                  {isMicActive ? 'Mic Active' : 'Microphone'}
                </button>
              </TooltipWrapper>

              <TooltipWrapper description="Connect to Spotify Playback." instruction="Click to visualize your active Spotify stream (Requires Premium).">
                <button 
                  onClick={() => handleSourceChange('SPOTIFY')}
                  className={`px-4 py-2 rounded-full text-sm font-bold transition-all flex items-center gap-2 ${inputSource === 'SPOTIFY' ? 'bg-[#1DB954] text-black' : 'bg-gray-900 text-gray-500 hover:text-gray-300 border border-gray-800'}`}
                >
                  Spotify
                </button>
              </TooltipWrapper>

              <TooltipWrapper description="SoundCloud Stream." instruction="Use Proxy to analyze SoundCloud tracks.">
                <button 
                  onClick={() => handleSourceChange('SOUNDCLOUD')}
                  className={`px-4 py-2 rounded-full text-sm font-bold transition-all flex items-center gap-2 ${inputSource === 'SOUNDCLOUD' ? 'bg-[#ff7700] text-white' : 'bg-gray-900 text-gray-500 hover:text-gray-300 border border-gray-800'}`}
                >
                  SoundCloud
                </button>
              </TooltipWrapper>

              <TooltipWrapper description="Universal System Loopback." instruction="Capture audio from any app (Tidal, Apple Music).">
                <button 
                  onClick={() => toggleSystemAudio('SYSTEM')}
                  className={`px-4 py-2 rounded-full text-sm font-bold transition-all flex items-center gap-2 ${inputSource === 'SYSTEM' ? 'bg-blue-500 text-white animate-pulse' : 'bg-gray-900 text-gray-500 hover:text-gray-300 border border-gray-800'}`}
                >
                  System Loopback
                </button>
              </TooltipWrapper>
            </div>

            {/* SPOTIFY SOURCE UI */}
            {inputSource === 'SPOTIFY' && (
              <div className="max-w-3xl mx-auto bg-gray-900/50 p-8 rounded-xl border border-[#1DB954]/30 animate-fade-in-up">
                  <div className="text-center">
                    <h2 className="text-2xl font-bold mb-4">Spotify Professional</h2>
                    <p className="text-gray-400 mb-6">Due to Widevine DRM, we use System Audio Capture for high-fidelity analysis.</p>
                    <TooltipWrapper description="Connect via System Capture." instruction="Click and select the Spotify window/tab to start listening.">
                      <button 
                        onClick={() => toggleSystemAudio('SPOTIFY')}
                        className={`px-8 py-3 bg-[#1DB954] hover:bg-[#1ed760] text-black font-bold rounded-full transition-colors flex items-center gap-2 mx-auto ${isSystemAudioActive ? 'animate-pulse' : ''}`}
                      >
                        {isSystemAudioActive ? 'Listening to System Audio...' : 'Start Listening Session'}
                      </button>
                    </TooltipWrapper>
                    {isSystemAudioActive && <p className="text-xs text-[#1DB954] mt-4 font-mono">NODE A: ACTIVE - AUDIO GRAPH CONNECTED</p>}
                  </div>
              </div>
            )}

            {/* SOUNDCLOUD SOURCE UI */}
            {inputSource === 'SOUNDCLOUD' && (
              <div className="max-w-3xl mx-auto bg-gray-900/50 p-8 rounded-xl border border-[#ff7700]/30 animate-fade-in-up">
                  <h2 className="text-2xl font-bold mb-4 text-[#ff7700]">SoundCloud High-Fidelity</h2>
                  <div className="flex gap-2">
                    <TooltipWrapper description="SoundCloud URL." instruction="Paste a track URL. Requires local Proxy (Port 3001)." className="flex-1">
                      <input 
                          type="text" 
                          placeholder="Paste SoundCloud Track URL..." 
                          value={soundcloudQuery}
                          onChange={(e) => setSoundcloudQuery(e.target.value)}
                          className="w-full bg-black/50 border border-gray-700 rounded-lg px-4 py-2 focus:border-[#ff7700] focus:outline-none"
                      />
                    </TooltipWrapper>
                    <button 
                        onClick={() => alert(`Requesting via Proxy: ${getProxyUrl(soundcloudQuery)}`)}
                        className="px-6 py-2 bg-[#ff7700] hover:bg-orange-600 font-bold rounded-lg transition-colors"
                    >
                        Analyze
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">Note: Requires Koa Proxy running on localhost:3001 to bypass CORS.</p>
              </div>
            )}

            {/* SYSTEM LOOPBACK UI */}
            {inputSource === 'SYSTEM' && (
              <div className="max-w-3xl mx-auto bg-gray-900/50 p-8 rounded-xl border border-blue-500/30 animate-fade-in-up text-center">
                   <h2 className="text-2xl font-bold mb-2 text-blue-400">Universal System Loopback</h2>
                   <p className="text-gray-400 mb-6">Capture High-Res audio from Tidal, Apple Music, or Chrome Tabs.</p>
                   {isSystemAudioActive ? (
                       <div className="p-4 bg-blue-900/20 border border-blue-500 rounded text-blue-300 animate-pulse">
                           SYSTEM AUDIO LINKED. LOCAL OUTPUT MUTED TO PREVENT FEEDBACK.
                       </div>
                   ) : (
                       <button 
                        onClick={() => toggleSystemAudio('SYSTEM')}
                        className="px-8 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-full"
                       >
                           Initialize Loopback
                       </button>
                   )}
              </div>
            )}

            {/* FILE WORKFLOW UI (Default) */}
            {inputSource === 'FILE' && (
              <>
                {/* Workflow Toggle */}
                <div className="flex justify-center mb-10">
                  <div className="bg-gray-900/80 backdrop-blur p-1 rounded-lg border border-gray-700 inline-flex shadow-xl">
                    <TooltipWrapper description="Stem Separation Mode." instruction="Enhance Vocals and Instrumentals separately before combining.">
                      <button
                        onClick={() => setWorkflow('SPLIT')}
                        className={`px-6 py-2 rounded-md text-sm font-medium transition-all ${
                          workflow === 'SPLIT' 
                            ? 'bg-gray-800 text-white shadow-lg border border-gray-600' 
                            : 'text-gray-400 hover:text-white'
                        }`}
                      >
                        Multi-Track (Stems)
                      </button>
                    </TooltipWrapper>
                    <TooltipWrapper description="Stereo Mastering Mode." instruction="Upload a single mixed track for final mastering.">
                      <button
                        onClick={() => setWorkflow('SINGLE')}
                        className={`px-6 py-2 rounded-md text-sm font-medium transition-all ${
                          workflow === 'SINGLE' 
                            ? 'bg-gray-800 text-white shadow-lg border border-gray-600' 
                            : 'text-gray-400 hover:text-white'
                        }`}
                      >
                        Stereo Master
                      </button>
                    </TooltipWrapper>
                  </div>
                </div>

                {/* Workflow: Split Tracks */}
                {workflow === 'SPLIT' && (
                  <div className="space-y-12 animate-fade-in-up">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <TrackCard
                        title="Vocal Stem"
                        description="Upload isolated vocals for clarity enhancement."
                        type={TrackType.VOCAL}
                        trackState={vocalTrack}
                        onUpdate={setVocalTrack}
                        onPlay={() => {}}
                      />
                      <TrackCard
                        title="Instrumental Stem"
                        description="Upload backing track for dynamic balancing."
                        type={TrackType.INSTRUMENTAL}
                        trackState={instTrack}
                        onUpdate={setInstTrack}
                        onPlay={() => {}}
                      />
                    </div>

                    <Combiner vocalTrack={vocalTrack} instTrack={instTrack} />
                  </div>
                )}

                {/* Workflow: Single Track */}
                {workflow === 'SINGLE' && (
                  <div className="max-w-3xl mx-auto animate-fade-in-up">
                    <TrackCard
                        title="Full Mix"
                        description="Upload complete mix for mastering."
                        type={TrackType.COMBINED}
                        trackState={singleTrack}
                        onUpdate={setSingleTrack}
                        onPlay={() => {}}
                      />

                      {singleTrack.status === ProcessingStatus.COMPLETED && (
                        <div className="mt-8 flex justify-center">
                          <TooltipWrapper description="Export Final Master." instruction="Click to download the result as WAV.">
                            <a 
                              href={singleTrack.originalUrl || '#'}
                              download="mastered_track.wav"
                              className="px-10 py-5 rounded-full bg-neon-blue text-black font-bold text-xl hover:bg-white transition-colors flex items-center gap-3 shadow-[0_0_30px_rgba(0,242,255,0.4)]"
                            >
                              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                              Download Master
                            </a>
                          </TooltipWrapper>
                        </div>
                      )}
                  </div>
                )}
              </>
            )}
            
            {/* Mic Visualizer Placeholder */}
            {inputSource === 'MICROPHONE' && (
              <div className="text-center text-gray-500 mt-20">
                  <p className="animate-pulse">Microphone Active - Visualizing Input...</p>
                  <p className="text-xs mt-2">Speak into your mic to see the {visualizerMode.replace('_', ' ')} react.</p>
              </div>
            )}

          </main>

          {/* Footer */}
          <footer className="max-w-7xl mx-auto px-4 py-12 text-center text-gray-600 text-sm relative z-10">
            <p>Powered by Gemini 2.5 • WebGL R3F • Web Audio API</p>
          </footer>

          {/* SETTINGS MODAL */}
          {showSettings && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
              <div className="bg-gray-900 border border-gray-700 rounded-xl max-w-md w-full p-6 shadow-2xl relative">
                  <TooltipWrapper description="Close Settings." instruction="Click to return to the main studio.">
                    <button 
                      onClick={() => setShowSettings(false)}
                      className="absolute top-4 right-4 text-gray-400 hover:text-white"
                    >
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg>
                    </button>
                  </TooltipWrapper>
                  
                  <h2 className="text-2xl font-bold mb-6">Account Settings</h2>
                  
                  <div className="space-y-6">
                    {/* Spotify Section */}
                    <div className="p-4 bg-black/30 rounded-lg border border-gray-800">
                        <div className="flex items-center gap-3 mb-4">
                          <svg className="w-6 h-6 text-[#1DB954]" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/></svg>
                          <h3 className="font-bold text-lg">Spotify</h3>
                        </div>
                        <p className="text-xs text-gray-500 mb-2">Use Node A (System Loopback) for highest fidelity.</p>
                    </div>
                  </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </TooltipProvider>
  );
};

export default App;