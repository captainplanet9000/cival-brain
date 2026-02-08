cd /d C:\Users\Anthony\clawd\second-brain
del test-gateway.js test-gateway2.js test-chat.js 2>nul
git add -A
git commit -m "fix: real AI chat via OpenClaw chat completions endpoint"
git push origin master
vercel --yes --prod --token NpXi1XlR8Zn9rD3U8dm4oP1s
