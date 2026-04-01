import { useAuth } from '../hooks/useAuth';
import { logout } from '../api/client';

const Dashboard = () => {
  const { user, setUser } = useAuth();

  const handleLogout = async () => {
    await logout();
    setUser(null);
    window.location.href = '/login';
  };

  return (
    <div style={{ padding: '32px' }}>
      <h1>Welcome, {user?.username}</h1>
      <img src={user?.avatar_url} alt="avatar" width={48} style={{ borderRadius: '50%' }} />
      <br /><br />
      <button onClick={handleLogout}>Logout</button>
    </div>
  );
};

export default Dashboard;