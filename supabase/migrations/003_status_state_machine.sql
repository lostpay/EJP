-- Phase 2: Application Status State Machine Validation
-- Ensures only valid status transitions are allowed

-- ============================================
-- STATUS TRANSITION VALIDATION FUNCTION
-- ============================================

-- Valid transitions:
-- pending -> reviewing, rejected, withdrawn
-- reviewing -> interview, rejected, withdrawn
-- interview -> offered, rejected, withdrawn
-- offered -> rejected (rare, but possible)
-- rejected -> (terminal state, no transitions)
-- withdrawn -> (terminal state, no transitions)

CREATE OR REPLACE FUNCTION validate_application_status_transition()
RETURNS TRIGGER AS $$
DECLARE
  valid_transitions JSONB := '{
    "pending": ["reviewing", "rejected", "withdrawn"],
    "reviewing": ["interview", "rejected", "withdrawn"],
    "interview": ["offered", "rejected", "withdrawn"],
    "offered": ["rejected"],
    "rejected": [],
    "withdrawn": []
  }'::JSONB;
  allowed_statuses JSONB;
BEGIN
  -- Skip validation if status hasn't changed
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  -- Get allowed transitions for the current status
  allowed_statuses := valid_transitions->OLD.status;

  -- Check if the new status is in the allowed transitions
  IF NOT (allowed_statuses ? NEW.status) THEN
    RAISE EXCEPTION 'Invalid status transition from % to %. Allowed transitions: %',
      OLD.status, NEW.status, allowed_statuses;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger (only if it doesn't exist)
DROP TRIGGER IF EXISTS trigger_validate_status_transition ON applications;
CREATE TRIGGER trigger_validate_status_transition
  BEFORE UPDATE ON applications
  FOR EACH ROW
  EXECUTE FUNCTION validate_application_status_transition();

-- ============================================
-- HELPER FUNCTION TO GET VALID NEXT STATUSES
-- ============================================

CREATE OR REPLACE FUNCTION get_valid_next_statuses(current_status TEXT)
RETURNS TEXT[] AS $$
DECLARE
  valid_transitions JSONB := '{
    "pending": ["reviewing", "rejected", "withdrawn"],
    "reviewing": ["interview", "rejected", "withdrawn"],
    "interview": ["offered", "rejected", "withdrawn"],
    "offered": ["rejected"],
    "rejected": [],
    "withdrawn": []
  }'::JSONB;
BEGIN
  RETURN ARRAY(SELECT jsonb_array_elements_text(valid_transitions->current_status));
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ============================================
-- ADD SORT ORDER FOR STATUS DISPLAY
-- ============================================

-- This function returns a numeric sort order for statuses
-- Useful for sorting applications by progress
CREATE OR REPLACE FUNCTION get_status_sort_order(status TEXT)
RETURNS INTEGER AS $$
BEGIN
  RETURN CASE status
    WHEN 'pending' THEN 1
    WHEN 'reviewing' THEN 2
    WHEN 'interview' THEN 3
    WHEN 'offered' THEN 4
    WHEN 'rejected' THEN 5
    WHEN 'withdrawn' THEN 6
    ELSE 0
  END;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ============================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================

COMMENT ON FUNCTION validate_application_status_transition() IS
'Validates that application status transitions follow the defined state machine.
Valid paths: pending -> reviewing -> interview -> offered
Any state can transition to rejected or withdrawn (except terminal states).';

COMMENT ON FUNCTION get_valid_next_statuses(TEXT) IS
'Returns an array of valid next statuses for a given current status.
Useful for building UI dropdowns that only show valid options.';

COMMENT ON FUNCTION get_status_sort_order(TEXT) IS
'Returns a numeric sort order for application statuses.
Used for sorting applications by their progress in the hiring pipeline.';
