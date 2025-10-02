#!/bin/bash
# Quick progress checker for database computation

echo "📊 Database Computation Status"
echo "================================"
echo ""

# Check if process is running
if ps aux | grep -q "[n]ode scripts/compute-all-cities.mjs"; then
    echo "✅ Status: RUNNING"
    echo ""
    echo "📈 Latest Progress:"
    tail -5 compute-progress.log | grep "Processed:"
    echo ""
    echo "⏱️  To watch live: tail -f compute-progress.log"
else
    echo "⚠️  Status: NOT RUNNING"
    echo ""
    if [ -f compute-progress.log ]; then
        echo "📈 Last recorded progress:"
        tail -1 compute-progress.log | grep "Processed:"
    fi
fi

echo ""
