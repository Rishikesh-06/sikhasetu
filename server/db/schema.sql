-- SIKHASETU Adaptive Learning Intelligence Database Schema
-- Compatible with PostgreSQL & Supabase

-- 1. Schools & Educational Institutions Entity
CREATE TABLE IF NOT EXISTS schools (
  id VARCHAR(36) PRIMARY KEY,
  name VARCHAR(255) NOT NULL UNIQUE,
  location VARCHAR(255) DEFAULT 'New Delhi, India',
  school_code VARCHAR(50) UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Classrooms Model (School + Class + Section)
CREATE TABLE IF NOT EXISTS classrooms (
  id VARCHAR(36) PRIMARY KEY,
  school_id VARCHAR(36) REFERENCES schools(id) ON DELETE CASCADE,
  class_level INTEGER NOT NULL CHECK (class_level BETWEEN 6 AND 12),
  section VARCHAR(10) DEFAULT 'A',
  academic_year VARCHAR(20) DEFAULT '2026-2027',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Core Users
CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(36) PRIMARY KEY,
  supabase_user_id VARCHAR(64) UNIQUE,
  email VARCHAR(255) NOT NULL UNIQUE,
  role VARCHAR(20) NOT NULL CHECK (role IN ('student', 'teacher', 'parent')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. Profiles with School References
CREATE TABLE IF NOT EXISTS student_profiles (
  id VARCHAR(36) PRIMARY KEY,
  user_id VARCHAR(36) REFERENCES users(id) ON DELETE CASCADE,
  school_id VARCHAR(36) REFERENCES schools(id) ON DELETE SET NULL,
  name VARCHAR(255) NOT NULL,
  school VARCHAR(255) DEFAULT 'Delhi Public School',
  class_level INTEGER NOT NULL CHECK (class_level BETWEEN 6 AND 12),
  preferred_language VARCHAR(50) DEFAULT 'English',
  xp INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS teacher_profiles (
  id VARCHAR(36) PRIMARY KEY,
  user_id VARCHAR(36) REFERENCES users(id) ON DELETE CASCADE,
  school_id VARCHAR(36) REFERENCES schools(id) ON DELETE SET NULL,
  name VARCHAR(255) NOT NULL,
  school VARCHAR(255) DEFAULT 'Delhi Public School',
  subject_specialization VARCHAR(100) DEFAULT 'Mathematics & Science',
  class_assignments JSONB DEFAULT '["Class 6", "Class 7", "Class 8", "Class 9", "Class 10", "Class 11", "Class 12"]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS parent_profiles (
  id VARCHAR(36) PRIMARY KEY,
  user_id VARCHAR(36) REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  student_id VARCHAR(36) REFERENCES student_profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS parent_student_relationships (
  id VARCHAR(36) PRIMARY KEY,
  parent_id VARCHAR(36) REFERENCES parent_profiles(id) ON DELETE CASCADE,
  student_id VARCHAR(36) REFERENCES student_profiles(id) ON DELETE CASCADE,
  relationship_type VARCHAR(20) DEFAULT 'parent' CHECK (relationship_type IN ('parent', 'guardian')),
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('pending', 'active', 'revoked')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  verified_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  revoked_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE IF NOT EXISTS parent_link_codes (
  id VARCHAR(36) PRIMARY KEY,
  student_id VARCHAR(36) REFERENCES student_profiles(id) ON DELETE CASCADE,
  code_hash VARCHAR(128) NOT NULL,
  code_preview VARCHAR(16),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  used_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  revoked_at TIMESTAMP WITH TIME ZONE
);

-- 5. Relational Classroom Memberships
CREATE TABLE IF NOT EXISTS class_enrollments (
  id VARCHAR(36) PRIMARY KEY,
  student_id VARCHAR(36) REFERENCES student_profiles(id) ON DELETE CASCADE,
  classroom_id VARCHAR(36) REFERENCES classrooms(id) ON DELETE CASCADE,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'transferred', 'archived'))
);

CREATE TABLE IF NOT EXISTS teacher_classrooms (
  id VARCHAR(36) PRIMARY KEY,
  teacher_id VARCHAR(36) REFERENCES teacher_profiles(id) ON DELETE CASCADE,
  classroom_id VARCHAR(36) REFERENCES classrooms(id) ON DELETE CASCADE,
  subject VARCHAR(100) DEFAULT 'General',
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 6. Friendly Fire — Student Social Competition
CREATE TABLE IF NOT EXISTS competition_connections (
  id VARCHAR(36) PRIMARY KEY,
  requester_student_id VARCHAR(36) REFERENCES student_profiles(id) ON DELETE CASCADE,
  recipient_student_id VARCHAR(36) REFERENCES student_profiles(id) ON DELETE CASCADE,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  accepted_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE IF NOT EXISTS competition_matches (
  id VARCHAR(36) PRIMARY KEY,
  connection_id VARCHAR(36) REFERENCES competition_connections(id) ON DELETE CASCADE,
  challenge_type VARCHAR(50) DEFAULT 'weekly_xp' CHECK (challenge_type IN ('weekly_xp', 'quiz_duel', 'streak_clash')),
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'completed')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE IF NOT EXISTS competition_activity (
  id VARCHAR(36) PRIMARY KEY,
  student_id VARCHAR(36) REFERENCES student_profiles(id) ON DELETE CASCADE,
  activity_type VARCHAR(50) NOT NULL,
  xp INTEGER NOT NULL DEFAULT 10,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 7. Curriculum Questions
CREATE TABLE IF NOT EXISTS questions (
  id VARCHAR(36) PRIMARY KEY,
  class_level INTEGER NOT NULL CHECK (class_level BETWEEN 6 AND 12),
  subject VARCHAR(50) NOT NULL CHECK (subject IN ('Mathematics', 'Science', 'English')),
  topic VARCHAR(100) NOT NULL,
  skill VARCHAR(100) NOT NULL,
  difficulty VARCHAR(20) NOT NULL CHECK (difficulty IN ('FOUNDATIONAL', 'EASY', 'MEDIUM', 'HARD', 'ADVANCED')),
  question_text TEXT NOT NULL,
  question_type VARCHAR(20) NOT NULL DEFAULT 'choice' CHECK (question_type IN ('choice', 'short', 'reading', 'math', 'audio')),
  context_passage TEXT,
  options JSONB NOT NULL DEFAULT '[]'::jsonb,
  correct_answer TEXT NOT NULL,
  explanation TEXT NOT NULL,
  marks INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 8. Diagnostic System
CREATE TABLE IF NOT EXISTS diagnostic_attempts (
  id VARCHAR(36) PRIMARY KEY,
  student_id VARCHAR(36) REFERENCES student_profiles(id) ON DELETE CASCADE,
  class_level INTEGER NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed')),
  current_difficulty VARCHAR(20) DEFAULT 'MEDIUM',
  question_history JSONB DEFAULT '[]'::jsonb,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE IF NOT EXISTS diagnostic_responses (
  id VARCHAR(36) PRIMARY KEY,
  attempt_id VARCHAR(36) REFERENCES diagnostic_attempts(id) ON DELETE CASCADE,
  question_id VARCHAR(36) REFERENCES questions(id) ON DELETE CASCADE,
  selected_answer TEXT NOT NULL,
  is_correct BOOLEAN NOT NULL,
  marks_awarded INTEGER NOT NULL DEFAULT 0,
  answered_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS diagnostic_results (
  id VARCHAR(36) PRIMARY KEY,
  attempt_id VARCHAR(36) REFERENCES diagnostic_attempts(id) ON DELETE CASCADE,
  student_id VARCHAR(36) REFERENCES student_profiles(id) ON DELETE CASCADE,
  class_level INTEGER NOT NULL,
  raw_score NUMERIC(6,2) NOT NULL,
  maximum_score NUMERIC(6,2) NOT NULL,
  normalized_score NUMERIC(5,2) NOT NULL,
  group_type VARCHAR(20) NOT NULL CHECK (group_type IN ('GROUP_A', 'GROUP_B', 'GROUP_C')),
  subject_scores JSONB NOT NULL DEFAULT '{}'::jsonb,
  skill_evidence JSONB NOT NULL DEFAULT '[]'::jsonb,
  completed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 9. Adaptive Assessment System
CREATE TABLE IF NOT EXISTS adaptive_assessments (
  id VARCHAR(36) PRIMARY KEY,
  teacher_id VARCHAR(36) REFERENCES teacher_profiles(id) ON DELETE CASCADE,
  classroom_id VARCHAR(36) REFERENCES classrooms(id) ON DELETE CASCADE,
  class_level INTEGER NOT NULL,
  subject VARCHAR(50) NOT NULL,
  topics JSONB NOT NULL DEFAULT '[]'::jsonb,
  title VARCHAR(255) NOT NULL,
  purpose VARCHAR(50) DEFAULT 'Practice',
  question_count INTEGER NOT NULL DEFAULT 10,
  adaptive_mode BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS assessment_assignments (
  id VARCHAR(36) PRIMARY KEY,
  assessment_id VARCHAR(36) REFERENCES adaptive_assessments(id) ON DELETE CASCADE,
  student_id VARCHAR(36) REFERENCES student_profiles(id) ON DELETE CASCADE,
  group_type VARCHAR(20) NOT NULL CHECK (group_type IN ('GROUP_A', 'GROUP_B', 'GROUP_C')),
  assigned_question_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'submitted')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS assessment_attempts (
  id VARCHAR(36) PRIMARY KEY,
  assignment_id VARCHAR(36) REFERENCES assessment_assignments(id) ON DELETE CASCADE,
  student_id VARCHAR(36) REFERENCES student_profiles(id) ON DELETE CASCADE,
  score NUMERIC(6,2) NOT NULL DEFAULT 0,
  max_score NUMERIC(6,2) NOT NULL DEFAULT 0,
  percentage NUMERIC(5,2) NOT NULL DEFAULT 0,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  submitted_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE IF NOT EXISTS assessment_responses (
  id VARCHAR(36) PRIMARY KEY,
  attempt_id VARCHAR(36) REFERENCES assessment_attempts(id) ON DELETE CASCADE,
  question_id VARCHAR(36) REFERENCES questions(id) ON DELETE CASCADE,
  selected_answer TEXT NOT NULL,
  is_correct BOOLEAN NOT NULL,
  explanation TEXT
);

-- 10. Learning Evidence & Subject Progress
CREATE TABLE IF NOT EXISTS learning_evidence (
  id VARCHAR(36) PRIMARY KEY,
  student_id VARCHAR(36) REFERENCES student_profiles(id) ON DELETE CASCADE,
  subject VARCHAR(50) NOT NULL,
  topic VARCHAR(100) NOT NULL,
  skill VARCHAR(100) NOT NULL,
  mastery_score INTEGER NOT NULL DEFAULT 50,
  status VARCHAR(30) NOT NULL DEFAULT 'Developing' CHECK (status IN ('Needs Support', 'Developing', 'Good', 'Strong')),
  evidence_count INTEGER DEFAULT 1,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS subject_progress (
  id VARCHAR(36) PRIMARY KEY,
  student_id VARCHAR(36) REFERENCES student_profiles(id) ON DELETE CASCADE,
  subject VARCHAR(50) NOT NULL,
  progress_score INTEGER NOT NULL DEFAULT 50,
  previous_score INTEGER NOT NULL DEFAULT 40,
  growth INTEGER NOT NULL DEFAULT 10,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 11. Practice, Quizzes & Gamification
CREATE TABLE IF NOT EXISTS practice_activities (
  id VARCHAR(36) PRIMARY KEY,
  student_id VARCHAR(36) REFERENCES student_profiles(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  subject VARCHAR(50) NOT NULL,
  topic VARCHAR(100) NOT NULL,
  skill VARCHAR(100) NOT NULL,
  minutes INTEGER DEFAULT 5,
  level VARCHAR(50) DEFAULT 'Foundation',
  progress INTEGER DEFAULT 0,
  completed_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE IF NOT EXISTS quizzes (
  id VARCHAR(36) PRIMARY KEY,
  class_level INTEGER NOT NULL,
  subject VARCHAR(50) NOT NULL,
  topic VARCHAR(100) NOT NULL,
  title VARCHAR(255) NOT NULL,
  quiz_type VARCHAR(50) NOT NULL DEFAULT 'Quick' CHECK (quiz_type IN ('Quick', 'Subject', 'Topic', 'Challenge')),
  question_ids JSONB NOT NULL DEFAULT '[]'::jsonb
);

CREATE TABLE IF NOT EXISTS quiz_attempts (
  id VARCHAR(36) PRIMARY KEY,
  student_id VARCHAR(36) REFERENCES student_profiles(id) ON DELETE CASCADE,
  quiz_id VARCHAR(36) REFERENCES quizzes(id) ON DELETE CASCADE,
  score NUMERIC(6,2) NOT NULL DEFAULT 0,
  max_score NUMERIC(6,2) NOT NULL DEFAULT 0,
  percentage NUMERIC(5,2) NOT NULL DEFAULT 0,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  submitted_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE IF NOT EXISTS student_streaks (
  id VARCHAR(36) PRIMARY KEY,
  student_id VARCHAR(36) REFERENCES student_profiles(id) ON DELETE CASCADE UNIQUE,
  current_streak INTEGER NOT NULL DEFAULT 1,
  longest_streak INTEGER NOT NULL DEFAULT 1,
  last_activity_date DATE NOT NULL DEFAULT CURRENT_DATE,
  active_days JSONB DEFAULT '[]'::jsonb
);

CREATE TABLE IF NOT EXISTS student_achievements (
  id VARCHAR(36) PRIMARY KEY,
  student_id VARCHAR(36) REFERENCES student_profiles(id) ON DELETE CASCADE,
  badge_key VARCHAR(50) NOT NULL,
  title VARCHAR(100) NOT NULL,
  description TEXT NOT NULL,
  unlocked_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS activity_logs (
  id VARCHAR(36) PRIMARY KEY,
  student_id VARCHAR(36) REFERENCES student_profiles(id) ON DELETE CASCADE,
  activity_type VARCHAR(50) NOT NULL,
  title VARCHAR(255) NOT NULL,
  xp_earned INTEGER DEFAULT 10,
  activity_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 12. AI Tutor Conversations & Messages (Isolated & Student Owned)
CREATE TABLE IF NOT EXISTS ai_tutor_conversations (
  id VARCHAR(64) PRIMARY KEY,
  student_id VARCHAR(36) REFERENCES student_profiles(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  language VARCHAR(10) DEFAULT 'en',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS ai_tutor_messages (
  id VARCHAR(64) PRIMARY KEY,
  conversation_id VARCHAR(64) REFERENCES ai_tutor_conversations(id) ON DELETE CASCADE,
  role VARCHAR(20) NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  language VARCHAR(10) DEFAULT 'en',
  audio_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 13. DISHA — AI-Powered PDF Learning Companion
CREATE TABLE IF NOT EXISTS disha_documents (
  id VARCHAR(64) PRIMARY KEY,
  student_id VARCHAR(36) REFERENCES student_profiles(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  file_name VARCHAR(255) NOT NULL,
  file_size INTEGER DEFAULT 0,
  page_count INTEGER DEFAULT 1,
  chapter_count INTEGER DEFAULT 0,
  subject VARCHAR(100),
  class_level INTEGER,
  summary TEXT,
  structured_summary JSONB DEFAULT '{}'::jsonb,
  key_concepts JSONB DEFAULT '[]'::jsonb,
  chapters JSONB DEFAULT '[]'::jsonb,
  status VARCHAR(30) DEFAULT 'ready',
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS disha_document_chunks (
  id VARCHAR(64) PRIMARY KEY,
  document_id VARCHAR(64) REFERENCES disha_documents(id) ON DELETE CASCADE,
  chunk_index INTEGER NOT NULL,
  page_number INTEGER DEFAULT 1,
  chapter_title VARCHAR(255),
  content TEXT NOT NULL,
  keywords JSONB DEFAULT '[]'::jsonb,
  embedding JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS disha_conversations (
  id VARCHAR(64) PRIMARY KEY,
  student_id VARCHAR(36) REFERENCES student_profiles(id) ON DELETE CASCADE,
  document_id VARCHAR(64) REFERENCES disha_documents(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL DEFAULT 'Chat with Disha',
  language VARCHAR(10) DEFAULT 'en',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS disha_messages (
  id VARCHAR(64) PRIMARY KEY,
  conversation_id VARCHAR(64) REFERENCES disha_conversations(id) ON DELETE CASCADE,
  role VARCHAR(20) NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  language VARCHAR(10) DEFAULT 'en',
  audio_url TEXT,
  sources JSONB DEFAULT '[]'::jsonb,
  is_grounded BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS disha_quizzes (
  id VARCHAR(64) PRIMARY KEY,
  document_id VARCHAR(64) REFERENCES disha_documents(id) ON DELETE CASCADE,
  student_id VARCHAR(36) REFERENCES student_profiles(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  questions JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

