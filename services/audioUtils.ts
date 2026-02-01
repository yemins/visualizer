/**
 * Unified Audio Graph & Utilities
 */

export const readFileToArrayBuffer = (file: File): Promise<ArrayBuffer> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target?.result instanceof ArrayBuffer) {
        resolve(e.target.result);
      } else {
        reject(new Error("Failed to read file"));
      }
    };
    reader.onerror = (e) => reject(e);
    reader.readAsArrayBuffer(file);
  });
};

export const decodeAudioData = async (arrayBuffer: ArrayBuffer): Promise<AudioBuffer> => {
  const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  const buffer = await audioContext.decodeAudioData(arrayBuffer);
  // Close context to prevent hitting max limit (usually 6 in browsers)
  if (audioContext.state !== 'closed') {
    await audioContext.close();
  }
  return buffer;
};

export const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = error => reject(error);
  });
};

export const mixAudioBuffers = async (
  buffer1: AudioBuffer, 
  buffer2: AudioBuffer
): Promise<AudioBuffer> => {
  const duration = Math.max(buffer1.duration, buffer2.duration);
  const sampleRate = Math.max(buffer1.sampleRate, buffer2.sampleRate);
  const numberOfChannels = Math.max(buffer1.numberOfChannels, buffer2.numberOfChannels);

  const offlineCtx = new OfflineAudioContext(numberOfChannels, duration * sampleRate, sampleRate);

  const source1 = offlineCtx.createBufferSource();
  source1.buffer = buffer1;
  source1.connect(offlineCtx.destination);

  const source2 = offlineCtx.createBufferSource();
  source2.buffer = buffer2;
  source2.connect(offlineCtx.destination);

  source1.start(0);
  source2.start(0);

  return await offlineCtx.startRendering();
};

export const audioBufferToWav = (buffer: AudioBuffer): Blob => {
  const numOfChan = buffer.numberOfChannels;
  const length = buffer.length * numOfChan * 2 + 44;
  const bufferArray = new ArrayBuffer(length);
  const view = new DataView(bufferArray);
  const channels = [];
  let sample;
  let offset = 0;
  let pos = 0;

  function setUint16(data: number) {
    view.setUint16(pos, data, true);
    pos += 2;
  }
  function setUint32(data: number) {
    view.setUint32(pos, data, true);
    pos += 4;
  }

  setUint32(0x46464952); // "RIFF"
  setUint32(length - 8); 
  setUint32(0x45564157); // "WAVE"
  setUint32(0x20746d66); // "fmt "
  setUint32(16); 
  setUint16(1); 
  setUint16(numOfChan);
  setUint32(buffer.sampleRate);
  setUint32(buffer.sampleRate * 2 * numOfChan);
  setUint16(numOfChan * 2);
  setUint16(16);
  setUint32(0x61746164); // "data"
  setUint32(length - pos - 4);

  for (let i = 0; i < buffer.numberOfChannels; i++) {
    channels.push(buffer.getChannelData(i));
  }

  let i = 0;
  while (i < buffer.length) {
    for (let ch = 0; ch < numOfChan; ch++) {
      sample = Math.max(-1, Math.min(1, channels[ch][i])); 
      sample = (0.5 + sample < 0 ? sample * 32768 : sample * 32767) | 0; 
      view.setInt16(44 + offset, sample, true); 
      offset += 2;
    }
    i++;
  }

  return new Blob([bufferArray], { type: 'audio/wav' });
};

// --- PROXY BRIDGE UTILITY ---
export const getProxyUrl = (targetUrl: string): string => {
  // Points to the local Koa proxy defined in the Manifest
  return `http://localhost:3001?url=${encodeURIComponent(targetUrl)}`;
};

/**
 * AudioVisualizer Class
 * Used by SpectrumCanvas for individual track visualization
 */
export class AudioVisualizer {
  audioContext: AudioContext;
  analyser: AnalyserNode;
  dataArray: Uint8Array;
  source: MediaElementAudioSourceNode | null = null;

  constructor() {
    this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    this.analyser = this.audioContext.createAnalyser();
    // 4096 fftSize = 2048 frequency bins.
    // At 48kHz, bin width is ~11.7 Hz.
    this.analyser.fftSize = 4096;
    this.analyser.smoothingTimeConstant = 0.85; 
    this.dataArray = new Uint8Array(this.analyser.frequencyBinCount);
  }

