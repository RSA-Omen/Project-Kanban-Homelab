#!/bin/bash

# Kanban + AI Assistant - Startup Script

PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
BACKEND_DIR="$PROJECT_DIR/backend"
FRONTEND_DIR="$PROJECT_DIR/frontend"

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  Kanban + AI Assistant                 ${NC}"
echo -e "${BLUE}========================================${NC}"

# Check if Python venv exists, create if not
if [ ! -d "$BACKEND_DIR/venv" ]; then
    echo -e "${GREEN}Creating Python virtual environment...${NC}"
    python3 -m venv "$BACKEND_DIR/venv"
fi

# Activate venv and install dependencies
echo -e "${GREEN}Installing backend dependencies...${NC}"
source "$BACKEND_DIR/venv/bin/activate"
pip install -q -r "$BACKEND_DIR/requirements.txt"

# Start Flask backend in background
echo -e "${GREEN}Starting Flask backend on port 5002...${NC}"
cd "$BACKEND_DIR"
python app.py &
BACKEND_PID=$!

# Wait for backend to start
sleep 2

# Start frontend server
echo -e "${GREEN}Starting frontend server on port 8085...${NC}"
cd "$FRONTEND_DIR"
python3 -m http.server 8085 &
FRONTEND_PID=$!

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  Servers started successfully!         ${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "  Frontend: ${BLUE}http://localhost:8085${NC}"
echo -e "  Backend:  ${BLUE}http://localhost:5002${NC}"
# If running in WSL, Windows browser may need the WSL IP instead of localhost
if [ -n "$WSL_DISTRO_NAME" ] || grep -qi microsoft /proc/version 2>/dev/null; then
    WSL_IP=$(hostname -I 2>/dev/null | awk '{print $1}')
    if [ -n "$WSL_IP" ]; then
        echo ""
        echo -e "  ${GREEN}From Windows browser (if localhost fails):${NC}"
        echo -e "  ${BLUE}http://${WSL_IP}:8085${NC}"
    fi
fi
echo ""
echo -e "  Press Ctrl+C to stop all servers"
echo ""

# Trap Ctrl+C to cleanup
cleanup() {
    echo ""
    echo -e "${GREEN}Stopping servers...${NC}"
    kill $BACKEND_PID 2>/dev/null
    kill $FRONTEND_PID 2>/dev/null
    exit 0
}

trap cleanup SIGINT SIGTERM

# Wait for processes
wait
