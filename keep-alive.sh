#!/bin/bash
# Keep dev server alive
cd /home/z/my-project
while true; do
  # Check if server is responding
  if ! curl -s -o /dev/null --max-time 5 "http://localhost:3000/" 2>/dev/null; then
    echo "[$(date)] Server not responding, starting..."
    pkill -9 -f "next dev" 2>/dev/null
    sleep 2
    NODE_OPTIONS="--max-old-space-size=1024" nohup bun run dev > dev.log 2>&1 &
    disown
    sleep 15
    if curl -s -o /dev/null --max-time 10 "http://localhost:3000/" 2>/dev/null; then
      echo "[$(date)] Server started successfully"
    else
      echo "[$(date)] Server failed to start"
    fi
  fi
  sleep 10
done
