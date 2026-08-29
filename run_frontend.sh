#!/usr/bin/env bash
set -euo pipefail

echo "============================================================"
echo " Starting the React frontend"
echo "============================================================"
echo
echo "This terminal runs the Vite development server."
echo "Vite serves the React app and automatically refreshes the browser"
echo "when frontend source files change."
echo
echo "The frontend normally opens at:"
echo "  http://localhost:5173"
echo
echo "The frontend calls the backend directly at:"
echo "  http://localhost:3001"
echo "(via the cors package on Express, not a Vite proxy)"
echo
echo "Press Ctrl + C to stop the frontend."
echo

cd client
npm run dev -- --host 0.0.0.0
