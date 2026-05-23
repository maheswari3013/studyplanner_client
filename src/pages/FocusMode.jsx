import { useEffect, useState } from 'react';
import { X, Zap, Moon, Sun, Maximize2 } from 'lucide-react';
import StudyTimer from '../components/StudyTimer';
import '../assets/FocusMode.css';

export default function FocusMode({
  block,
  onClose,
  onComplete,
  onNeedMoreTime
}) {
  const [isDark, setIsDark] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);

    const enterFullscreen = async () => {
      try {
        if (!document.fullscreenElement) {
          await document.documentElement.requestFullscreen();
        }
      } catch (err) {
        console.log(err);
      }
    };

    enterFullscreen();

    const handleKeyDown = (e) => {
      if (e.code === 'Space') {
        e.preventDefault();
      }

      if (e.key === 'Escape') {
        e.preventDefault();

        const ok = window.confirm(
          'Exit Focus Mode? Timer will pause.'
        );

        if (ok) handleClose();
      }
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
    <div
      className={`focus-overlay ${isDark ? 'dark' : 'light'} ${
        mounted ? 'show' : ''
      }`}
    >
      <div className="focus-bg-orb orb1"></div>
      <div className="focus-bg-orb orb2"></div>
      <div className="focus-bg-grid"></div>

      <div className="focus-controls">
        <button
          className="focus-btn"
          onClick={() => setIsDark(!isDark)}
        >
          {isDark ? <Sun size={18} /> : <Moon size={18} />}
        </button>

        <button
          className="focus-btn"
          onClick={() => {
            if (!document.fullscreenElement) {
              document.documentElement.requestFullscreen();
            }
          }}
        >
          <Maximize2 size={18} />
        </button>

        <button
          className="focus-btn close-btn"
          onClick={handleClose}
        >
          <X size={18} />
        </button>
      </div>

      <div className="focus-content">
        <div className="focus-header">
          <div className="focus-logo">
            <Zap size={26} />
          </div>

          <div>
            <h1 className="focus-title">Deep Focus</h1>
            <p className="focus-subtitle">
              Stay locked in. One task at a time.
            </p>
          </div>
        </div>

        <div
          className="focus-timer-card"
          style={{
            borderTop: `4px solid ${block.color || '#6366f1'}`
          }}
        >
          <StudyTimer
            block={block}
            onComplete={(id) => {
              onComplete(id);
              handleClose();
            }}
            onNeedMoreTime={(id, duration) =>
              onNeedMoreTime(id, duration)
            }
            onClose={handleClose}
          />
        </div>

        <div className="focus-footer">
          <span>ESC to exit</span>
        </div>
      </div>
    </div>
  );
}