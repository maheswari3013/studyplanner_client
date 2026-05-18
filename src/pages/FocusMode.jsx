import { useEffect, useState } from 'react';
import { X, Zap, Moon, Sun } from 'lucide-react';
import StudyTimer from '../components/StudyTimer';
import '../assets/FocusMode.css';

export default function FocusMode({ block, onClose, onComplete, onNeedMoreTime }) {
  const [isDark, setIsDark] = useState(true);

  useEffect(() => {
    const enterFullscreen = async () => {
      try {
        await document.documentElement.requestFullscreen();
      } catch (err) {
        console.log('Fullscreen not supported:', err);
      }
    };
    enterFullscreen();

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') handleClose();
    };
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      if (document.fullscreenElement) {
        document.exitFullscreen();
      }
    };
  }, []);

  const handleClose = () => {
    if (document.fullscreenElement) {
      document.exitFullscreen();
    }
    onClose();
  };

  return (
    <div className={`focus-overlay ${isDark ? 'dark' : 'light'}`}>
      <div className="focus-particles" />

      <div className="focus-controls">
        <button
          onClick={() => setIsDark(!isDark)}
          className="focus-btn theme-btn"
          title={isDark ? 'Light mode' : 'Dark mode'}
        >
          {isDark ? <Sun size={20} /> : <Moon size={20} />}
        </button>

        <button
          onClick={handleClose}
          className="focus-btn close-btn"
          title="Exit (ESC)"
        >
          <X size={20} />
        </button>
      </div>

      <div className="focus-content">
        <div className="focus-header">
          <div className="focus-logo">
            <Zap size={24} />
          </div>
          <h2 className="focus-title">Focus Mode</h2>
        </div>

        <div className="focus-timer-card">
          <StudyTimer
            block={block}
            onComplete={(id) => {
              onComplete(id);
              handleClose();
            }}
            onNeedMoreTime={onNeedMoreTime}
            onClose={handleClose}
          />
        </div>

        <p className="focus-hint">
          Press <kbd>ESC</kbd> to exit
        </p>
      </div>
    </div>
  );
}