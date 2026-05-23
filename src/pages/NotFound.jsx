import { useNavigate } from 'react-router-dom';
import { Home, ArrowLeft, SearchX } from 'lucide-react';
import '../assets/NotFound.css';

export default function NotFound() {
  const navigate = useNavigate();

  return (
    <div className="notfound-container">
      <div className="notfound-content">
        <div className="notfound-icon">
          <SearchX size={80} />
        </div>

        <h1 className="notfound-title">404</h1>
        <h2 className="notfound-subtitle">Page Not Found</h2>

        <p className="notfound-text">
          The page you're looking for doesn't exist or has been moved.
        </p>

        <div className="notfound-actions">
          <button
            onClick={() => navigate(-1)}
            className="btn-notfound btn-secondary"
          >
            <ArrowLeft size={18} />
            Go Back
          </button>

          <button
            onClick={() => navigate('/dashboard')}
            className="btn-notfound btn-primary"
          >
            <Home size={18} />
            Back to Dashboard
          </button>
        </div>
      </div>
    </div>
  );
}