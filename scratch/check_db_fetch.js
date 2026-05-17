async function check() {
  const url = "https://iqthgcxmhxxejqprzdys.supabase.co/rest/v1/leads?select=id";
  const key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlxdGhnY3htaHh4ZWpxcHJ6ZHlzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODMwNTU4MiwiZXhwIjoyMDkzODgxNTgyfQ.xRW59WkElTtzC8FLk1tPkJl2AJDq9QljyCEJwRCQ0NQ";
  
  const res = await fetch(url, {
    headers: {
      "apikey": key,
      "Authorization": `Bearer ${key}`
    }
  });
  
  const data = await res.json();
  console.log("LEADS_COUNT:", data.length);

  const campRes = await fetch("https://iqthgcxmhxxejqprzdys.supabase.co/rest/v1/campaigns?select=name", {
    headers: {
      "apikey": key,
      "Authorization": `Bearer ${key}`
    }
  });
  const campData = await campRes.json();
  console.log("CAMPAIGNS:", campData.map(c => c.name));
}

check();
