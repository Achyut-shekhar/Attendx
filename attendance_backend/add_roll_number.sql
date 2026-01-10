-- Add roll_number column to class_enrollments table
-- This stores the student's roll number for each class they're enrolled in

ALTER TABLE class_enrollments 
ADD COLUMN IF NOT EXISTS roll_number VARCHAR(50);

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_class_enrollments_roll_number 
ON class_enrollments(class_id, roll_number);

-- Display success message
SELECT 'Migration completed successfully!' AS status;
