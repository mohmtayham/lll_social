@echo off
echo Starting Redis Cluster in WSL...
wsl -d Ubuntu -u hp sh /home/hp/start-redis.sh
pause