import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  ArrowLeft, BookOpen, Lightbulb, Wrench, FileText, CheckCircle2, Clock 
} from 'lucide-react';
import { getTodayJournal, saveJournal } from '../api/client';
import styles from './Journal.module.css';

const Journal = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    problems_solved: '',
    how_it_was_done: '',
    notes: '',
  });
  const [status, setStatus] = useState('idle'); 
  const [lastSavedTime, setLastSavedTime] = useState(null);

  useEffect(() => {
    getTodayJournal()
      .then((data) => {
        if (data) {
          setFormData({
            problems_solved: data.problems_solved || '',
            how_it_was_done: data.how_it_was_done || '',
            notes: data.notes || '',
          });
          setLastSavedTime(new Date(data.created_at));
        }
      })
      .catch(console.error);
  }, []);

  const handleChange = (e) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setStatus('idle');
  };

  const handleSave = async () => {
    setStatus('saving');
    try {
      const data = await saveJournal(formData);
      setStatus('saved');
      setLastSavedTime(new Date());
    } catch (err) {
      console.error(err);
      setStatus('error');
    }
  };

  const formattedDate = new Date().toLocaleDateString('en-US', {
    weekday: 'long', month: 'short', day: 'numeric',
  });

  const timeFormatted = lastSavedTime 
    ? lastSavedTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : null;

  return (
    <motion.div 
      className={styles.container}
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      transition={{ duration: 0.3 }}
    >
      <div className={styles.header}>
        <button onClick={() => navigate('/dashboard')} className={styles.backButton}>
          <ArrowLeft size={16} />
        </button>
        <h1 className={styles.title}>
          <BookOpen size={20} color="var(--accent)" />
          Daily Journal
        </h1>
        <div className={styles.dateDisplay}>
          {formattedDate}
        </div>
      </div>

      <div className={styles.form}>
        <div className={styles.formGroup}>
          <label className={styles.label}>
            <Wrench size={16} color="#ef4444" />
            Problems Solved / Overcome
          </label>
          <textarea
            name="problems_solved"
            className={styles.textarea}
            value={formData.problems_solved}
            onChange={handleChange}
            placeholder="What technical challenges, blockers, or mental hurdles did you overcome today?"
          />
        </div>

        <div className={styles.formGroup}>
          <label className={styles.label}>
            <Lightbulb size={16} color="#eab308" />
            How It Was Done
          </label>
          <textarea
            name="how_it_was_done"
            className={styles.textarea}
            value={formData.how_it_was_done}
            onChange={handleChange}
            placeholder="Explain the solution. What steps did you take? Did you learn any new concepts?"
          />
        </div>

        <div className={styles.formGroup}>
          <label className={styles.label}>
            <FileText size={16} color="#3b82f6" />
            General Notes
          </label>
          <textarea
            name="notes"
            className={styles.textarea}
            style={{ minHeight: '80px' }}
            value={formData.notes}
            onChange={handleChange}
            placeholder="Thoughts, observations, or memos outside of the primary problems"
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button 
            className={styles.saveButton} 
            onClick={handleSave}
            disabled={status === 'saving'}
          >
            {status === 'saving' ? 'Saving...' : 'Save Entry'}
          </button>
          
          {status === 'saved' && (
            <span className={styles.statusIndicator}>
              <CheckCircle2 size={14} />
              Saved at {timeFormatted}
            </span>
          )}
          {status === 'saving' && (
            <span className={`${styles.statusIndicator} ${styles.saving}`}>
              <Clock size={14} />
              Saving...
            </span>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default Journal;
