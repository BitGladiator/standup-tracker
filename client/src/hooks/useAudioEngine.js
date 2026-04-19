import { useRef, useEffect, useState, useCallback } from 'react';

const TRACKS = {
  lofi: {
    label: 'Lo-fi',
    work: '/audio/lofi-work.mp3',
    break: '/audio/lofi-break.mp3',
  },
  rain: {
    label: 'Rain',
    work: '/audio/rain-work.mp3',
    break: '/audio/rain-break.mp3',
  },
  deepfocus: {
    label: 'Deep focus',
    work: '/audio/deep-focus-work.mp3',
    break: '/audio/deep-focus-break.mp3',
  },
  nature: {
    label: 'Nature',
    work: '/audio/nature-work.mp3',
    break: '/audio/nature-break.mp3',
  },
};

const useAudioEngine = (phase) => {
  const [playing, setPlaying] = useState(false);
  const [volume, setVolume] = useState(0.5);
  const [muted, setMuted] = useState(false);
  const [vibe, setVibe] = useState('lofi');
  const [loading, setLoading] = useState(false);
  const [analyserData, setAnalyserData] = useState(new Uint8Array(64));

  const audioRef = useRef(null);
  const ctxRef = useRef(null);
  const sourceRef = useRef(null);
  const analyserRef = useRef(null);
  const gainRef = useRef(null);
  const animFrameRef = useRef(null);
  const prevPhaseRef = useRef(phase);
  const vibeRef = useRef(vibe);


  useEffect(() => { vibeRef.current = vibe; }, [vibe]);

  const getTrackUrl = useCallback((phaseType, vibeKey) => {
    const track = TRACKS[vibeKey];
    if (!track) return null;
    return phaseType === 'work' ? track.work : track.break;
  }, []);

  const stopVisualizer = useCallback(() => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
  }, []);

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

  const setupAudioGraph = useCallback((audioEl) => {
   
    if (!ctxRef.current) {
      ctxRef.current = new (window.AudioContext || window.webkitAudioContext)();
    }

    const ctx = ctxRef.current;


    try { sourceRef.current?.disconnect(); } catch {}

    
    const source = ctx.createMediaElementSource(audioEl);
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 128;
    analyser.smoothingTimeConstant = 0.8;

    const gainNode = ctx.createGain();
    gainNode.gain.value = muted ? 0 : volume;

    source.connect(analyser);
    analyser.connect(gainNode);
    gainNode.connect(ctx.destination);

    sourceRef.current = source;
    analyserRef.current = analyser;
    gainRef.current = gainNode;
  }, [volume, muted]);

  const loadAndPlay = useCallback(async (phaseType, vibeKey) => {
    const url = getTrackUrl(phaseType, vibeKey);
    if (!url) return;

    setLoading(true);

  
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = '';
    }

    const audio = new Audio();
    audio.loop = true;
    audio.volume = 1; 
    audio.src = url;
    audioRef.current = audio;

 
    setupAudioGraph(audio);

    if (ctxRef.current?.state === 'suspended') {
      await ctxRef.current.resume();
    }

    try {
      await audio.play();
      setPlaying(true);
      setLoading(false);
      startVisualizer();
    } catch (err) {
      console.error('Playback failed:', err);
      setLoading(false);
    }
  }, [getTrackUrl, setupAudioGraph, startVisualizer]);

  const start = useCallback(async () => {
    const currentPhase = phase === 'work' || phase === 'break' ? phase : 'work';
    await loadAndPlay(currentPhase, vibeRef.current);
  }, [phase, loadAndPlay]);

  const stop = useCallback(() => {
    if (audioRef.current) {
      if (gainRef.current && ctxRef.current) {
        gainRef.current.gain.linearRampToValueAtTime(
          0, ctxRef.current.currentTime + 0.5
        );
        setTimeout(() => {
          audioRef.current?.pause();
          setPlaying(false);
          setAnalyserData(new Uint8Array(64));
          stopVisualizer();
        }, 600);
      } else {
        audioRef.current.pause();
        setPlaying(false);
        stopVisualizer();
      }
    }
  }, [stopVisualizer]);


  useEffect(() => {
    if (prevPhaseRef.current === phase) return;
    prevPhaseRef.current = phase;

    if (playing) {
      if (phase === 'work' || phase === 'break') {

        if (gainRef.current && ctxRef.current) {
          gainRef.current.gain.linearRampToValueAtTime(
            0, ctxRef.current.currentTime + 0.8
          );
          setTimeout(() => {
            loadAndPlay(phase, vibeRef.current);
          }, 900);
        } else {
          loadAndPlay(phase, vibeRef.current);
        }
      } else if (phase === 'idle' || phase === 'paused') {
        stop();
      }
    }
  }, [phase, playing, loadAndPlay, stop]);


  useEffect(() => {
    if (gainRef.current && ctxRef.current) {
      gainRef.current.gain.linearRampToValueAtTime(
        muted ? 0 : volume,
        ctxRef.current.currentTime + 0.1
      );
    }
    if (audioRef.current && !gainRef.current) {
      audioRef.current.volume = muted ? 0 : volume;
    }
  }, [volume, muted]);


  useEffect(() => {
    return () => {
      audioRef.current?.pause();
      stopVisualizer();
      ctxRef.current?.close();
    };
  }, [stopVisualizer]);

  const toggleMute = useCallback(() => setMuted((m) => !m), []);

  const changeVibe = useCallback(async (newVibe) => {
    setVibe(newVibe);
    vibeRef.current = newVibe;
    if (playing) {
      const currentPhase = phase === 'work' || phase === 'break' ? phase : 'work';
      if (gainRef.current && ctxRef.current) {
        gainRef.current.gain.linearRampToValueAtTime(
          0, ctxRef.current.currentTime + 0.4
        );
        setTimeout(() => loadAndPlay(currentPhase, newVibe), 500);
      } else {
        loadAndPlay(currentPhase, newVibe);
      }
    }
  }, [playing, phase, loadAndPlay]);

  return {
    playing,
    loading,
    volume,
    setVolume,
    muted,
    toggleMute,
    vibe,
    changeVibe,
    analyserData,
    vibes: TRACKS,
    start,
    stop,
  };
};

export default useAudioEngine;