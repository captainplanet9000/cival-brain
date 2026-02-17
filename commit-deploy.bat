@echo off
cd C:\Users\Anthony\clawd\second-brain
git add -A
git commit -m "feat: all 113 Inworld voices live API, fix Speaker 1 stripping, full best practices, 310 scripts cleaned"
cmd /c deploy.bat
