-- Phase 1: Smart Matching & Skills Foundation
-- Run this migration after 001_initial_schema.sql

-- ============================================
-- STORY 11.1: SKILLS MAPPING TABLES
-- ============================================

-- Skill Synonyms table (e.g., "JS" -> "JavaScript", "TS" -> "TypeScript")
CREATE TABLE IF NOT EXISTS skill_synonyms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  skill_id UUID REFERENCES skills(id) ON DELETE CASCADE NOT NULL,
  synonym TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (synonym)
);

-- Skill Relationships table (e.g., JavaScript -> TypeScript means knowing JS helps with TS)
CREATE TABLE IF NOT EXISTS skill_relationships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_skill_id UUID REFERENCES skills(id) ON DELETE CASCADE NOT NULL,
  child_skill_id UUID REFERENCES skills(id) ON DELETE CASCADE NOT NULL,
  relationship_type TEXT CHECK (relationship_type IN ('parent', 'related', 'prerequisite')) NOT NULL,
  weight DECIMAL(3,2) DEFAULT 0.50 CHECK (weight >= 0 AND weight <= 1),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (parent_skill_id, child_skill_id)
);

-- ============================================
-- STORY 11.2: APPLICATION STATUS HISTORY
-- ============================================

CREATE TABLE IF NOT EXISTS application_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID REFERENCES applications(id) ON DELETE CASCADE NOT NULL,
  old_status TEXT CHECK (old_status IN ('pending', 'reviewing', 'interview', 'offered', 'rejected', 'withdrawn')),
  new_status TEXT CHECK (new_status IN ('pending', 'reviewing', 'interview', 'offered', 'rejected', 'withdrawn')) NOT NULL,
  changed_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  changed_at TIMESTAMPTZ DEFAULT NOW(),
  notes TEXT
);

