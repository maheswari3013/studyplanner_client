import { useContext } from 'react';
import { AuthContext } from '../context/AuthContext';

const Settings = () => {
  const { user } = useContext(AuthContext);

  return (
    <div style={{ maxWidth: '600px', margin: '0 auto' }}>
      <h2>Settings</h2>
      <div style={{ padding: '20px', border: '1px solid #ddd', borderRadius: '8px' }}>
        <p><strong>Name:</strong> {user?.name}</p>
        <p><strong>Email:</strong> {user?.email}</p>
        <p style={{ color: '#888', marginTop: '20px' }}>
          More settings coming soon.
        </p>
      </div>
    </div>
  );
};

export default Settings;