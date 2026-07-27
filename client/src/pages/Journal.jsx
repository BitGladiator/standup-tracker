import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowLeft, BookOpen, Lightbulb, Wrench, FileText, CheckCircle2, Clock, AlertCircle
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
      await saveJournal(formData);
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
      {/* ── Header ── */}
      <div className={styles.header}>
        <button onClick={() => navigate('/dashboard')} className={styles.backButton}>
          <ArrowLeft size={16} />
        </button>
        <h1 className={styles.title}>
          <BookOpen size={18} color="var(--accent)" />
          Daily Journal
        </h1>
        <span className={styles.dateBadge}>{formattedDate}</span>
      </div>

      {/* ── Form Card ── */}
      <div className={styles.formCard}>

        {/* Problems Solved */}
        <div className={styles.formSection}>
          <div className={styles.sectionHeader}>
            <span className={`${styles.sectionIconWrap} ${styles.red}`}>
              <Wrench size={14} />
            </span>
            <span className={styles.sectionLabel}>Problems Solved / Overcome</span>
            <span className={styles.sectionHint}>Required</span>
          </div>
          <textarea
            name="problems_solved"
            className={styles.textarea}
            value={formData.problems_solved}
            onChange={handleChange}
            placeholder="What technical challenges, blockers, or mental hurdles did you overcome today?"
          />
        </div>

        {/* How It Was Done */}
        <div className={styles.formSection}>
          <div className={styles.sectionHeader}>
            <span className={`${styles.sectionIconWrap} ${styles.yellow}`}>
              <Lightbulb size={14} />
            </span>
            <span className={styles.sectionLabel}>How It Was Done</span>
            <span className={styles.sectionHint}>Detail your approach</span>
          </div>
          <textarea
            name="how_it_was_done"
            className={styles.textarea}
            value={formData.how_it_was_done}
            onChange={handleChange}
            placeholder="Explain the solution. What steps did you take? Did you learn any new concepts?"
          />
        </div>

        {/* General Notes */}
        <div className={styles.formSection}>
          <div className={styles.sectionHeader}>
            <span className={`${styles.sectionIconWrap} ${styles.blue}`}>
              <FileText size={14} />
            </span>
            <span className={styles.sectionLabel}>General Notes</span>
            <span className={styles.sectionHint}>Optional</span>
          </div>
          <textarea
            name="notes"
            className={`${styles.textarea} ${styles.notesTextarea}`}
            value={formData.notes}
            onChange={handleChange}
            placeholder="Thoughts, observations, or memos outside of the primary problems"
          />
        </div>

        {/* Footer */}
        <div className={styles.formFooter}>
          <button
            className={styles.saveButton}
            onClick={handleSave}
            disabled={status === 'saving'}
          >
            {status === 'saving' ? <Clock size={13} /> : <CheckCircle2 size={13} />}
            {status === 'saving' ? 'Saving…' : 'Save Entry'}
          </button>

          {status === 'saved' && (
            <span className={`${styles.statusChip} ${styles.saved}`}>
              <CheckCircle2 size={12} />
              Saved at {timeFormatted}
            </span>
          )}
          {status === 'saving' && (
            <span className={`${styles.statusChip} ${styles.saving}`}>
              <Clock size={12} />
              Saving…
            </span>
          )}
          {status === 'error' && (
            <span className={`${styles.statusChip} ${styles.error}`}>
              <AlertCircle size={12} />
              Failed to save
            </span>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default Journal;
