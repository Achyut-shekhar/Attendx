import requests
import time
from concurrent.futures import ThreadPoolExecutor
import statistics

# --- CONFIGURATION ---
# Change this to your Render URL: https://facul-student-hub.onrender.com
# Or use http://localhost:8000 for local testing
BASE_URL = "https://facul-student-hub.onrender.com"
CONCURRENT_USERS = 50
USER_ID = 61  # Using the ID from your previous logs

def send_single_request(user_index):
    """Simulates one user checking their notifications."""
    url = f"{BASE_URL}/api/notifications/{USER_ID}/unread-count"
    try:
        start_time = time.perf_counter()
        response = requests.get(url, timeout=10)
        end_time = time.perf_counter()
        
        return {
            "status": response.status_code,
            "latency": end_time - start_time,
            "success": response.status_code == 200
        }
    except Exception as e:
        return {
            "status": "ERROR",
            "latency": 0,
            "success": False,
            "error": str(e)
        }

def run_concurrency_test():
    print(f"🚀 Starting Concurrency Test: {CONCURRENT_USERS} users hitting {BASE_URL}")
    print(f"------------------------------------------------------------------")
    
    start_test = time.perf_counter()
    
    # Executing 50 requests in parallel using threads
    with ThreadPoolExecutor(max_workers=CONCURRENT_USERS) as executor:
        results = list(executor.map(send_single_request, range(CONCURRENT_USERS)))
    
    end_test = time.perf_counter()
    
    # --- ANALYSIS ---
    latencies = [r["latency"] for r in results if r["success"]]
    success_count = sum(1 for r in results if r["success"])
    fail_count = CONCURRENT_USERS - success_count
    
    total_time = end_test - start_test
    
    print(f"✅ Test Finished in {total_time:.2f} seconds")
    print(f"📈 Total Requests: {CONCURRENT_USERS}")
    print(f"🟢 Success: {success_count}")
    print(f"🔴 Failed: {fail_count}")
    
    if latencies:
        print(f"🏎️  Average Latency: {statistics.mean(latencies):.3f}s")
        print(f"⚡ Fastest Request: {min(latencies):.3f}s")
        print(f"🐢 Slowest Request: {max(latencies):.3f}s")
    
    if fail_count > 0:
        print("\n❌ Errors Found:")
        errors = set(r.get("error", f"Status {r['status']}") for r in results if not r["success"])
        for err in errors:
            print(f"   - {err}")
    
    if success_count == CONCURRENT_USERS:
        print("\n🏆 PERFECT SCORE! The backend handled all 50 users simultaneously.")
    elif success_count > (0.9 * CONCURRENT_USERS):
        print("\n⚠️  Good performance, but a few requests timed out/failed.")
    else:
        print("\n🚨 Scaling issues detected. Check Render logs for database connection limits.")

if __name__ == "__main__":
    run_concurrency_test()
