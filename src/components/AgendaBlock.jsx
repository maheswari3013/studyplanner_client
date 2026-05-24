import dayjs from 'dayjs';
import { AlertTriangle, BookOpen, Check, ClockIcon, Coffee, Edit2, FileWarning, Maximize2, Play, X } from 'lucide-react';
import StudyTimer from './StudyTimer';

export default function AgendaBlock({
  block,
  overdue,
  isCompleting,
  onEdit,
  onDelete,
  onStartTimer,
  onFocus,
  onComplete,
  onMissed,
  onPending,
  isTimerActive,
  onNeedMoreTime,
  onCloseTimer
}) {
  const isBreak = block.isBreak || block.type === 'Break';
  const isCompleted = block.completed;
  const isMissed = block.missed || block.status === 'missed';
  const isPending =!isCompleted &&!isMissed;
  const isStudyOrReview = block.type === 'Study' || block.type === 'Review';
  const Icon = block.isExam? FileWarning : isBreak? Coffee : BookOpen;

  return (
    <div className={`block-card ${isBreak? 'break-block' : 'study-block'} ${isBreak? 'break' : ''} ${isCompleted? 'completed' : ''} ${isMissed? 'missed' : ''} ${overdue &&!isMissed? 'overdue' : ''}`}>
      <div className="block-card-header">
        <div className="block-card-content">
          <h3>
            <Icon size={18} /> {block.subject} - {block.topic}
          </h3>
          <p className="block-meta">
            <span><b>Type:</b> {block.type}</span>
            <span><b>Duration:</b> {block.duration} min</span>
            <span><b>Time:</b> {block.time}</span>
          </p>
          {block.status === 'missed' && (
            <div className="p-2 bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 rounded mb-2">
              <div className="text-sm text-red-700 dark:text-red-400 font-medium">
                Missed: {dayjs(block.originalStartTime || block.startTime).format('HH:mm')}
              </div>
              <div className="text-xs text-red-600 dark:text-red-500">Auto-rescheduled to next available slot</div>
            </div>
          )}
          {block.status === 'makeup' && (
            <div className="p-2 bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-500 rounded mb-2">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm text-blue-700 dark:text-blue-400 font-medium">{block.title}</span>
                {block.isRescheduled && (
                  <span className="text-xs bg-blue-600 dark:bg-blue-500 text-white px-2 py-0.5 rounded">Rescheduled</span>
                )}
              </div>
              {block.originalStartTime && (
                <div className="text-xs text-blue-600 dark:text-blue-500">
                  Makeup for missed block at {dayjs(block.originalStartTime).format('HH:mm')}
                </div>
              )}
            </div>
          )}
          {block.status === 'overdue' && block.originalStartTime && (
            <div className="text-sm text-yellow-600 dark:text-yellow-400 font-medium">
              Overdue: {dayjs(block.originalStartTime).format('HH:mm')}
            </div>
          )}
          {block.topic?.includes('Makeup') && <span className="makeup-badge">Makeup Session</span>}
          {overdue &&!isMissed && <span className="overdue-badge"><AlertTriangle size={14} /> Overdue</span>}
          {isMissed && <span className="missed-badge"><X size={14} /> Missed - Rescheduled</span>}
        </div>
        <div className="block-card-controls">
          <button className="edit-btn" onClick={() => onEdit(block)} aria-label="Edit block">
            <Edit2 size={16} />
          </button>
          <button className="delete-btn" onClick={() => onDelete(block._id)} aria-label="Delete block">
            <X size={16} />
          </button>
        </div>
      </div>

      <div className="block-actions">
        {isPending && isStudyOrReview && (
          <>
            <button onClick={() => onStartTimer(block)} className="btn-start">
              <Play size={16} /> Start Timer
            </button>
            <button onClick={() => onFocus(block)} className="btn-focus">
              <Maximize2 size={16} /> Focus
            </button>
            <button onClick={() => onComplete(block._id)} disabled={isCompleting} className="btn-complete">
              <Check size={16} /> {isCompleting? 'Processing...' : 'Complete'}
            </button>
            <button onClick={() => onMissed(block._id)} disabled={isCompleting} className="btn-missed">
              <X size={16} /> {isCompleting? 'Processing...' : 'Missed'}
            </button>
          </>
        )}

        {isCompleted && (
          <>
            <span className="status-badge completed"><Check size={16} /> Completed</span>
            <button onClick={() => onPending(block._id)} className="btn-pending">
              <ClockIcon size={16} /> Set Pending
            </button>
          </>
        )}

        {isMissed && (
          <>
            <span className="status-badge missed"><X size={16} /> Missed</span>
            <button onClick={() => onPending(block._id)} className="btn-pending">
              <ClockIcon size={16} /> Undo Missed
            </button>
          </>
        )}
      </div>

      {isTimerActive && (
        <StudyTimer
          block={block}
          onComplete={onComplete}
          onNeedMoreTime={onNeedMoreTime}
          onClose={onCloseTimer}
        />
      )}
    </div>
  );
}