-- Engineer Job Portal - Initial Database Schema
-- Run this in your Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- TABLES
-- ============================================

-- Profiles table (extends auth.users)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  role TEXT CHECK (role IN ('admin', 'company', 'jobseeker')) NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Companies table
CREATE TABLE IF NOT EXISTS companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE REFERENCES profiles(id) ON DELETE CASCADE,
  company_name TEXT NOT NULL DEFAULT '',
  description TEXT,
  website TEXT,
  location TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  logo_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Job Seekers table
CREATE TABLE IF NOT EXISTS job_seekers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE REFERENCES profiles(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL DEFAULT '',
  phone TEXT,
  location TEXT,
  bio TEXT,
  resume_url TEXT,
  expected_salary TEXT,
  remote_ok BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Skills table
CREATE TABLE IF NOT EXISTS skills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  category TEXT
);

-- Job Seeker Skills (junction table)
CREATE TABLE IF NOT EXISTS job_seeker_skills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_seeker_id UUID REFERENCES job_seekers(id) ON DELETE CASCADE,
  skill_id UUID REFERENCES skills(id) ON DELETE CASCADE,
  proficiency TEXT CHECK (proficiency IN ('beginner', 'intermediate', 'advanced', 'expert')),
  UNIQUE (job_seeker_id, skill_id)
);

-- Job Postings table
CREATE TABLE IF NOT EXISTS job_postings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  job_type TEXT CHECK (job_type IN ('full-time', 'part-time', 'contract', 'internship')),
  location TEXT,
  remote_ok BOOLEAN DEFAULT FALSE,
  salary_min INTEGER,
  salary_max INTEGER,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Job Posting Skills (junction table)
CREATE TABLE IF NOT EXISTS job_posting_skills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_posting_id UUID REFERENCES job_postings(id) ON DELETE CASCADE,
  skill_id UUID REFERENCES skills(id) ON DELETE CASCADE,
  is_required BOOLEAN DEFAULT TRUE,
  UNIQUE (job_posting_id, skill_id)
);

-- Applications table
CREATE TABLE IF NOT EXISTS applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_posting_id UUID REFERENCES job_postings(id) ON DELETE CASCADE,
  job_seeker_id UUID REFERENCES job_seekers(id) ON DELETE CASCADE,
  cover_letter TEXT,
  resume_url TEXT,
  status TEXT CHECK (status IN ('pending', 'reviewing', 'interview', 'offered', 'rejected', 'withdrawn')) DEFAULT 'pending',
  applied_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (job_posting_id, job_seeker_id)
);

-- Messages table
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  receiver_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  application_id UUID REFERENCES applications(id) ON DELETE SET NULL,
  content TEXT NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  sent_at TIMESTAMPTZ DEFAULT NOW()
);

-- Bookmarks table
CREATE TABLE IF NOT EXISTS bookmarks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_seeker_id UUID REFERENCES job_seekers(id) ON DELETE CASCADE,
  job_posting_id UUID REFERENCES job_postings(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (job_seeker_id, job_posting_id)
);

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);
CREATE INDEX IF NOT EXISTS idx_companies_user_id ON companies(user_id);
CREATE INDEX IF NOT EXISTS idx_job_seekers_user_id ON job_seekers(user_id);
CREATE INDEX IF NOT EXISTS idx_job_postings_company_id ON job_postings(company_id);
CREATE INDEX IF NOT EXISTS idx_job_postings_is_active ON job_postings(is_active);
CREATE INDEX IF NOT EXISTS idx_job_postings_created_at ON job_postings(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_applications_job_posting_id ON applications(job_posting_id);
CREATE INDEX IF NOT EXISTS idx_applications_job_seeker_id ON applications(job_seeker_id);
CREATE INDEX IF NOT EXISTS idx_applications_status ON applications(status);
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_receiver_id ON messages(receiver_id);
CREATE INDEX IF NOT EXISTS idx_bookmarks_job_seeker_id ON bookmarks(job_seeker_id);

-- ============================================
-- TRIGGERS
-- ============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to tables with updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_companies_updated_at
  BEFORE UPDATE ON companies
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_job_seekers_updated_at
  BEFORE UPDATE ON job_seekers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_job_postings_updated_at
  BEFORE UPDATE ON job_postings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_applications_updated_at
  BEFORE UPDATE ON applications
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_seekers ENABLE ROW LEVEL SECURITY;
ALTER TABLE skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_seeker_skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_postings ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_posting_skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookmarks ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Service role can manage all profiles" ON profiles
  FOR ALL USING (auth.role() = 'service_role');

-- Companies policies
CREATE POLICY "Anyone can view companies" ON companies
  FOR SELECT USING (true);

CREATE POLICY "Company owners can update their company" ON companies
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Company owners can insert their company" ON companies
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- Job Seekers policies
CREATE POLICY "Job seekers can view own profile" ON job_seekers
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Companies can view job seekers who applied" ON job_seekers
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM applications a
      JOIN job_postings jp ON a.job_posting_id = jp.id
      JOIN companies c ON jp.company_id = c.id
      WHERE a.job_seeker_id = job_seekers.id
      AND c.user_id = auth.uid()
    )
  );

CREATE POLICY "Job seekers can update own profile" ON job_seekers
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Job seekers can insert own profile" ON job_seekers
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- Skills policies
CREATE POLICY "Anyone can view skills" ON skills
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can insert skills" ON skills
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Job Seeker Skills policies
CREATE POLICY "Job seekers can manage own skills" ON job_seeker_skills
  FOR ALL USING (
    job_seeker_id IN (SELECT id FROM job_seekers WHERE user_id = auth.uid())
  );

