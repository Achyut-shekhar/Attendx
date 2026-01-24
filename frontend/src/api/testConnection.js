const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

export async function testBackendConnection() {
  console.log("🔍 Testing connection to:", API_URL);

  try {
    const res = await fetch(`${API_URL}/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "student@school.edu",   // sample email from your DB
        password: "password"           // sample password
      }),
    });

    const data = await res.json();
    console.log("✅ Backend response:", data);
  } catch (err) {
    console.error("❌ Could not connect:", err);
  }
}
