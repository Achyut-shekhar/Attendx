# Features & Roadmap

## Implemented Features (Current Version)

### ✅ Core Attendance
- [x] **Code-Based Check-in:** 6-character dynamic alphanumeric codes.
- [x] **Location Fencing:** Optional GPS validation radius (e.g., 50m).
- [x] **Manual Override:** Faculty can manually mark/unmark students.

### ✅ Scalability & Performance
- [x] **Optimized Polling:** Frontend refresh rates tuned to 10s-20s.
- [x] **Write Reduction:** Notification spam disabled during high-traffic windows.
- [x] **Debounced UI:** Buttons lock to prevent duplicate API calls.

### ✅ Reporting
- [x] **Dashboard:** Visual stats (Present/Absent counts).
- [x] **Excel Export:** Full-featured .xlsx download for admin submission.
- [x] **History:** Student view of personal attendance percentages.

## Known Limitations (To be addressed in v2)
1. **Notifications:** Currently disabled for performance reasons on the free tier.
2. **Real-time Sockets:** Updates are polling-based (10s delay), not instant WebSockets.
3. **Offline Mode:** Requires active internet connection.

## Future Roadmap (Planned)
- [ ] **QR Code Scanning:** Replace typing codes with instant camera scanning.
- [ ] **Face Recognition:** Experimental biometric validation.
- [ ] **Push Notifications:** Use native mobile push instead of DB polling.
- [ ] **Offline Sync:** Allow offline check-ins that sync when connection restores.