-- Trigger to automatically record status changes on UPDATE
CREATE OR REPLACE FUNCTION record_application_status_change()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO application_status_history (
      application_id,
      old_status,
      new_status,
      changed_by,
      notes
    ) VALUES (
      NEW.id,
      OLD.status,
      NEW.status,
      auth.uid(),
      NULL
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_record_status_change ON applications;
CREATE TRIGGER trigger_record_status_change
  AFTER UPDATE ON applications
  FOR EACH ROW EXECUTE FUNCTION record_application_status_change();

-- Trigger to record initial status on INSERT
CREATE OR REPLACE FUNCTION record_initial_application_status()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO application_status_history (
    application_id,
    old_status,
    new_status,
    changed_by
  ) VALUES (
    NEW.id,
    NULL,
    NEW.status,
    auth.uid()
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_record_initial_status ON applications;
CREATE TRIGGER trigger_record_initial_status
  AFTER INSERT ON applications
  FOR EACH ROW EXECUTE FUNCTION record_initial_application_status();

-- ============================================
-- STORY 8.1: MATCH SCORE CALCULATION FUNCTION
-- ============================================

CREATE OR REPLACE FUNCTION calculate_match_score(
  p_job_seeker_id UUID,
  p_job_posting_id UUID
)
RETURNS TABLE (
  score INTEGER,
  matched_skills JSONB,
  missing_skills JSONB,
  skill_match_percentage INTEGER,
  location_match BOOLEAN,
  remote_match BOOLEAN
) AS $$
DECLARE
  v_job_location TEXT;
  v_job_remote_ok BOOLEAN;
  v_seeker_location TEXT;
  v_seeker_remote_ok BOOLEAN;
  v_required_skills JSONB;
  v_seeker_skills JSONB;
  v_matched JSONB := '[]'::JSONB;
  v_missing JSONB := '[]'::JSONB;
  v_skill_score DECIMAL := 0;
  v_location_score DECIMAL := 0;
  v_total_weight DECIMAL := 0;
  v_required_count INTEGER := 0;
  v_required_matched INTEGER := 0;
  v_final_score INTEGER;
  v_location_matched BOOLEAN := FALSE;
  v_remote_matched BOOLEAN := FALSE;
  v_skill_percentage INTEGER := 100;
  i INTEGER;
  j INTEGER;
  v_job_skill JSONB;
  v_is_required BOOLEAN;
  v_skill_weight DECIMAL;
  v_found BOOLEAN;
  v_proficiency_weight DECIMAL;
BEGIN
  -- Get job posting details
  SELECT location, remote_ok INTO v_job_location, v_job_remote_ok
  FROM job_postings WHERE id = p_job_posting_id;

  -- Get job seeker details
  SELECT location, remote_ok INTO v_seeker_location, v_seeker_remote_ok
  FROM job_seekers WHERE id = p_job_seeker_id;

  -- Get job required skills with details
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'skill_id', jps.skill_id,
      'skill_name', s.name,
      'is_required', jps.is_required
    )
  ), '[]'::JSONB)
  INTO v_required_skills
  FROM job_posting_skills jps
  JOIN skills s ON s.id = jps.skill_id
  WHERE jps.job_posting_id = p_job_posting_id;

  -- Get job seeker skills with proficiency
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'skill_id', jss.skill_id,
      'skill_name', s.name,
      'proficiency', jss.proficiency
    )
  ), '[]'::JSONB)
  INTO v_seeker_skills
  FROM job_seeker_skills jss
  JOIN skills s ON s.id = jss.skill_id
  WHERE jss.job_seeker_id = p_job_seeker_id;

  -- Calculate skill matches
  FOR i IN 0..jsonb_array_length(v_required_skills) - 1 LOOP
    v_job_skill := v_required_skills->i;
    v_is_required := (v_job_skill->>'is_required')::BOOLEAN;
    v_skill_weight := CASE WHEN v_is_required THEN 2.0 ELSE 1.0 END;
    v_found := FALSE;
    v_proficiency_weight := 0;

    IF v_is_required THEN
      v_required_count := v_required_count + 1;
    END IF;

    v_total_weight := v_total_weight + v_skill_weight;

    -- Check if seeker has this skill
    FOR j IN 0..jsonb_array_length(v_seeker_skills) - 1 LOOP
      IF (v_seeker_skills->j->>'skill_id') = (v_job_skill->>'skill_id') THEN
        v_found := TRUE;
        -- Weight by proficiency
        v_proficiency_weight := CASE (v_seeker_skills->j->>'proficiency')
          WHEN 'expert' THEN 1.0
          WHEN 'advanced' THEN 0.85
          WHEN 'intermediate' THEN 0.65
          WHEN 'beginner' THEN 0.4
          ELSE 0.5
        END;

        v_skill_score := v_skill_score + (v_skill_weight * v_proficiency_weight);

        IF v_is_required THEN
          v_required_matched := v_required_matched + 1;
        END IF;

        v_matched := v_matched || jsonb_build_object(
          'skill_id', v_job_skill->>'skill_id',
          'skill_name', v_job_skill->>'skill_name',
          'is_required', v_is_required,
          'proficiency', v_seeker_skills->j->>'proficiency'
        );
        EXIT;
      END IF;
    END LOOP;

    IF NOT v_found THEN
      v_missing := v_missing || jsonb_build_object(
        'skill_id', v_job_skill->>'skill_id',
        'skill_name', v_job_skill->>'skill_name',
        'is_required', v_is_required
      );
    END IF;
  END LOOP;

  -- Calculate location/remote match
  v_remote_matched := (v_job_remote_ok = TRUE AND v_seeker_remote_ok = TRUE);

  v_location_matched := (v_job_location IS NULL) OR
                        (v_seeker_location IS NOT NULL AND
                         LOWER(v_job_location) LIKE '%' || LOWER(v_seeker_location) || '%') OR
                        (v_seeker_location IS NOT NULL AND
                         LOWER(v_seeker_location) LIKE '%' || LOWER(v_job_location) || '%');

  IF v_location_matched OR v_remote_matched THEN
    v_location_score := 15;
  END IF;

  -- Calculate final score (skills = 85%, location = 15%)
  IF v_total_weight > 0 THEN
    v_final_score := ROUND((v_skill_score / v_total_weight) * 85 + v_location_score)::INTEGER;
  ELSE
    -- No skills required, base on location only
    v_final_score := CASE WHEN v_location_matched OR v_remote_matched THEN 85 ELSE 50 END;
  END IF;

  -- Calculate skill match percentage
  IF v_required_count > 0 THEN
    v_skill_percentage := ROUND((v_required_matched::DECIMAL / v_required_count) * 100)::INTEGER;
  END IF;

  -- Ensure score is within bounds
  v_final_score := GREATEST(0, LEAST(100, v_final_score));

  -- Return results
  score := v_final_score;
  matched_skills := v_matched;
  missing_skills := v_missing;
  skill_match_percentage := v_skill_percentage;
  location_match := v_location_matched;
  remote_match := v_remote_matched;

  RETURN NEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_skill_synonyms_skill_id ON skill_synonyms(skill_id);
