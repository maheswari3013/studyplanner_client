import { useState, useEffect } from 'react';
import { Play, Pause, RotateCcw, CheckCircle, X } from 'lucide-react';
import '../assets/StudyTimer.css';

export default function StudyTimer({ block, onComplete, onNeedMoreTime, onClose }) {
  const [secondsLeft, setSecondsLeft] = useState(block.duration * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [prevDuration, setPrevDuration] = useState(block.duration);

  const totalSeconds = block.duration * 60;
  const progress = ((totalSeconds - secondsLeft) / totalSeconds) * 100;
  const isBreak = block.isBreak;

  // Adjust timer state when block duration is extended (e.g. +15 min)
  useEffect(() => {
    if (block.duration !== prevDuration) {
      const diff = block.duration - prevDuration;
      setSecondsLeft(prev => Math.max(0, prev + diff * 60));
      setPrevDuration(block.duration);
    }
  }, [block.duration, prevDuration]);

  // Restore from localStorage
  useEffect(() => {
    const saved = localStorage.getItem(`timer_${block._id}`);
    if (saved) setSecondsLeft(parseInt(saved));
  }, [block._id]);

  // Save to localStorage
  useEffect(() => {
    localStorage.setItem(`timer_${block._id}`, secondsLeft);
    if (secondsLeft === 0) localStorage.removeItem(`timer_${block._id}`);
  }, [secondsLeft, block._id]);

  // Auto-pause when tab hidden
  useEffect(() => {
    const handleVisibility = () => {
      if (document.hidden && isRunning) setIsRunning(false);
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [isRunning]);

  useEffect(() => {
    let interval;
    if (isRunning && secondsLeft > 0) {
      interval = setInterval(() => {
        setSecondsLeft(prev => prev - 1);
      }, 1000);
    } else if (secondsLeft === 0 && isRunning) {
      setIsRunning(false);
      new Audio('/notification.mp3').play().catch(() => {});
      onComplete(block._id);
    }
    return () => clearInterval(interval);
  }, [isRunning, secondsLeft, block._id, onComplete]);

  const formatTime = (secs) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const handleReset = () => {
    setSecondsLeft(block.duration * 60);
    setIsRunning(false);
  };

  return (
    <div className="timer-container">
      {onClose && (
        <button onClick={onClose} className="timer-close-btn" title="Close timer">
          <X size={20} />
        </button>
      )}

      <div className="timer-header">
        <p className={`timer-label ${isBreak? 'break' : ''}`}>
          {isBreak? 'Break Time' : block.subject}
        </p>
        <h3 className="timer-topic">{block.topic}</h3>
      </div>

      <div className="timer-progress-wrap">
        <svg className="timer-svg" width="220" height="220">
          <defs>
            <linearGradient id="studyGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#667eea" />
              <stop offset="100%" stopColor="#764ba2" />
            </linearGradient>
            <linearGradient id="breakGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#10b981" />
              <stop offset="100%" stopColor="#059669" />
            </linearGradient>
          </defs>
          <circle
            cx="110" cy="110" r="100"
            className="timer-circle-bg"
          />
          <circle
            cx="110" cy="110" r="100"
            className={`timer-circle-fg ${isBreak? 'break' : 'study'}`}
            strokeDasharray={2 * Math.PI * 100}
            strokeDashoffset={2 * Math.PI * 100 * (1 - progress / 100)}
          />
        </svg>
        <div className="timer-time-display">
          <span className="timer-time">{formatTime(secondsLeft)}</span>
          <span className="timer-status">{isRunning? 'Running' : 'Paused'}</span>
        </div>
      </div>

      <div className="timer-controls">
        <button
          onClick={() => setIsRunning(!isRunning)}
          className={`timer-btn timer-btn-play ${isBreak? 'break' : ''}`}
          title={isRunning? 'Pause' : 'Play'}
        >
          {isRunning? <Pause size={24} /> : <Play size={24} />}
        </button>
        <button
          onClick={handleReset}
          className="timer-btn timer-btn-reset"
          title="Reset"
        >
          <RotateCcw size={24} />
        </button>
        {!isBreak && (
          <button
            onClick={() => onNeedMoreTime(block._id, block.duration)}
            className="timer-btn timer-btn-more"
          >
            +15 min
          </button>
        )}
      </div>
    </div>
  );
}