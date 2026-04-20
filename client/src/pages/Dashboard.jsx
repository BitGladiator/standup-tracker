import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.jsx';
import { logout, getSessionStats, triggerPRCheck, getHeatmap } from '../api/client.js';
import NotificationBell from '../components/NotificationBell.jsx';
import ContributionHeatmap from '../components/ContributionHeatmap.jsx';
import { motion } from 'framer-motion';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell 
} from 'recharts';
import { 
  Timer, Target, Activity, Flame, LogOut, Settings, BarChart2, BellRing, BookOpen, GitGraph 
} from 'lucide-react';
import styles from './Dashboard.module.css';

const Dashboard = () => {
  const { user, setUser } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [hoveredBar, setHoveredBar] = useState(null);
  const [heatmapData, setHeatmapData] = useState(null);

  useEffect(() => {
    getSessionStats().then(setStats).catch(console.error);
    getHeatmap().then(setHeatmapData).catch(() => {});
  }, []);

  const handleLogout = async () => {
    await logout();
    setUser(null);
    navigate('/login');
  };

  const getLast7Days = () => {
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const found = stats?.daily?.find((r) => r.date?.startsWith(dateStr));
      days.push({
        label: d.toLocaleDateString('en-US', { weekday: 'short' }),
        fullDate: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        minutes: found ? parseInt(found.total_minutes) : 0,
      });
    }
    return days;
  };

  const chartData = getLast7Days();


  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: { staggerChildren: 0.05 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { type: "tween", duration: 0.3 }
    }
  };

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className={styles.customTooltip}>
          <div className={styles.tooltipLabel}>{payload[0].payload.fullDate}</div>
          <div className={styles.tooltipValue}>
            <Timer size={14} color="#a78bfa" />
            <span>{payload[0].value} <span style={{ fontSize: '12px', fontWeight: '500', opacity: 0.8 }}>min</span></span>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <motion.div 
      className={styles.dashboardContainer}
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >

      <motion.div className={styles.header} variants={itemVariants}>
        <h1 className={styles.headerTitle}>
          Dashboard
        </h1>
        <div className={styles.headerActions}>
          <div style={{ position: 'relative' }}>
            <NotificationBell userId={user?.id} />
          </div>
          
          <button
            onClick={() => navigate('/settings')}
            className={styles.iconButton}
            title="Settings"
          >
            <Settings size={16} />
          </button>
          
          <div className={styles.userInfo}>
            <img src={user?.avatar_url || 'https://github.com/github.png'} alt={user?.username} className={styles.avatar} />
            <span className={styles.username}>{user?.username || 'Guest'}</span>
          </div>
          
          <button
            onClick={handleLogout}
            className={styles.iconButton}
            title="Logout"
            style={{ color: '#ef4444' }}
          >
            <LogOut size={16} />
          </button>
        </div>
      </motion.div>


      <motion.div className={styles.quickActionsGrid} variants={itemVariants}>
        <div
          onClick={() => navigate('/standup')}
          className={`${styles.actionCard} ${styles.standupCard}`}
        >
          <div>
            <div className={styles.actionCardTitle}>
              <Activity size={18} />
              Today's standup
            </div>
            <div className={styles.actionCardDesc}>Review Github activity and generate your daily standup summary.</div>
          </div>
          <div style={{ alignSelf: 'flex-end', opacity: 0.2 }}>
            <Activity size={32} strokeWidth={1.5} />
          </div>
        </div>

        <div
          onClick={() => navigate('/focus')}
          className={`${styles.actionCard} ${styles.focusCard}`}
        >
          <div>
            <div className={styles.actionCardTitle}>
              <Target size={18} />
              Focus timer
            </div>
            <div className={styles.actionCardDesc}>Start a 25-minute pomodoro session for deep work blocks.</div>
          </div>
          <div style={{ alignSelf: 'flex-end', opacity: 0.2 }}>
            <Target size={32} strokeWidth={1.5} />
          </div>
        </div>

        <div
          onClick={() => navigate('/journal')}
          className={`${styles.actionCard} ${styles.journalCard}`}
        >
          <div>
            <div className={styles.actionCardTitle}>
              <BookOpen size={18} />
              Daily Journal
            </div>
            <div className={styles.actionCardDesc}>Document problems solved and daily reflections.</div>
          </div>
          <div style={{ alignSelf: 'flex-end', opacity: 0.2 }}>
            <BookOpen size={32} strokeWidth={1.5} />
          </div>
        </div>

      </motion.div>

    
      {stats && (
        <motion.div className={styles.statsGrid} variants={itemVariants}>
          <div className={styles.statCard}>
            <div className={`${styles.statIconWrapper} ${styles.blue}`}>
              <Timer size={20} />
            </div>
            <div>
              <div className={styles.statValue}>
                {`${Math.round((stats.totals?.total_minutes || 0) / 60 * 10) / 10}`} <span style={{ fontSize: '14px', fontWeight: '500', opacity: 0.7 }}>hrs</span>
              </div>
              <div className={styles.statLabel}>Total Focus</div>
            </div>
          </div>
          
          <div className={styles.statCard}>
            <div className={`${styles.statIconWrapper} ${styles.green}`}>
              <Target size={20} />
            </div>
            <div>
              <div className={styles.statValue}>{stats.totals?.total_sessions || 0}</div>
              <div className={styles.statLabel}>Sessions</div>
            </div>
          </div>
          
          <div className={styles.statCard}>
            <div className={`${styles.statIconWrapper} ${styles.orange}`}>
              <Flame size={20} />
            </div>
            <div>
              <div className={styles.statValue}>
                {stats.streak} <span style={{ fontSize: '14px', fontWeight: '500', opacity: 0.7 }}>{stats.streak === 1 ? 'day' : 'days'}</span>
              </div>
              <div className={styles.statLabel}>Current Streak</div>
            </div>
          </div>
        </motion.div>
      )}

     
      <motion.div className={styles.chartSection} variants={itemVariants}>
        <div className={styles.chartHeader}>
          <h3 className={styles.chartTitle}>
            <BarChart2 size={16} color="#a78bfa" />
            Focus Time This Week
          </h3>
        </div>
        <div style={{ height: '220px', width: '100%' }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
              onMouseMove={(state) => {
                if (state.isTooltipActive) {
                  setHoveredBar(state.activeTooltipIndex);
                } else {
                  setHoveredBar(null);
                }
              }}
              onMouseLeave={() => setHoveredBar(null)}
            >
              <defs>
                <linearGradient id="colorMinutes" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#8b5cf6" stopOpacity={1}/>
                  <stop offset="95%" stopColor="#6d28d9" stopOpacity={0.8}/>
                </linearGradient>
                <linearGradient id="colorMinutesHover" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#a78bfa" stopOpacity={1}/>
                  <stop offset="95%" stopColor="#7c3aed" stopOpacity={0.9}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(156, 163, 175, 0.2)" />
              <XAxis 
                dataKey="label" 
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: '#9ca3af', fontSize: 12 }}
                dy={10}
              />
              <YAxis 
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: '#9ca3af', fontSize: 12 }}
              />
              <Tooltip 
                content={<CustomTooltip />} 
                cursor={{ fill: 'rgba(156, 163, 175, 0.05)' }} 
              />
              <Bar 
                dataKey="minutes" 
                radius={[4, 4, 0, 0]}
                animationDuration={800}
                animationEasing="ease-out"
                barSize={32}
              >
                {chartData.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={hoveredBar === index ? "url(#colorMinutesHover)" : "url(#colorMinutes)"} 
                    style={{ transition: 'all 0.2s ease' }}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </motion.div>

    
   
      {heatmapData && (
        <motion.div className={styles.heatmapSection} variants={itemVariants}>
          <div className={styles.chartHeader}>
            <h3 className={styles.chartTitle}>
              <GitGraph size={16} color="#10b981" />
              Contribution Activity
            </h3>
            <span style={{ fontSize: '12px', color: 'var(--text)', opacity: 0.5 }}>
              {user?.username}'s last 365 days
            </span>
          </div>
          <ContributionHeatmap data={heatmapData} />
        </motion.div>
      )}

      <motion.div variants={itemVariants} style={{ display: 'flex', justifyContent: 'center', marginTop: '16px' }}>
        <button
          onClick={() => triggerPRCheck().then(() => alert('PR check triggered! Check your notifications.'))}
          className={styles.testButton}
        >
          <BellRing size={14} />
          Trigger PR check (test)
        </button>
      </motion.div>

    </motion.div>
  );
};

export default Dashboard;