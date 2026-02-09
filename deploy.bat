cd /d C:\Users\Anthony\clawd\second-brain
del check-scripts-db.js check-tables.js 2>nul
git add -A
git commit -m "feat: scripts system with AI generation, 95 scripts imported, 3 frameworks"
git push origin master
vercel --yes --prod --token NpXi1XlR8Zn9rD3U8dm4oP1s
