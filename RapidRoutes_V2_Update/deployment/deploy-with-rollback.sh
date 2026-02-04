#!/bin/bash
# deployment/deploy-with-rollback.sh

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Timestamp for backups
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

echo -e "${YELLOW}Starting deployment process...${NC}"

# Function to check if a command succeeded
check_status() {
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ $1 successful${NC}"
        return 0
    else
        echo -e "${RED}✗ $1 failed${NC}"
        return 1
    fi
}

# Function to take database backup
backup_database() {
    echo "Taking database backup..."
    pg_dump $DATABASE_URL > "backups/backup_${TIMESTAMP}.sql"
    check_status "Database backup" || exit 1
}

# Function to restore database from backup
restore_database() {
    local BACKUP_FILE="backups/backup_${TIMESTAMP}.sql"
    echo "Restoring database from ${BACKUP_FILE}..."
    psql $DATABASE_URL < "$BACKUP_FILE"
    check_status "Database restore"
}

# Deploy database changes
deploy_database() {
    echo "Deploying database changes..."
    
    # Reference number system
    psql $DATABASE_URL -f migrations/006-reference-number-system.sql
    check_status "Reference number system migration" || return 1
    
    # Enhanced recap system
    psql $DATABASE_URL -f migrations/007-enhanced-recap-system.sql
    check_status "Enhanced recap system migration" || return 1
    
    return 0
}

# Verify system components
verify_components() {
    echo "Verifying system components..."
    
    # Test RR number generation
    node tests/verify-rr-system.js
    check_status "RR number system" || return 1
    
    # Test recap system
    node tests/verify-recap-system.js
    check_status "Recap system" || return 1
    
    # Test intelligent insights
    node tests/verify-insights.js
    check_status "Intelligent insights" || return 1
    
    return 0
}

# Main deployment process
main() {
    echo "=== Starting deployment process ==="
    
    # 1. Take backup
    backup_database
    
    # 2. Deploy to staging first
    export NODE_ENV=staging
    echo "Deploying to staging..."
    
    deploy_database
    if [ $? -ne 0 ]; then
        echo -e "${RED}Staging deployment failed. Rolling back...${NC}"
        restore_database
        exit 1
    fi
    
    # 3. Verify components in staging
    verify_components
    if [ $? -ne 0 ]; then
        echo -e "${RED}Component verification failed. Rolling back...${NC}"
        restore_database
        exit 1
    fi
    
    # 4. Deploy to production
    echo "Deploying to production..."
    export NODE_ENV=production
    
    deploy_database
    if [ $? -ne 0 ]; then
        echo -e "${RED}Production deployment failed. Rolling back...${NC}"
        restore_database
        exit 1
    fi
    
    # 5. Final verification
    verify_components
    if [ $? -ne 0 ]; then
        echo -e "${RED}Final verification failed. Rolling back...${NC}"
        restore_database
        exit 1
    fi
    
    echo -e "${GREEN}=== Deployment completed successfully ===${NC}"
    return 0
}

# Run deployment
main
exit $?
