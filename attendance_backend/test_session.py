import requests

try:
    print("Sending POST request...")
    res = requests.post("http://127.0.0.1:8000/api/faculty/classes/45/sessions", json={})
    print(f"Status: {res.status_code}")
    print(f"Response: {res.text}")
except Exception as e:
    print(f"Error: {e}")
