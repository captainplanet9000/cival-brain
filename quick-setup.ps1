# Quick Setup Script for Multi-Agent Chat System
# Run this from the second-brain directory

Write-Host "🔧 Setting up Multi-Agent Chat System..." -ForegroundColor Cyan
Write-Host ""

# Step 1: Create the tables via Supabase SQL
Write-Host "Step 1: Creating database tables..." -ForegroundColor Yellow
Write-Host "Please go to: https://supabase.com/dashboard/project/vusjcfushwxwksfuszjv/sql/new" -ForegroundColor White
Write-Host "Copy and paste the contents of 'supabase-migration.sql' and click 'Run'" -ForegroundColor White
Write-Host ""
Read-Host "Press Enter after you've created the tables"

# Step 2: Seed the agents
Write-Host ""
Write-Host "Step 2: Seeding the 3 agents..." -ForegroundColor Yellow

try {
    $response = Invoke-RestMethod -Uri "http://localhost:3333/api/brain-agents/seed" -Method POST -ContentType "application/json"
    
    if ($response.success) {
        Write-Host "✅ Agents seeded successfully!" -ForegroundColor Green
        Write-Host ""
        Write-Host "Agents created:" -ForegroundColor Cyan
        foreach ($agent in $response.agents) {
            Write-Host "  $($agent.emoji) $($agent.name)" -ForegroundColor White
        }
    } else {
        Write-Host "❌ Failed to seed agents: $($response.error)" -ForegroundColor Red
    }
} catch {
    Write-Host "❌ Error calling seed endpoint: $_" -ForegroundColor Red
    Write-Host "Make sure the dev server is running (npm run dev)" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "🎉 Setup complete!" -ForegroundColor Green
Write-Host "Open http://localhost:3333/chat to try the multi-agent chat system" -ForegroundColor Cyan
Write-Host ""
