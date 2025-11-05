# Faculty Student Hub

A web application for managing student attendance using QR codes and location-based verification.

## Features

- Faculty can create and manage classes
- Generate QR codes for attendance
- Location-based attendance verification
- Real-time attendance tracking
- Student dashboard for viewing attendance records
- Protected routes and API endpoints
- Persistent data storage in PostgreSQL database
- Real-time notifications for session events
- Comprehensive attendance history and statistics

- **Faculty Features**

  - Create and manage classes
  - Generate unique join codes for classes
  - Start/end attendance sessions
  - View attendance records and statistics
  - Manage student enrollments

- **Student Features**
  - Join classes using unique codes
  - Mark attendance using verification codes
  - View attendance history and statistics
  - Real-time session notifications

## Tech Stack

### Frontend

- React with Vite
- TailwindCSS
- Shadcn UI components
- React Query for data fetching
- React Router for navigation

### Backend

- FastAPI (Python)
- PostgreSQL Database
- JWT for authentication
- RESTful API architecture

### Database Structure

- Users (Faculty and Students)
- Classes
- Class Enrollments
- Attendance Sessions
- Attendance Records
- Notifications

### Storage Architecture

- Database: Stores all persistent data including users, classes, attendance records, and notifications
- LocalStorage: Manages session data like authentication tokens

## Getting Started

## Prerequisites

- Python 3.11+
- Node.js 16+
- PostgreSQL database

## Setup

### Backend Setup

1. Create and activate a virtual environment:

```bash
python -m venv venv
source venv/bin/activate  # Linux/Mac
.\\venv\\Scripts\\Activate.ps1  # Windows
```

2. Install backend dependencies:

```bash
cd attendance_backend
pip install -r requirements.txt
```

3. Set up the PostgreSQL database:

- Create a new database
- Copy `.env.example` to `.env` and update the database connection string
- Run database migrations:

```bash
python database_manager.py
```

4. Start the backend server:

```bash
python -m uvicorn main:app --reload
```

The backend will be running at http://127.0.0.1:8000

### Frontend Setup

1. Install frontend dependencies:

```bash
npm install
```

2. Create a `.env` file in the root directory with:

```
VITE_API_URL=http://127.0.0.1:8000
```

3. Start the development server:

```bash
npm run dev
```

The frontend will be running at http://localhost:5173

## Test Accounts

- Faculty: faculty@school.edu (password: password)
- Student: student@school.edu (password: password)

#### Stopping the Servers

- If using PowerShell script: The script handles cleanup automatically
- If running manually: Use Ctrl+C in each terminal window
- If processes are stuck: Run `taskkill /F /IM node.exe` (Windows) or `pkill node` (Unix)

### Test Credentials

#### Faculty Account

- Email: faculty@school.edu
- Password: password

#### Student Account

- Email: student@school.edu
- Password: password

## Project Structure

```
facul-student-hub/
├── attendance_backend/   # FastAPI backend
│   ├── database.py      # Database connection
│   ├── queries.py       # SQL queries
│   ├── main.py         # API endpoints
│   └── requirements.txt # Python dependencies
│
├── src/                 # Frontend source code
│   ├── components/      # React components
│   │   ├── ui/         # Shadcn UI components
│   │   ├── layout/     # Layout components
│   │   └── attendance/ # Attendance components
│   ├── contexts/       # React contexts
│   ├── hooks/          # Custom hooks
│   ├── api/           # API services
│   ├── lib/           # Utilities
│   ├── pages/         # Page components
│   └── main.jsx       # Entry point
│
├── public/             # Static assets
├── .env               # Environment variables
└── package.json
```

## API Endpoints

### Authentication

- POST `/api/auth/login` - User login
- GET `/api/auth/me` - Get current user

### Faculty Routes

- GET `/api/faculty/classes` - Get faculty's classes
- POST `/api/faculty/classes` - Create a new class
- POST `/api/faculty/classes/:classId/sessions` - Start attendance session
- PUT `/api/faculty/classes/:classId/sessions/:sessionId/end` - End attendance session

### Student Routes

- GET `/api/student/classes` - Get enrolled classes
- POST `/api/student/classes/join` - Join a class using code
- POST `/api/student/attendance` - Mark attendance

## Development

### Directory Structure Details

- `backend/src/controllers/` - Business logic
- `backend/src/middleware/` - Custom middleware (auth, error handling)
- `backend/src/routes/` - API route definitions
- `backend/src/store/` - In-memory data store and helper functions
- `src/components/` - Reusable React components
- `src/contexts/` - React context providers
- `src/services/` - API integration services

### Available Scripts

- `npm run dev` - Start the frontend development server
- `python -m uvicorn main:app --reload` - Start the backend server
- `npm run build` - Build frontend for production
- `npm run preview` - Preview production build

### Database Tools

- `python database_manager.py` - Run database migrations and setup
- `python view_database.py` - View current database contents (users, classes, attendance, etc.)
- `python create_demo_users.py` - Create demo users and sample data

## Deployment

### Build for Production

```bash
npm run build
```

This creates a `dist` folder with optimized production files.

### Deploy to Static Hosting

The built files in the `dist` folder can be deployed to any static hosting service such as:

- Vercel
- Netlify
- GitHub Pages
- AWS S3
- Firebase Hosting

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For support and questions, please open an issue in the GitHub repository.
