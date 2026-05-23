import dayjs from 'dayjs';
import { AlertTriangle, BookOpen, Check, ClockIcon, Coffee, Edit2, FileWarning, Maximize2, Play, X } from 'lucide-react';

const statusColors = {
  completed: 'bg-green-500/20 border-green-500',
  missed: 'bg-red-500/20 border-red-500',
  overdue: 'bg-yellow-500/20 border-yellow-500'
};

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
  onPending
}) {
  const isBreak = block.isBreak || block.type === 'Break';
  const isCompleted = block.completed;
  const isMissed = block.missed;
  const isPending = !isCompleted && !isMissed;
  const isStudyOrReview = block.type === 'Study' || block.type === 'Review';
  const blockTypeClass = isBreak ? 'break-block' : 'study-block';
  const statusClass = isCompleted
    ? statusColors.completed
    : isMissed
      ? statusColors.missed
      : overdue
        ? statusColors.overdue
        : '';
  const Icon = block.isExam ? FileWarning : isBreak ? Coffee : BookOpen;

  return (
    <div className={`block-card ${blockTypeClass} ${isBreak ? 'break' : ''} ${isCompleted ? 'completed' : ''} ${isMissed ? 'missed' : ''} ${overdue && !isMissed ? 'overdue' : ''} ${statusClass}`}>
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
          {block.status === 'missed' && block.originalStartTime && (
            <div className="text-sm text-red-600 font-medium">
              Missed: {dayjs(block.originalStartTime).format('HH:mm')}
            </div>
          )}
          {block.status === 'overdue' && block.originalStartTime && (
            <div className="text-sm text-yellow-600 font-medium">
              Overdue: {dayjs(block.originalStartTime).format('HH:mm')}
            </div>
          )}
          {block.status === 'makeup' && block.originalStartTime && (
            <div className="text-sm text-blue-600 font-medium">
              Makeup for: {dayjs(block.originalStartTime).format('HH:mm')}
            </div>
          )}
          {block.topic?.includes('Makeup') && <span className="makeup-badge">Makeup Session</span>}
          {overdue && !isMissed && <span className="overdue-badge"><AlertTriangle size={14} /> Overdue</span>}
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
              <Check size={16} /> {isCompleting ? 'Processing...' : 'Complete'}
            </button>
            <button onClick={() => onMissed(block._id)} disabled={isCompleting} className="btn-missed">
              <X size={16} /> {isCompleting ? 'Processing...' : 'Missed'}
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
    </div>
  );
}