  connect(audioElement: HTMLAudioElement) {
    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }
    try {
      this.source = this.audioContext.createMediaElementSource(audioElement);
      this.source.connect(this.analyser);
      this.analyser.connect(this.audioContext.destination);
    } catch (e) {
      // Element already connected
    }
  }

  drawBars(canvas: HTMLCanvasElement, color: string) {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const width = canvas.width;
    const height = canvas.height;
    
    this.analyser.getByteFrequencyData(this.dataArray);
    
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = color;
    
    // Logarithmic Scale Configuration
    const numBars = 512; 
    const barWidth = width / numBars;
    const spacer = barWidth > 2 ? 1 : 0;
    const minBin = 1; 
    const maxBin = this.analyser.frequencyBinCount - 1; 

    for (let i = 0; i < numBars; i++) {
        const startBin = Math.floor(minBin * Math.pow(maxBin / minBin, i / numBars));
        const endBin = Math.floor(minBin * Math.pow(maxBin / minBin, (i + 1) / numBars));
        
        let maxVal = 0;
        const safeEndBin = Math.max(endBin, startBin + 1);
        
        for (let j = startBin; j < safeEndBin && j < this.dataArray.length; j++) {
            if (this.dataArray[j] > maxVal) maxVal = this.dataArray[j];
        }
        
        const barHeight = (maxVal / 255) * height;
        const x = i * barWidth;
        const w = Math.max(0.5, barWidth - spacer);
        
        ctx.fillRect(x, height - barHeight, w, barHeight);
    }
  }
}

/**
 * Unified Audio Graph Class
 * Manages connections for File, Microphone, System Loopback, and Analysis
 */
export class UnifiedAudioGraph {
  audioContext: AudioContext;
  analyser: AnalyserNode;
  source: AudioNode | null = null;
  dataArray: Uint8Array;
  
  // Stream References
  activeStream: MediaStream | null = null;

  constructor() {
    this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    this.analyser = this.audioContext.createAnalyser();
    this.analyser.fftSize = 4096; // High detail
    this.analyser.smoothingTimeConstant = 0.8;
    this.dataArray = new Uint8Array(this.analyser.frequencyBinCount);
  }

  resume() {
    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }
  }

  // NODE E: Microphone Input
  async connectMicrophone(): Promise<boolean> {
    this.resume();
    this.disconnect();
    
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      console.warn("MediaDevices API or getUserMedia is not supported.");
      return false;
    }

    try {
      this.activeStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      this.source = this.audioContext.createMediaStreamSource(this.activeStream);
      this.source.connect(this.analyser);
      // NOTE: Do not connect mic to destination to avoid feedback loop
      console.log("Microphone connected to Analyser");
      return true;
    } catch (err) {
      console.error("Error accessing microphone", err);
      return false;
    }
  }

  // NODE A & D: System Audio Loopback (Spotify, Tidal, etc)
  async connectSystemAudio(): Promise<boolean> {
    this.resume();
    this.disconnect();

    if (!navigator.mediaDevices || !(navigator.mediaDevices as any).getDisplayMedia) {
        console.warn("getDisplayMedia not supported");
        return false;
    }

    try {
        // Request audio only (Note: video track often comes with it, we ignore it)
        const stream = await (navigator.mediaDevices as any).getDisplayMedia({ 
            video: true, // Often required to get audio option in browser modal
            audio: true 
        });

        const audioTrack = stream.getAudioTracks()[0];
        
        if (!audioTrack) {
            console.error("No audio track in System stream. Did user share audio?");
            stream.getTracks().forEach((t: any) => t.stop());
            return false;
        }

        this.activeStream = stream;
        this.source = this.audioContext.createMediaStreamSource(this.activeStream);
        this.source.connect(this.analyser);
        // We DO connect to destination so user can hear it, BUT...
        // The Safety Logic in App.tsx must MUTE the local <audio> element to prevent feedback
        // if this was being routed through a player.
        // For System Loopback, we generally DON'T connect back to destination to avoid "Echo",
        // as the user is already hearing the source app. We just want to ANALYZE it.
        // So: No connection to destination.
        
        console.log("System Audio connected to Analyser");
        return true;
    } catch (err) {
        console.error("Error accessing System Audio", err);
        return false;
    }
  }

  connectElement(audioElement: HTMLAudioElement) {
    this.resume();
    try {
      this.disconnect(); 
      this.source = this.audioContext.createMediaElementSource(audioElement);
      this.source.connect(this.analyser);
      this.analyser.connect(this.audioContext.destination);
    } catch(e) {
      // Element already connected
    }
  }

  disconnect() {
    if (this.source) {
      this.source.disconnect();
      this.source = null;
    }
    if (this.activeStream) {
      this.activeStream.getTracks().forEach(track => track.stop());
      this.activeStream = null;
    }
  }

  getFrequencyData(): Uint8Array {
    this.analyser.getByteFrequencyData(this.dataArray);
    return this.dataArray;
  }
  
  getAverageFrequency(): number {
    const data = this.getFrequencyData();
    let sum = 0;
    for (let i = 0; i < data.length; i++) {
      sum += data[i];
    }
    return sum / data.length;
  }
  
  getBassEnergy(): number {
    // Optimized for fftSize 4096 (bin width ~11.7Hz)
    // Range: ~10Hz (bin 1) to ~90Hz (bin 8)
    const data = this.getFrequencyData();
    let sum = 0;
    for (let i = 1; i <= 8; i++) {
       sum += data[i];
    }
    return sum / 8;
  }
}

// Global Singleton
let audioGraphInstance: UnifiedAudioGraph | null = null;
export const getAudioGraph = () => {
  if (!audioGraphInstance) {
    audioGraphInstance = new UnifiedAudioGraph();
  }
  return audioGraphInstance;
}