CREATE POLICY "Companies can view applicant skills" ON job_seeker_skills
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM applications a
      JOIN job_postings jp ON a.job_posting_id = jp.id
      JOIN companies c ON jp.company_id = c.id
      WHERE a.job_seeker_id = job_seeker_skills.job_seeker_id
      AND c.user_id = auth.uid()
    )
  );

-- Job Postings policies
CREATE POLICY "Anyone can view active job postings" ON job_postings
  FOR SELECT USING (is_active = true);

CREATE POLICY "Companies can view own job postings" ON job_postings
  FOR SELECT USING (
    company_id IN (SELECT id FROM companies WHERE user_id = auth.uid())
  );

CREATE POLICY "Companies can manage own job postings" ON job_postings
  FOR ALL USING (
    company_id IN (SELECT id FROM companies WHERE user_id = auth.uid())
  );

-- Job Posting Skills policies
CREATE POLICY "Anyone can view job posting skills" ON job_posting_skills
  FOR SELECT USING (true);

CREATE POLICY "Companies can manage own job posting skills" ON job_posting_skills
  FOR ALL USING (
    job_posting_id IN (
      SELECT jp.id FROM job_postings jp
      JOIN companies c ON jp.company_id = c.id
      WHERE c.user_id = auth.uid()
    )
  );

-- Applications policies
CREATE POLICY "Job seekers can view own applications" ON applications
  FOR SELECT USING (
    job_seeker_id IN (SELECT id FROM job_seekers WHERE user_id = auth.uid())
  );

CREATE POLICY "Companies can view applications for their jobs" ON applications
  FOR SELECT USING (
    job_posting_id IN (
      SELECT jp.id FROM job_postings jp
      JOIN companies c ON jp.company_id = c.id
      WHERE c.user_id = auth.uid()
    )
  );

CREATE POLICY "Job seekers can create applications" ON applications
  FOR INSERT WITH CHECK (
    job_seeker_id IN (SELECT id FROM job_seekers WHERE user_id = auth.uid())
  );

CREATE POLICY "Job seekers can update own applications" ON applications
  FOR UPDATE USING (
    job_seeker_id IN (SELECT id FROM job_seekers WHERE user_id = auth.uid())
  );

CREATE POLICY "Companies can update applications for their jobs" ON applications
  FOR UPDATE USING (
    job_posting_id IN (
      SELECT jp.id FROM job_postings jp
      JOIN companies c ON jp.company_id = c.id
      WHERE c.user_id = auth.uid()
    )
  );

-- Messages policies
CREATE POLICY "Users can view own messages" ON messages
  FOR SELECT USING (sender_id = auth.uid() OR receiver_id = auth.uid());

CREATE POLICY "Users can send messages" ON messages
  FOR INSERT WITH CHECK (sender_id = auth.uid());

CREATE POLICY "Users can update messages they received" ON messages
  FOR UPDATE USING (receiver_id = auth.uid());

-- Bookmarks policies
CREATE POLICY "Job seekers can manage own bookmarks" ON bookmarks
  FOR ALL USING (
    job_seeker_id IN (SELECT id FROM job_seekers WHERE user_id = auth.uid())
  );

-- ============================================
-- SEED DATA (Sample Skills)
-- ============================================

INSERT INTO skills (name, category) VALUES
  ('JavaScript', 'Programming Language'),
  ('TypeScript', 'Programming Language'),
  ('Python', 'Programming Language'),
  ('Java', 'Programming Language'),
  ('C++', 'Programming Language'),
  ('C#', 'Programming Language'),
  ('Go', 'Programming Language'),
  ('Rust', 'Programming Language'),
  ('Ruby', 'Programming Language'),
  ('PHP', 'Programming Language'),
  ('Swift', 'Programming Language'),
  ('Kotlin', 'Programming Language'),
  ('React', 'Frontend Framework'),
  ('Vue.js', 'Frontend Framework'),
  ('Angular', 'Frontend Framework'),
  ('Next.js', 'Frontend Framework'),
  ('Node.js', 'Backend Runtime'),
  ('Express.js', 'Backend Framework'),
  ('Django', 'Backend Framework'),
  ('Spring Boot', 'Backend Framework'),
  ('Ruby on Rails', 'Backend Framework'),
  ('Laravel', 'Backend Framework'),
  ('PostgreSQL', 'Database'),
  ('MySQL', 'Database'),
  ('MongoDB', 'Database'),
  ('Redis', 'Database'),
  ('AWS', 'Cloud Platform'),
  ('Google Cloud', 'Cloud Platform'),
  ('Azure', 'Cloud Platform'),
  ('Docker', 'DevOps'),
  ('Kubernetes', 'DevOps'),
  ('Git', 'Version Control'),
  ('CI/CD', 'DevOps'),
  ('Linux', 'Operating System'),
  ('REST API', 'Architecture'),
  ('GraphQL', 'Architecture'),
  ('Microservices', 'Architecture'),
  ('Agile', 'Methodology'),
  ('Scrum', 'Methodology'),
  ('Machine Learning', 'AI/ML'),
  ('Deep Learning', 'AI/ML'),
  ('TensorFlow', 'AI/ML'),
  ('PyTorch', 'AI/ML')
ON CONFLICT (name) DO NOTHING;