CREATE INDEX IF NOT EXISTS idx_skill_synonyms_synonym ON skill_synonyms(synonym);
CREATE INDEX IF NOT EXISTS idx_skill_relationships_parent ON skill_relationships(parent_skill_id);
CREATE INDEX IF NOT EXISTS idx_skill_relationships_child ON skill_relationships(child_skill_id);
CREATE INDEX IF NOT EXISTS idx_application_status_history_app_id ON application_status_history(application_id);
CREATE INDEX IF NOT EXISTS idx_application_status_history_changed_at ON application_status_history(changed_at DESC);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

ALTER TABLE skill_synonyms ENABLE ROW LEVEL SECURITY;
ALTER TABLE skill_relationships ENABLE ROW LEVEL SECURITY;
ALTER TABLE application_status_history ENABLE ROW LEVEL SECURITY;

-- Skill synonyms - read-only for all authenticated users
CREATE POLICY "Anyone can view skill synonyms" ON skill_synonyms
  FOR SELECT USING (true);

-- Skill relationships - read-only for all authenticated users
CREATE POLICY "Anyone can view skill relationships" ON skill_relationships
  FOR SELECT USING (true);

-- Application status history - visible to job seeker who owns the application
CREATE POLICY "Job seekers can view own application history" ON application_status_history
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM applications a
      JOIN job_seekers js ON a.job_seeker_id = js.id
      WHERE a.id = application_status_history.application_id
      AND js.user_id = auth.uid()
    )
  );

-- Application status history - visible to company who owns the job
CREATE POLICY "Companies can view application history for their jobs" ON application_status_history
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM applications a
      JOIN job_postings jp ON a.job_posting_id = jp.id
      JOIN companies c ON jp.company_id = c.id
      WHERE a.id = application_status_history.application_id
      AND c.user_id = auth.uid()
    )
  );

-- ============================================
-- SEED DATA: Skill Relationships
-- ============================================

-- JavaScript -> TypeScript (parent relationship)
INSERT INTO skill_relationships (parent_skill_id, child_skill_id, relationship_type, weight)
SELECT
  (SELECT id FROM skills WHERE name = 'JavaScript'),
  (SELECT id FROM skills WHERE name = 'TypeScript'),
  'parent',
  0.70
WHERE EXISTS (SELECT 1 FROM skills WHERE name = 'JavaScript')
  AND EXISTS (SELECT 1 FROM skills WHERE name = 'TypeScript')
ON CONFLICT DO NOTHING;

-- React -> Next.js (prerequisite)
INSERT INTO skill_relationships (parent_skill_id, child_skill_id, relationship_type, weight)
SELECT
  (SELECT id FROM skills WHERE name = 'React'),
  (SELECT id FROM skills WHERE name = 'Next.js'),
  'prerequisite',
  0.60
WHERE EXISTS (SELECT 1 FROM skills WHERE name = 'React')
  AND EXISTS (SELECT 1 FROM skills WHERE name = 'Next.js')
ON CONFLICT DO NOTHING;

-- Python -> Django (prerequisite)
INSERT INTO skill_relationships (parent_skill_id, child_skill_id, relationship_type, weight)
SELECT
  (SELECT id FROM skills WHERE name = 'Python'),
  (SELECT id FROM skills WHERE name = 'Django'),
  'prerequisite',
  0.50
