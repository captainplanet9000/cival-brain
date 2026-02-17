@echo off
cd C:\Users\Anthony\clawd\second-brain
npm run build 2>&1 | findstr /n "Error"
