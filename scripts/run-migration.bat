@echo off
cd /d C:\Users\Anthony\clawd\second-brain
type scripts\migration.sql | npx supabase db execute --project-ref vusjcfushwxwksfuszjv
