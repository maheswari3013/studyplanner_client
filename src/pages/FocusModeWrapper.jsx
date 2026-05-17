import { useLocation, useNavigate } from 'react-router-dom';
import FocusMode from './FocusMode';
import { useEffect } from 'react';

export default function FocusModeWrapper() {
  const location = useLocation();
  const navigate = useNavigate();
  const block = location.state?.block;

  useEffect(() => {
    if (!block) {
      navigate('/agenda'); // Redirect if no block passed
    }
  }, [block, navigate]);

  if (!block) return null;

  return (
    <FocusMode
      block={block}
      onClose={() => navigate('/agenda')}
      onComplete={() => navigate('/agenda')}
      onNeedMoreTime={() => {}} // Handle if needed
    />
  );
}