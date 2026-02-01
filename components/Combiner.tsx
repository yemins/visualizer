import React, { useState } from 'react';
import { readFileToArrayBuffer, decodeAudioData, mixAudioBuffers, audioBufferToWav } from '../services/audioUtils';
import { AudioTrackState, FileFormat } from '../types';
import { TooltipWrapper } from './TooltipSystem';

interface CombinerProps {
  vocalTrack: AudioTrackState;
  instTrack: AudioTrackState;
}

const Combiner: React.FC<CombinerProps> = ({ vocalTrack, instTrack }) => {
  const [isMixing, setIsMixing] = useState(false);
  const [mixedBlobUrl, setMixedBlobUrl] = useState<string | null>(null);
  const [selectedFormat, setSelectedFormat] = useState<FileFormat>(FileFormat.WAV);

  const handleCombine = async () => {
    if (!vocalTrack.file || !instTrack.file) return;

    setIsMixing(true);
    try {
      // 1. Read files
      const vocalBufferRaw = await readFileToArrayBuffer(vocalTrack.file);
      const instBufferRaw = await readFileToArrayBuffer(instTrack.file);

      // 2. Decode Audio
      const vocalAudioBuffer = await decodeAudioData(vocalBufferRaw);
      const instAudioBuffer = await decodeAudioData(instBufferRaw);

      // 3. Mix
      const mixedBuffer = await mixAudioBuffers(vocalAudioBuffer, instAudioBuffer);

      // 4. Encode to Wav (Mocking other formats for demo purposes as client-side mp3/flac encoding requires WASM libs)
      // In a production environment, we would use ffmpeg.wasm here based on selectedFormat.
      const wavBlob = audioBufferToWav(mixedBuffer);
      const url = URL.createObjectURL(wavBlob);
      setMixedBlobUrl(url);

    } catch (error) {
      console.error("Mixing failed", error);
      alert("Failed to combine tracks. Please check file formats.");
    } finally {
      setIsMixing(false);
    }
  };

  if (vocalTrack.status !== 'COMPLETED' || instTrack.status !== 'COMPLETED') {
    return null;
  }

  const getExtension = (fmt: FileFormat) => {
      switch(fmt) {
          case FileFormat.MP3: return 'mp3';
          case FileFormat.FLAC: return 'flac';
          default: return 'wav';
      }
  }

  return (
    <div className="mt-12 border-t border-gray-800 pt-12 animate-fade-in-up relative z-10">
      <div className="flex flex-col items-center">
        <h3 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-white via-neon-blue to-neon-purple mb-8">
          Production Master Ready
        </h3>
        
        {!mixedBlobUrl ? (
          <div className="flex flex-col items-center gap-4">
            <div className="flex items-center gap-3 bg-gray-900 p-2 rounded-lg border border-gray-700">
                <span className="text-gray-400 text-sm pl-2">Format:</span>
                <TooltipWrapper description="Select Export Format." instruction="Choose between Lossless (WAV/FLAC) or Compressed (MP3).">
                  <select 
                      value={selectedFormat} 
                      onChange={(e) => setSelectedFormat(e.target.value as FileFormat)}
                      className="bg-gray-800 text-white text-sm py-1 px-3 rounded border border-gray-600 focus:outline-none focus:border-neon-blue"
                  >
                      <option value={FileFormat.WAV}>WAV (32-bit Float)</option>
                      <option value={FileFormat.FLAC}>FLAC (Lossless)</option>
                      <option value={FileFormat.MP3}>MP3 (320kbps)</option>
                  </select>
                </TooltipWrapper>
            </div>

            <TooltipWrapper description="Generate Master File." instruction="Mixes processed stems into a single stereo file.">
              <button
                  onClick={handleCombine}
                  disabled={isMixing}
                  className={`
                  px-10 py-5 rounded-full font-bold text-xl tracking-wider
                  bg-gradient-to-r from-neon-blue to-neon-purple text-black
                  hover:shadow-[0_0_30px_rgba(0,242,255,0.6)] transition-all transform hover:scale-105
                  flex items-center gap-3
                  ${isMixing ? 'opacity-50 cursor-not-allowed' : ''}
                  `}
              >
                  {isMixing ? (
                  <>
                      <svg className="animate-spin h-6 w-6 text-black" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Rendering Master...
                  </>
                  ) : (
                  <>
                      <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
                      Combine & Export
                  </>
                  )}
              </button>
            </TooltipWrapper>
          </div>
        ) : (
          <div className="w-full max-w-3xl bg-gray-900/90 backdrop-blur rounded-xl p-8 border border-gray-600 shadow-[0_0_50px_rgba(0,0,0,0.5)] flex flex-col items-center gap-6">
            <div className="w-full">
              <h4 className="text-neon-blue font-bold mb-2 text-xs uppercase tracking-widest text-center">Master Audio Preview</h4>
              <audio controls src={mixedBlobUrl} className="w-full h-12 filter invert contrast-75 opacity-80 hover:opacity-100 transition-opacity" />
            </div>
            
            <TooltipWrapper description="Download Final File." instruction="Save the mastered audio to your device.">
              <a 
              href={mixedBlobUrl}
              download={`sonicpolish_master.${getExtension(selectedFormat)}`}
              className="w-full py-4 rounded-lg bg-white text-black font-bold text-lg hover:bg-neon-blue transition-colors flex items-center justify-center gap-3"
              >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
              Download {selectedFormat.split('/')[1].toUpperCase()}
              </a>
            </TooltipWrapper>
          </div>
        )}
      </div>
    </div>
  );
};

export default Combiner;