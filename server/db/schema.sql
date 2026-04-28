CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  github_id VARCHAR(50) UNIQUE NOT NULL,
  username VARCHAR(100) NOT NULL,
  avatar_url TEXT,
  access_token TEXT NOT NULL,
  slack_webhook_url TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS standups (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  yesterday TEXT,
  today TEXT,
  blockers TEXT,
  auto_generated BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, date)
);

CREATE TABLE IF NOT EXISTS focus_sessions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  label VARCHAR(255),
  started_at TIMESTAMP NOT NULL,
  ended_at TIMESTAMP NOT NULL,
  duration_minutes INTEGER NOT NULL,
  pomodoro_count INTEGER DEFAULT 1,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS github_activity (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  fetched_at TIMESTAMP DEFAULT NOW(),
  commits JSONB,
  prs JSONB,
  reviews JSONB
);

CREATE TABLE IF NOT EXISTS journals (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  problems_solved TEXT,
  how_it_was_done TEXT,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, date)
);

CREATE TABLE IF NOT EXISTS standup_scores (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  standup_id INTEGER REFERENCES standups(id) ON DELETE CASCADE UNIQUE,
  overall_score INTEGER,
  grade VARCHAR(10),
  clarity_score INTEGER,
  specificity_score INTEGER,
  blocker_quality_score INTEGER,
  completeness_score INTEGER,
  clarity_feedback TEXT,
  specificity_feedback TEXT,
  blocker_feedback TEXT,
  completeness_feedback TEXT,
  overall_feedback TEXT,
  strengths JSONB DEFAULT '[]'::jsonb,
  improvements JSONB DEFAULT '[]'::jsonb,
  agent_reasoning JSONB,
  pipeline_meta JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS notifications (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(50),
  title VARCHAR(255),
  body TEXT,
  pr_url TEXT,
  pr_title TEXT,
  repo TEXT,
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);


CREATE INDEX IF NOT EXISTS idx_standups_user_date ON standups (user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_focus_sessions_user_started ON focus_sessions (user_id, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON notifications (user_id, read, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_github_activity_user ON github_activity (user_id, fetched_at DESC);
CREATE INDEX IF NOT EXISTS idx_standup_scores_user ON standup_scores (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_standup_scores_standup ON standup_scores (standup_id);
CREATE INDEX IF NOT EXISTS idx_journals_user_date ON journals (user_id, date DESC);