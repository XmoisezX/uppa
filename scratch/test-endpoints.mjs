async function testEndpoints() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  // Test SQL query endpoint
  try {
    const res = await fetch(`${url}/pg/query`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: key,
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({ query: "SELECT 1" }),
    });
    console.log("/pg/query status:", res.status, await res.text());
  } catch (e) {
    console.log("/pg/query err:", e.message);
  }

  try {
    const res = await fetch(`${url}/sql`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: key,
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({ query: "SELECT 1" }),
    });
    console.log("/sql status:", res.status, await res.text());
  } catch (e) {
    console.log("/sql err:", e.message);
  }
}

testEndpoints().catch(console.error);
