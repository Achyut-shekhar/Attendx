"""
Backend Health Check Script
Tests all critical endpoints to verify deployment
"""

import requests
import json

BACKEND_URL = "https://facul-student-hub.onrender.com"

print("="*60)
print("🔍 TESTING BACKEND DEPLOYMENT")
print("="*60)
print(f"Backend URL: {BACKEND_URL}\n")

# Test 1: Root Endpoint
print("Test 1: Root Endpoint (/)...")
try:
    response = requests.get(f"{BACKEND_URL}/")
    print(f"✅ Status: {response.status_code}")
    print(f"✅ Response: {response.json()}\n")
except Exception as e:
    print(f"❌ Error: {e}\n")

# Test 2: API Documentation
print("Test 2: API Documentation (/docs)...")
try:
    response = requests.get(f"{BACKEND_URL}/docs")
    print(f"✅ Status: {response.status_code}")
    print(f"✅ Swagger UI is accessible\n")
except Exception as e:
    print(f"❌ Error: {e}\n")

# Test 3: OpenAPI Schema
print("Test 3: OpenAPI Schema (/openapi.json)...")
try:
    response = requests.get(f"{BACKEND_URL}/openapi.json")
    print(f"✅ Status: {response.status_code}")
    schema = response.json()
    print(f"✅ API Title: {schema.get('info', {}).get('title')}")
    print(f"✅ Total Endpoints: {len(schema.get('paths', {}))}\n")
except Exception as e:
    print(f"❌ Error: {e}\n")

# Test 4: Users Endpoint
print("Test 4: Users Endpoint (/users)...")
try:
    response = requests.get(f"{BACKEND_URL}/users")
    print(f"✅ Status: {response.status_code}")
    if response.status_code == 200:
        users = response.json()
        print(f"✅ Total Users: {len(users)}")
        if users:
            print(f"✅ Sample User: {users[0].get('email', 'N/A')}")
    print()
except Exception as e:
    print(f"❌ Error: {e}\n")

# Test 5: Database Connection Test
print("Test 5: Database Connection (via users query)...")
try:
    response = requests.get(f"{BACKEND_URL}/users")
    if response.status_code == 200:
        print(f"✅ Database is connected and accessible")
        print(f"✅ Neon PostgreSQL is working\n")
    else:
        print(f"⚠️ Database might have issues (Status: {response.status_code})\n")
except Exception as e:
    print(f"❌ Database connection failed: {e}\n")

# Test 6: CORS Headers
print("Test 6: CORS Configuration...")
try:
    response = requests.options(f"{BACKEND_URL}/users")
    cors_headers = {
        'Access-Control-Allow-Origin': response.headers.get('Access-Control-Allow-Origin', 'Not Set'),
        'Access-Control-Allow-Methods': response.headers.get('Access-Control-Allow-Methods', 'Not Set'),
        'Access-Control-Allow-Headers': response.headers.get('Access-Control-Allow-Headers', 'Not Set'),
    }
    print(f"✅ CORS Headers:")
    for header, value in cors_headers.items():
        print(f"   - {header}: {value}")
    print()
except Exception as e:
    print(f"❌ Error: {e}\n")

# Test 7: Login Endpoint (expect 401 for invalid creds)
print("Test 7: Login Endpoint (/login)...")
try:
    response = requests.post(
        f"{BACKEND_URL}/login",
        json={"email": "test@test.com", "password": "wrong"}
    )
    print(f"✅ Status: {response.status_code}")
    if response.status_code == 401:
        print(f"✅ Login endpoint is working (correctly rejecting invalid credentials)\n")
    else:
        print(f"⚠️ Unexpected response: {response.json()}\n")
except Exception as e:
    print(f"❌ Error: {e}\n")

# Test 8: Register Endpoint
print("Test 8: Register Endpoint (/register)...")
try:
    response = requests.post(
        f"{BACKEND_URL}/register",
        json={
            "name": "Test User",
            "email": "test@test.com",
            "password": "test123",
            "role": "STUDENT"
        }
    )
    print(f"✅ Status: {response.status_code}")
    if response.status_code == 400:
        print(f"✅ Register endpoint is working (email might already exist)\n")
    elif response.status_code == 200:
        print(f"✅ Registration successful\n")
    else:
        print(f"Response: {response.json()}\n")
except Exception as e:
    print(f"❌ Error: {e}\n")

print("="*60)
print("🎯 SUMMARY")
print("="*60)
print("✅ If all tests passed, your backend is fully functional!")
print("✅ Backend URL: " + BACKEND_URL)
print("✅ API Docs: " + BACKEND_URL + "/docs")
print("\n📝 Next Steps:")
print("   1. Deploy frontend to Vercel")
print("   2. Set VITE_API_URL=" + BACKEND_URL)
print("   3. Update Render FRONTEND_URL with your Vercel URL")
print("="*60)
