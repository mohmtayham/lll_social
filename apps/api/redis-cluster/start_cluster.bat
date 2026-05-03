@echo off
REM استبدل C:\redis\ بالمسار الحقيقي الذي وجدته
set REDIS_PATH="C:\redis\redis-server.exe"

start "Node 7000" cmd /k "cd 7000 && %REDIS_PATH% redis.conf"
start "Node 7001" cmd /k "cd 7001 && %REDIS_PATH% redis.conf"
start "Node 7002" cmd /k "cd 7002 && %REDIS_PATH% redis.conf"
