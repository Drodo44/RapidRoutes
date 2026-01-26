#!/bin/bash
#
# RapidRoutes Health Monitoring Script
# This script pings the API healthcheck endpoint every 15 minutes,
# logs the responses, and sends alerts if the status code is not 200.
#
# Usage:
#   ./monitor-health.sh             # Run in foreground
#   ./monitor-health.sh &           # Run in background
#   ./monitor-health.sh cron        # Set up as a cron job
#

# Configuration
API_URL="https://rapid-routes.vercel.app/api/healthcheck"
LOG_FILE="/workspaces/RapidRoutes/logs/health.log"
ALERT_LOG="/workspaces/RapidRoutes/logs/alerts.log"
CHECK_INTERVAL=900  # 15 minutes in seconds
SLACK_WEBHOOK_URL="https://hooks.slack.com/services/YOUR_WEBHOOK_URL"  # Replace with your webhook URL

# Make sure log directory exists
mkdir -p "$(dirname "$LOG_FILE")"
mkdir -p "$(dirname "$ALERT_LOG")"

# Function to send notification to Slack
send_slack_alert() {
    local status="$1"
    local message="$2"
    local timestamp="$3"
    
    if [[ -n "$SLACK_WEBHOOK_URL" && "$SLACK_WEBHOOK_URL" != "https://hooks.slack.com/services/YOUR_WEBHOOK_URL" ]]; then
        # Send to Slack webhook
        curl -s -X POST -H 'Content-type: application/json' \
             --data "{
                \"blocks\": [
                    {
                        \"type\": \"header\",
                        \"text\": {
                            \"type\": \"plain_text\",
                            \"text\": \"🚨 RapidRoutes Health Alert\"
                        }
                    },
                    {
                        \"type\": \"section\",
                        \"fields\": [
                            {
                                \"type\": \"mrkdwn\",
                                \"text\": \"*Status:*\n$status\"
                            },
                            {
                                \"type\": \"mrkdwn\",
                                \"text\": \"*Time:*\n$timestamp\"
                            }
                        ]
                    },
                    {
                        \"type\": \"section\",
                        \"text\": {
                            \"type\": \"mrkdwn\",
                            \"text\": \"*Details:*\n$message\"
                        }
                    },
                    {
                        \"type\": \"context\",
                        \"elements\": [
                            {
                                \"type\": \"mrkdwn\",
                                \"text\": \"<https://rapid-routes.vercel.app|Open RapidRoutes>\"
                            }
                        ]
                    }
                ]
             }" "$SLACK_WEBHOOK_URL" > /dev/null
    fi
}

# Function to log health check results
log_health_check() {
    local timestamp="$1"
    local status_code="$2"
    local response_time="$3"
    local response_body="$4"
    
    # Truncate response body to prevent massive logs
    local truncated_body="${response_body:0:100}"
    if [[ ${#response_body} -gt 100 ]]; then
        truncated_body="$truncated_body...(truncated)"
    fi
    
    echo "[$timestamp] Status: $status_code, Time: ${response_time}ms, Response: $truncated_body" >> "$LOG_FILE"
    
    # Alert on non-200 responses
    if [[ "$status_code" != "200" ]]; then
        echo "[$timestamp] ALERT! Non-200 status code: $status_code, Response: $truncated_body" >> "$ALERT_LOG"
        echo -e "\e[31m[$timestamp] ALERT! Status code: $status_code\e[0m" >&2
        
        # Send alert
        send_slack_alert "$status_code" "API Health Check Failed: $truncated_body" "$timestamp"
    fi
}

# Function to check API health
check_health() {
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    local start_time=$(date +%s%3N)
    
    # Make API request with timeout of 10 seconds
    local response=$(curl -s -w "\n%{http_code}" --max-time 10 "$API_URL")
    local exit_code=$?
    local end_time=$(date +%s%3N)
    
    # Calculate response time in milliseconds
    local response_time=$((end_time - start_time))
    
    # Parse response
    local status_code=$(echo "$response" | tail -n1)
    local response_body=$(echo "$response" | sed '$d')
    
    # Handle curl errors
    if [[ $exit_code -ne 0 ]]; then
        case $exit_code in
            6)  status_code="ERROR: Could not resolve host";;
            7)  status_code="ERROR: Failed to connect";;
            28) status_code="ERROR: Timeout";;
            *)  status_code="ERROR: Curl error $exit_code";;
        esac
        response_body="Connection failed"
    fi
    
    # Log results
    log_health_check "$timestamp" "$status_code" "$response_time" "$response_body"
    
    # Output to console if not in cron mode
    if [[ "$1" != "cron" ]]; then
        if [[ "$status_code" == "200" ]]; then
            echo -e "\e[32m[$timestamp] Status: $status_code, Time: ${response_time}ms\e[0m"
        else
            echo -e "\e[31m[$timestamp] Status: $status_code, Time: ${response_time}ms\e[0m"
        fi
    fi
}

# Set up as cron job if requested
if [[ "$1" == "cron" ]]; then
    # Remove any existing cron job
    (crontab -l 2>/dev/null | grep -v "monitor-health.sh") | crontab -
    
    # Add new cron job to run every 15 minutes
    (crontab -l 2>/dev/null; echo "*/15 * * * * $(pwd)/monitor-health.sh cron") | crontab -
    
    echo "Health monitoring cron job installed. Will run every 15 minutes."
    echo "Logs will be written to $LOG_FILE"
    echo "Alerts will be written to $ALERT_LOG"
    exit 0
fi

# For PM2 setup, suggest the command
if [[ "$1" == "pm2-help" ]]; then
    echo "To run with PM2, use:"
    echo "pm2 start $(pwd)/monitor-health.sh --name rapidroutes-monitor"
    echo ""
    echo "To check status:"
    echo "pm2 status rapidroutes-monitor"
    echo ""
    echo "To view logs:"
    echo "pm2 logs rapidroutes-monitor"
    exit 0
fi

# Run continuously if no arguments or running in cron mode
if [[ -z "$1" || "$1" == "cron" ]]; then
    # First health check
    check_health "$1"
    
    # Exit if cron mode
    if [[ "$1" == "cron" ]]; then
        exit 0
    fi
    
    # Run continuously in a loop
    echo "Health monitoring started. Press Ctrl+C to stop."
    echo "Checking $API_URL every $(( CHECK_INTERVAL / 60 )) minutes."
    echo "Logs will be written to $LOG_FILE"
    echo "Alerts will be written to $ALERT_LOG"
    
    while true; do
        sleep $CHECK_INTERVAL
        check_health
    done
fi