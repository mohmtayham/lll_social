@echo off
echo Starting Redis Cluster in WSL...
wsl -d Ubuntu bash -c "~/start-redis.sh"
pause