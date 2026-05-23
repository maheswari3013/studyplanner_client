import { useLocation, useNavigate } from 'react-router-dom';
import FocusMode from './FocusMode';
import API from '../api/axios';
import { useEffect } from 'react';
import toast from 'react-hot-toast';

export default function FocusModeWrapper() {
  const location = useLocation();
  const navigate = useNavigate();
  const block = location.state?.block;

  useEffect(() => {
    if (!block) {
      navigate('/agenda');
    }
  }, [block, navigate]);

  if (!block) return null;

  const handleComplete = async (id) => {
    try {
      await API.patch(`/schedule/${id}/complete`);
      toast.success('Block completed!');
      navigate('/agenda');
    } catch (err) {
      if (err.response?.status === 404) {
        toast('Schedule was regenerated. Refreshing...');
        navigate('/agenda');
      } else {
        toast.error('Failed to mark complete');
      }
    }
  };

  const handleNeedMoreTime = async (id, currentDuration) => {
    try {
      await API.patch(`/schedule/${id}`, {
        duration: currentDuration + 15
      });
      toast.success('+15 minutes added');
      const res = await API.get(`/schedule/today`);
      const updatedBlock = res.data.find(b => b._id === id);
      if (updatedBlock) {
        navigate('/focus', { state: { block: updatedBlock }, replace: true });
      }
    } catch (err) {
      toast.error('Failed to add time');
    }
  };

  return (
    <FocusMode
      block={block}
      onClose={() => navigate('/agenda')}
      onComplete={handleComplete}
      onNeedMoreTime={handleNeedMoreTime}
    />
  );
}