import { useRef, useEffect, useState, useCallback } from 'react';

const VIBES = {
  lofi: {
    workFreq: 40,       
    workNoiseColor: 0.8, 
    breakFreq: 8,       
    breakNoiseColor: 0.6,
    label: 'Lo-fi focus',
  },
  rain: {
    workFreq: 14,
    workNoiseColor: 0.5,
    breakFreq: 6,
    breakNoiseColor: 0.4,
    label: 'Rain',
  },
  deep: {
    workFreq: 40,
    workNoiseColor: 1.0, 
    breakFreq: 4,
    breakNoiseColor: 0.9,
    label: 'Deep focus',
  },
  nature: {
    workFreq: 10,
    workNoiseColor: 0.3, 
    breakFreq: 5,
    breakNoiseColor: 0.2,
    label: 'Nature',
  },
};

const createNoiseNode = (ctx, colorFactor) => {

  const bufferSize = ctx.sampleRate * 2;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);

  let lastOut = 0;
  for (let i = 0; i < bufferSize; i++) {
    const white = Math.random() * 2 - 1;
    
    lastOut = (lastOut + 0.02 * white) / 1.02;
    data[i] = white * (1 - colorFactor) + lastOut * colorFactor * 3.5;
  }

  const source = ctx.createBufferSource();
  source.buffer = buffer;
  source.loop = true;
  return source;
};

const createBinauralBeat = (ctx, baseFreq, beatFreq) => {
  
  const left = ctx.createOscillator();
  const right = ctx.createOscillator();
  const merger = ctx.createChannelMerger(2);

  left.frequency.value = baseFreq;
  right.frequency.value = baseFreq + beatFreq;
  left.type = 'sine';
  right.type = 'sine';

  left.connect(merger, 0, 0);
  right.connect(merger, 0, 1);

  return { left, right, merger };
};

const useAudioEngine = (phase) => {
  const [playing, setPlaying] = useState(false);
  const [volume, setVolume] = useState(0.4);
  const [muted, setMuted] = useState(false);
  const [vibe, setVibe] = useState('lofi');
  const [analyserData, setAnalyserData] = useState(new Uint8Array(64));

  const ctxRef = useRef(null);
  const nodesRef = useRef({});
  const masterGainRef = useRef(null);
  const analyserRef = useRef(null);
  const animFrameRef = useRef(null);
  const prevPhaseRef = useRef(phase);

  const stopAll = useCallback(() => {
    const nodes = nodesRef.current;
    try {
      nodes.noise?.stop();
      nodes.binauralLeft?.stop();
      nodes.binauralRight?.stop();
    } catch {}
    nodesRef.current = {};
  }, []);

  const buildGraph = useCallback((ctx, phaseType, vibeKey) => {
    const config = VIBES[vibeKey];
    const isWork = phaseType === 'work';

    const master = ctx.createGain();
    master.gain.value = muted ? 0 : volume;
    masterGainRef.current = master;

    const analyser = ctx.createAnalyser();
    analyser.fftSize = 128;
    analyserRef.current = analyser;

    const noise = createNoiseNode(
      ctx,
      isWork ? config.workNoiseColor : config.breakNoiseColor
    );
    const noiseGain = ctx.createGain();
    noiseGain.gain.value = 0.6;

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = isWork ? 1200 : 800;
    filter.Q.value = 0.5;

    noise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(analyser);

    const baseFreq = isWork ? 200 : 150;
    const beatFreq = isWork ? config.workFreq : config.breakFreq;
    const { left, right, merger } = createBinauralBeat(ctx, baseFreq, beatFreq);
    const binauralGain = ctx.createGain();
    binauralGain.gain.value = 0.08; 

    merger.connect(binauralGain);
    binauralGain.connect(analyser);

    const lfo = ctx.createOscillator();
    const lfoGain = ctx.createGain();
    lfo.frequency.value = 0.1; 
    lfoGain.gain.value = 0.05;
    lfo.connect(lfoGain);
    lfoGain.connect(noiseGain.gain);
    lfo.start();

    analyser.connect(master);
    master.connect(ctx.destination);

    noise.start();
    left.start();
    right.start();

    nodesRef.current = {
      noise,
      binauralLeft: left,
      binauralRight: right,
      lfo,
    };

 
    master.gain.setValueAtTime(0, ctx.currentTime);
    master.gain.linearRampToValueAtTime(
      muted ? 0 : volume,
      ctx.currentTime + 1.5
    );
  }, [volume, muted]);


  const startVisualizer = useCallback(() => {
    const tick = () => {
      if (!analyserRef.current) return;
      const data = new Uint8Array(analyserRef.current.frequencyBinCount);
      analyserRef.current.getByteFrequencyData(data);
      setAnalyserData(new Uint8Array(data));
      animFrameRef.current = requestAnimationFrame(tick);
    };
    animFrameRef.current = requestAnimationFrame(tick);
  }, []);

  const stopVisualizer = useCallback(() => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
  }, []);

  const start = useCallback(async () => {
    if (!ctxRef.current) {
      ctxRef.current = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (ctxRef.current.state === 'suspended') {
      await ctxRef.current.resume();
    }
    stopAll();
    buildGraph(ctxRef.current, phase, vibe);
    startVisualizer();
    setPlaying(true);
  }, [phase, vibe, stopAll, buildGraph, startVisualizer]);

  const stop = useCallback(() => {
    stopAll();
    stopVisualizer();
    setPlaying(false);
    setAnalyserData(new Uint8Array(64));
  }, [stopAll, stopVisualizer]);


  useEffect(() => {
    if (prevPhaseRef.current === phase) return;
    prevPhaseRef.current = phase;

    if (playing && (phase === 'work' || phase === 'break')) {
      if (masterGainRef.current && ctxRef.current) {
        masterGainRef.current.gain.linearRampToValueAtTime(
          0,
          ctxRef.current.currentTime + 0.8
        );
        setTimeout(() => {
          stopAll();
          buildGraph(ctxRef.current, phase, vibe);
        }, 900);
      }
    }

    if (phase === 'idle' || phase === 'paused') {
      if (playing) stop();
    }
  }, [phase, playing, vibe, stopAll, buildGraph, stop]);


  useEffect(() => {
    if (masterGainRef.current && ctxRef.current) {
      masterGainRef.current.gain.linearRampToValueAtTime(
        muted ? 0 : volume,
        ctxRef.current.currentTime + 0.1
      );
    }
  }, [volume, muted]);


  useEffect(() => {
    return () => {
      stopAll();
      stopVisualizer();
      ctxRef.current?.close();
    };
  }, []);

  const toggleMute = () => setMuted((m) => !m);

  const changeVibe = (newVibe) => {
    setVibe(newVibe);
    if (playing && ctxRef.current) {
      stopAll();
      buildGraph(ctxRef.current, phase, newVibe);
    }
  };

  return {
    playing,
    volume,
    setVolume,
    muted,
    toggleMute,
    vibe,
    changeVibe,
    analyserData,
    vibes: VIBES,
    start,
    stop,
  };
};

export default useAudioEngine;