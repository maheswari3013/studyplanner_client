import { useLocation, useNavigate } from 'react-router-dom';
import { useEffect, useState, useCallback } from 'react';
import toast from 'react-hot-toast';

import FocusMode from './FocusMode';
import API from '../api/axios';

export default function FocusModeWrapper() {
  const location = useLocation();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);

  // Get block from route state
  const block = location.state?.block;

  // Redirect if no block
  useEffect(() => {
    if (!block) {
      toast.error('No study block found');
      navigate('/agenda', { replace: true });
    }
  }, [block, navigate]);

  // Save active session
  useEffect(() => {
    if (block) {
      sessionStorage.setItem(
        'activeFocusBlock',
        JSON.stringify(block)
      );
    }

    return () => {
      sessionStorage.removeItem('activeFocusBlock');
    };
  }, [block]);

  // COMPLETE BLOCK
  const handleComplete = useCallback(
    async (id) => {
      try {
        setLoading(true);

        await API.patch(`/schedule/${id}/complete`);

        toast.success('Study session completed');

        sessionStorage.removeItem('activeFocusBlock');

        navigate('/agenda', {
          replace: true
        });
      } catch (err) {
        console.error(err);

        if (err.response?.status === 404) {
          toast('Schedule changed. Refreshing...');
        } else {
          toast.error(
            err.response?.data?.msg ||
              'Failed to complete block'
          );
        }

        navigate('/agenda', {
          replace: true
        });
      } finally {
        setLoading(false);
      }
    },
    [navigate]
  );

  // ADD EXTRA TIME
  const handleNeedMoreTime = useCallback(
    async (id, currentDuration) => {
      try {
        setLoading(true);

        const newDuration = currentDuration + 15;

        await API.patch(`/schedule/${id}`, {
          duration: newDuration
        });

        toast.success('+15 minutes added');

        // Fetch updated block
        const res = await API.get('/schedule/today');

        const updatedBlock = res.data.find(
          (b) => b._id === id
        );

        if (!updatedBlock) {
          toast.error('Updated block not found');
          return;
        }

        // Replace state without reload
        navigate('/focus', {
          replace: true,
          state: {
            block: updatedBlock
          }
        });
      } catch (err) {
        console.error(err);

        toast.error(
          err.response?.data?.msg ||
            'Failed to extend session'
        );
      } finally {
        setLoading(false);
      }
    },
    [navigate]
  );

  // CLOSE FOCUS MODE
  const handleClose = () => {
    sessionStorage.removeItem('activeFocusBlock');

    navigate('/agenda', {
      replace: true
    });
  };

  if (!block) return null;

  return (
    <FocusMode
      block={block}
      loading={loading}
      onClose={handleClose}
      onComplete={handleComplete}
      onNeedMoreTime={handleNeedMoreTime}
    />
  );
}