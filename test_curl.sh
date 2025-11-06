#!/bin/bash
# Test the endpoint
curl -s "http://localhost:8000/api/student/classes?student_id=11" -H "Content-Type: application/json" | python -m json.tool
