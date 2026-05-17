async function checkBuckets() {
  const url = "https://iqthgcxmhxxejqprzdys.supabase.co/storage/v1/bucket";
  const key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlxdGhnY3htaHh4ZWpxcHJ6ZHlzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODMwNTU4MiwiZXhwIjoyMDkzODgxNTgyfQ.xRW59WkElTtzC8FLk1tPkJl2AJDq9QljyCEJwRCQ0NQ";
  
  const res = await fetch(url, {
    headers: {
      "apikey": key,
      "Authorization": `Bearer ${key}`
    }
  });
  
  const data = await res.json();
  console.log("BUCKETS:", data);
}

checkBuckets();
