import { useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import { BarChart3 } from 'lucide-react';

import { subscribeUser } from '../utils/pushNotifications';

const Settings = () => {
  const { user } = useContext(AuthContext);
  const [pushEnabled, setPushEnabled] = useState(false);

  const handlePushToggle = async () => {
    if (!pushEnabled) {
      await subscribeUser();
      setPushEnabled(true);
      toast.success('Notifications enabled');
    } else {
      await API.delete('/notifications/unsubscribe');
      setPushEnabled(false);
      toast.success('Notifications disabled');
    }
  };

  return (
    <div style={{ maxWidth: '600px', margin: '0 auto' }}>
      <h2>Settings</h2>
      <div style={{ padding: '20px', border: '1px solid #ddd', borderRadius: '8px' }}>
        <p><strong>Name:</strong> {user?.name}</p>
        <p><strong>Email:</strong> {user?.email}</p>

        <div style={{ marginTop: '20px' }}>
          <label>
            <input
              type="checkbox"
              checked={pushEnabled}
              onChange={handlePushToggle}
            />
            Enable Daily Study Reminders
          </label>
        </div>

        <p style={{ color: '#888', marginTop: '20px' }}>
          More settings coming soon.
        </p>
      </div>
    </div>
  );
};

export default Settings;