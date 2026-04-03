import { useState, useEffect, useRef, useCallback } from 'react';
import { saveSession } from '../api/client';

const WORK_DURATION = 25 * 60;   
const BREAK_DURATION = 5 * 60;  

const usePomodoro = () => {
  const [phase, setPhase] = useState('idle');     
  const [secondsLeft, setSecondsLeft] = useState(WORK_DURATION);
  const [pomodoroCount, setPomodoroCount] = useState(0);
  const [label, setLabel] = useState('');
  const [sessions, setSessions] = useState([]);
  const [saving, setSaving] = useState(false);

  const intervalRef = useRef(null);
  const startedAtRef = useRef(null);

  const clearTimer = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  const persistSession = useCallback(async (startedAt, endedAt, minutes) => {
    setSaving(true);
    try {
      const saved = await saveSession({
        label: label || 'Focus session',
        started_at: startedAt.toISOString(),
        ended_at: endedAt.toISOString(),
        duration_minutes: minutes,
        pomodoro_count: pomodoroCount + 1,
      });
      setSessions((prev) => [saved, ...prev]);
    } catch (err) {
      console.error('Failed to save session:', err);
    } finally {
      setSaving(false);
    }
  }, [label, pomodoroCount]);

  useEffect(() => {
    if (phase === 'idle' || phase === 'done') {
      clearTimer();
      return;
    }

    intervalRef.current = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          if (phase === 'work') {
            const endedAt = new Date();
            persistSession(startedAtRef.current, endedAt, 25);
            setPomodoroCount((c) => c + 1);
            setPhase('break');
            return BREAK_DURATION;
          } else {
            setPhase('work');
            startedAtRef.current = new Date();
            return WORK_DURATION;
          }
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearTimer();
  }, [phase, persistSession]);

  const start = () => {
    startedAtRef.current = new Date();
    setPhase('work');
    setSecondsLeft(WORK_DURATION);
  };

  const pause = () => {
    clearTimer();
    setPhase('idle');
  };

  const reset = () => {
    clearTimer();
    setPhase('idle');
    setSecondsLeft(WORK_DURATION);
    setPomodoroCount(0);
    startedAtRef.current = null;
  };

  const skipBreak = () => {
    setPhase('work');
    startedAtRef.current = new Date();
    setSecondsLeft(WORK_DURATION);
  };

  // Format seconds as MM:SS
  const formatTime = (secs) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const progress = phase === 'work'
    ? ((WORK_DURATION - secondsLeft) / WORK_DURATION) * 100
    : ((BREAK_DURATION - secondsLeft) / BREAK_DURATION) * 100;

  return {
    phase,
    timeDisplay: formatTime(secondsLeft),
    progress,
    pomodoroCount,
    label,
    setLabel,
    sessions,
    setSessions,
    saving,
    start,
    pause,
    reset,
    skipBreak,
  };
};

export default usePomodoro;