WHERE EXISTS (SELECT 1 FROM skills WHERE name = 'Python')
  AND EXISTS (SELECT 1 FROM skills WHERE name = 'Django')
ON CONFLICT DO NOTHING;

-- Node.js -> Express.js (prerequisite)
INSERT INTO skill_relationships (parent_skill_id, child_skill_id, relationship_type, weight)
SELECT
  (SELECT id FROM skills WHERE name = 'Node.js'),
  (SELECT id FROM skills WHERE name = 'Express.js'),
  'prerequisite',
  0.60
WHERE EXISTS (SELECT 1 FROM skills WHERE name = 'Node.js')
  AND EXISTS (SELECT 1 FROM skills WHERE name = 'Express.js')
ON CONFLICT DO NOTHING;

-- Java -> Spring Boot (prerequisite)
INSERT INTO skill_relationships (parent_skill_id, child_skill_id, relationship_type, weight)
SELECT
  (SELECT id FROM skills WHERE name = 'Java'),
  (SELECT id FROM skills WHERE name = 'Spring Boot'),
  'prerequisite',
  0.55
WHERE EXISTS (SELECT 1 FROM skills WHERE name = 'Java')
  AND EXISTS (SELECT 1 FROM skills WHERE name = 'Spring Boot')
ON CONFLICT DO NOTHING;

-- Python -> Machine Learning (related)
INSERT INTO skill_relationships (parent_skill_id, child_skill_id, relationship_type, weight)
SELECT
  (SELECT id FROM skills WHERE name = 'Python'),
  (SELECT id FROM skills WHERE name = 'Machine Learning'),
  'related',
  0.40
WHERE EXISTS (SELECT 1 FROM skills WHERE name = 'Python')
  AND EXISTS (SELECT 1 FROM skills WHERE name = 'Machine Learning')
ON CONFLICT DO NOTHING;

-- ============================================
-- SEED DATA: Skill Synonyms
-- ============================================

INSERT INTO skill_synonyms (skill_id, synonym)
SELECT id, 'JS' FROM skills WHERE name = 'JavaScript'
ON CONFLICT DO NOTHING;

INSERT INTO skill_synonyms (skill_id, synonym)
SELECT id, 'TS' FROM skills WHERE name = 'TypeScript'
ON CONFLICT DO NOTHING;

INSERT INTO skill_synonyms (skill_id, synonym)
SELECT id, 'ReactJS' FROM skills WHERE name = 'React'
ON CONFLICT DO NOTHING;

INSERT INTO skill_synonyms (skill_id, synonym)
SELECT id, 'React.js' FROM skills WHERE name = 'React'
ON CONFLICT DO NOTHING;

INSERT INTO skill_synonyms (skill_id, synonym)
SELECT id, 'Postgres' FROM skills WHERE name = 'PostgreSQL'
ON CONFLICT DO NOTHING;

INSERT INTO skill_synonyms (skill_id, synonym)
SELECT id, 'K8s' FROM skills WHERE name = 'Kubernetes'
ON CONFLICT DO NOTHING;

INSERT INTO skill_synonyms (skill_id, synonym)
SELECT id, 'Vue' FROM skills WHERE name = 'Vue.js'
ON CONFLICT DO NOTHING;

INSERT INTO skill_synonyms (skill_id, synonym)
SELECT id, 'GCP' FROM skills WHERE name = 'Google Cloud'
ON CONFLICT DO NOTHING;

INSERT INTO skill_synonyms (skill_id, synonym)
SELECT id, 'Mongo' FROM skills WHERE name = 'MongoDB'
ON CONFLICT DO NOTHING;

INSERT INTO skill_synonyms (skill_id, synonym)
SELECT id, 'ML' FROM skills WHERE name = 'Machine Learning'
ON CONFLICT DO NOTHING;

INSERT INTO skill_synonyms (skill_id, synonym)
SELECT id, 'DL' FROM skills WHERE name = 'Deep Learning'
ON CONFLICT DO NOTHING;
