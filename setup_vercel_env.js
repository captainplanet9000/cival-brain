const token = 'NpXi1XlR8Zn9rD3U8dm4oP1s';

async function getProjectId() {
  const res = await fetch('https://api.vercel.com/v9/projects', {
    headers: { Authorization: `Bearer ${token}` }
  });
  const data = await res.json();
  const proj = data.projects.find(p => p.name === 'second-brain');
  return proj?.id;
}

async function setEnv(projectId, key, value) {
  // Try to create, if exists update
  const res = await fetch(`https://api.vercel.com/v10/projects/${projectId}/env`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ key, value, type: 'encrypted', target: ['production', 'preview', 'development'] })
  });
  const data = await res.json();
  if (data.error?.code === 'ENV_ALREADY_EXISTS') {
    // Get existing and update
    const listRes = await fetch(`https://api.vercel.com/v9/projects/${projectId}/env`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const listData = await listRes.json();
    const existing = listData.envs.find(e => e.key === key);
    if (existing) {
      await fetch(`https://api.vercel.com/v9/projects/${projectId}/env/${existing.id}`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ value })
      });
    }
    console.log(`Updated ${key}`);
  } else {
    console.log(`Set ${key}:`, data.created?.key || data.key || 'ok');
  }
}

async function main() {
  const projectId = await getProjectId();
  console.log('Project ID:', projectId);
  
  await setEnv(projectId, 'NEXT_PUBLIC_SUPABASE_URL', 'https://vusjcfushwxwksfuszjv.supabase.co');
  await setEnv(projectId, 'NEXT_PUBLIC_SUPABASE_ANON_KEY', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ1c2pjZnVzaHd4d2tzZnVzemp2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgyMzIzMjgsImV4cCI6MjA4MzgwODMyOH0.-sBIz04nAimMUGA7yVS2st80z_rIRvGcvI9qYTT7Ozg');
  await setEnv(projectId, 'SUPABASE_SERVICE_ROLE_KEY', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ1c2pjZnVzaHd4d2tzZnVzemp2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODIzMjMyOCwiZXhwIjoyMDgzODA4MzI4fQ.2Zg50H20XQUR4pC720ubPv-HNDHQa46wsKPYRg6p8cQ');
  
  console.log('Done!');
}

main().catch(console.error);
