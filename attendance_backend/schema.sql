-- ======================
-- Users (Students + Faculty)
-- ======================
CREATE TABLE Users (
    user_id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role VARCHAR(20) NOT NULL,
    roll_number INT,
    CONSTRAINT chk_users_role CHECK (role IN ('STUDENT', 'FACULTY'))
);

-- ======================
-- Classes
-- ======================
CREATE TABLE Classes (
    class_id SERIAL PRIMARY KEY,
    faculty_id INT NOT NULL,
    class_name VARCHAR(150) NOT NULL,
    join_code VARCHAR(20) UNIQUE NOT NULL,
    CONSTRAINT fk_classes_faculty FOREIGN KEY (faculty_id) REFERENCES Users(user_id) ON DELETE CASCADE
);

-- ======================
-- Class Enrollments
-- ======================
CREATE TABLE Class_Enrollments (
    enrollment_id SERIAL PRIMARY KEY,
    class_id INT NOT NULL,
    student_id INT NOT NULL,
    joined_at TIMESTAMP,                       
    UNIQUE (class_id, student_id),
    CONSTRAINT fk_enrollments_class FOREIGN KEY (class_id) REFERENCES Classes(class_id) ON DELETE CASCADE,
    CONSTRAINT fk_enrollments_student FOREIGN KEY (student_id) REFERENCES Users(user_id) ON DELETE CASCADE
);

-- ======================
-- Attendance Sessions
-- ======================
CREATE TABLE Attendance_Sessions (
    session_id SERIAL PRIMARY KEY,
    class_id INT NOT NULL,
    status VARCHAR(20) DEFAULT 'ACTIVE',
    start_time TIMESTAMP,                       
    end_time TIMESTAMP,
    generated_code VARCHAR(20) NOT NULL,
    CONSTRAINT fk_sessions_class FOREIGN KEY (class_id) REFERENCES Classes(class_id) ON DELETE CASCADE,
    CONSTRAINT chk_sessions_status CHECK (status IN ('ACTIVE', 'CLOSED'))
);

-- ======================
-- Attendance Records
-- ======================
CREATE TABLE Attendance_Records (
    record_id SERIAL PRIMARY KEY,
    session_id INT NOT NULL,
    student_id INT NOT NULL,
    status VARCHAR(20) NOT NULL,
    marked_at TIMESTAMP,                        
    UNIQUE (session_id, student_id),
    CONSTRAINT fk_records_session FOREIGN KEY (session_id) REFERENCES Attendance_Sessions(session_id) ON DELETE CASCADE,
    CONSTRAINT fk_records_student FOREIGN KEY (student_id) REFERENCES Users(user_id) ON DELETE CASCADE,
    CONSTRAINT chk_records_status CHECK (status IN ('PRESENT', 'ABSENT', 'LATE'))
);

-- ======================
-- Notifications (Optional)
-- ======================
CREATE TABLE Notifications (
    notification_id SERIAL PRIMARY KEY,
    user_id INT NOT NULL,
    type VARCHAR(50) NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_notifications_user FOREIGN KEY (user_id) REFERENCES Users(user_id) ON DELETE CASCADE,
    CONSTRAINT chk_notifications_type CHECK (type IN ('ATTENDANCE_STATUS', 'SESSION_START', 'SESSION_END'))
);
