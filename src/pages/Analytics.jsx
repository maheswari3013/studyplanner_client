import { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import API from '../api/axios';

const Analytics = () => {
  const { user } = useContext(AuthContext);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await API.get('/schedule/stats');
        setStats(res.data);
      } catch (err) {
        console.error('Failed to load analytics:', err);
      } finally {
        setLoading(false);
      }
    };

    if (user) fetchStats();
  }, [user]);

  if (loading) return <div>Loading analytics...</div>;
  if (!stats) return <div>No data yet. Complete some study sessions first.</div>;

  const completionRate = stats.totalScheduled > 0
   ? Math.round((stats.totalCompleted / stats.totalScheduled) * 100)
    : 0;

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
      <h2>Your Study Analytics</h2>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginTop: '20px' }}>
        <div style={{ padding: '20px', border: '1px solid #ddd', borderRadius: '8px' }}>
          <h3>Scheduled</h3>
          <p style={{ fontSize: '2rem', margin: 0 }}>{stats.totalScheduled}h</p>
        </div>

        <div style={{ padding: '20px', border: '1px solid #ddd', borderRadius: '8px' }}>
          <h3>Completed</h3>
          <p style={{ fontSize: '2rem', margin: 0 }}>{stats.totalCompleted}h</p>
        </div>

        <div style={{ padding: '20px', border: '1px solid #ddd', borderRadius: '8px' }}>
          <h3>Completion Rate</h3>
          <p style={{ fontSize: '2rem', margin: 0 }}>{completionRate}%</p>
        </div>
      </div>

      <div style={{ marginTop: '30px' }}>
        <h3>Breakdown by Subject</h3>
        {Object.entries(stats.bySubject || {}).map(([subject, hours]) => (
          <div key={subject} style={{
            display: 'flex',
            justifyContent: 'space-between',
            padding: '12px 0',
            borderBottom: '1px solid #eee'
          }}>
            <span>{subject}</span>
            <span><strong>{hours}h</strong></span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Analytics;