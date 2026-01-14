-- Add roll_number column to class_enrollments table
-- This stores the student's roll number for each class they're enrolled in

ALTER TABLE class_enrollments 
ADD COLUMN IF NOT EXISTS roll_number VARCHAR(50);

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_class_enrollments_roll_number 
ON class_enrollments(class_id, roll_number);

-- Add section column so each enrollment can store section info (e.g., A/B)
ALTER TABLE class_enrollments 
ADD COLUMN IF NOT EXISTS section VARCHAR(50);

-- Index section for quick filtering per class
CREATE INDEX IF NOT EXISTS idx_class_enrollments_section 
ON class_enrollments(class_id, section);

-- Display success message
SELECT 'Migration completed successfully!' AS status;
