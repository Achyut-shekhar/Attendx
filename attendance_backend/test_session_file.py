import requests
import sys

with open("test_session_output.txt", "w") as f:
    try:
        f.write("Sending POST request...\n")
        res = requests.post("http://127.0.0.1:8000/api/faculty/classes/45/sessions", json={})
        f.write(f"Status: {res.status_code}\n")
        f.write(f"Response: {res.text}\n")
    except Exception as e:
        f.write(f"Error: {e}\n")
