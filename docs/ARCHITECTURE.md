# System Architecture

## Overview
AttendX is a scalable full-stack web application for university attendance management. It is designed to handle high-concurrency classroom environments where 50-200 students may attempt to check in simultaneously.

## Tech Stack
- **Frontend:** React (Vite), Tailwind CSS, Shadcn UI
- **Backend:** FastAPI (Python), SQLAlchemy, Asyncpg
- **Database:** PostgreSQL
- **Hosting:** Render (Free Tier Optimized)

## Core Components

### 1. Frontend Architecture
- **State Management:**
  - `AuthContext`: Manages user sessions and role-based access.
  - `NotificationContext`: Handles long-polling for updates (Configured to 20s interval for performance).
- **Optimization Strategy:**
  - **Debounced Polling:** Polling intervals increased to 10-20s to prevent server overloading.
  - **Loading States:** Critical buttons (Join, Submit) disable on click to prevent request spamming.
  - **Traffic Minimization:** Unnecessary background fetches are silenced.

### 2. Backend Architecture
- **API Design:** RESTful endpoints using standard HTTP methods.
- **Concurrency:** Fully asynchronous (`async/await`) request handling to maximize throughput on single-core workers.
- **Database Access:**
  - **Write Optimization:** Notifications are disabled for critical paths (Attendance Submission) to halve database write load.
  - **Transaction Safety:** Session management uses robust error handling to prevent "stuck" sessions during partial failures.

### 3. Database Schema
- **Users:** Stores authentication and profile data.
- **Classes:** Links Faculty to their Courses.
- **ClassEnrollments:** Maps Students to Classes (Many-to-Many).
- **AttendanceSessions:** Represents a single live class period.
- **AttendanceRecords:** The core ledger of student presence for a specific session.
- **Notifications:** (Feature flagged OFF for performance) System-wide alerts.

## Scalability Features
- **Notification Feature Flag:** Notifications are programmatically disabled for high-volume endpoints to ensure the server can process actual attendance data without getting bogged down by non-essential writes.
- **Client-Side Throttling:** The UI actively prevents users from flooding the server with duplicate requests.
