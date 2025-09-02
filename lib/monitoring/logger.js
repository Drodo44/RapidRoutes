// lib/monitoring/logger.js
let adminSupabase = null;
let supabaseLoaded = false;

function getAdminSupabase() {
    if (!supabaseLoaded) {
        try {
            const supabaseModule = require('../../utils/supabaseClient.js');
            adminSupabase = supabaseModule.adminSupabase;
        } catch (error) {
            console.warn('Supabase client not available, monitoring will use console only');
            adminSupabase = null;
        }
        supabaseLoaded = true;
    }
    return adminSupabase;
}

/**
 * Structured logger with performance tracking and error reporting
 */
class MonitoringSystem {
    constructor() {
        this.operations = new Map();
        this.supabase = getAdminSupabase();
        this.environment = process.env.NODE_ENV || 'development';
    }

    /**
     * Start timing an operation
     * @param {string} operationId - Unique identifier for the operation
     * @param {Object} metadata - Additional context about the operation
     */
    startOperation(operationId, metadata = {}) {
        this.operations.set(operationId, {
            startTime: performance.now(),
            metadata: {
                ...metadata,
                timestamp: new Date().toISOString(),
                environment: this.environment
            }
        });
    }

    /**
     * End timing an operation and log its duration
     * @param {string} operationId - Operation identifier
     * @param {Object} result - Operation result metadata
     */
    endOperation(operationId, result = {}) {
        const operation = this.operations.get(operationId);
        if (!operation) {
            console.warn(`No start time found for operation ${operationId}`);
            return;
        }

        const duration = performance.now() - operation.startTime;
        const logEntry = {
            operation_id: operationId,
            duration_ms: Math.round(duration),
            ...operation.metadata,
            ...result,
            completed_at: new Date().toISOString()
        };

        // Log to Supabase for persistent storage (if available)
        if (this.supabase) {
            this.supabase
                .from('operation_logs')
                .insert([logEntry])
                .then(() => {
                    if (duration > 1000) { // Log slow operations
                        console.warn(`⚠️ Slow operation detected: ${operationId} took ${duration}ms`);
                    }
                })
                .catch(error => console.error('Failed to log operation:', error));
        } else {
            // Fallback to console logging
            console.log(`[${new Date().toISOString()}] Operation ${operationId} completed in ${duration}ms`);
            if (duration > 1000) {
                console.warn(`⚠️ Slow operation detected: ${operationId} took ${duration}ms`);
            }
        }

        this.operations.delete(operationId);
    }

    /**
     * Log an error with full context
     * @param {Error} error - Error object
     * @param {string} context - Error context description
     * @param {Object} metadata - Additional error metadata
     */
    async logError(error, context, metadata = {}) {
        const errorEntry = {
            error_message: error.message,
            error_stack: error.stack,
            error_type: error.name,
            context,
            severity: metadata.severity || 'error',
            environment: this.environment,
            timestamp: new Date().toISOString(),
            ...metadata
        };

        try {
            if (this.supabase) {
                await this.supabase
                    .from('error_logs')
                    .insert([errorEntry]);
            }

            // Console output for immediate visibility
            console.error(`🚨 ${context}:`, {
                message: error.message,
                metadata
            });
        } catch (logError) {
            // Fallback if database logging fails
            console.error('Failed to log error:', logError);
            console.error('Original error:', error);
        }
    }

    /**
     * Check system health
     * @returns {Promise<Object>} Health status of various components
     */
    async checkHealth() {
        const status = {
            database: false,
            api_services: false,
            memory: process.memoryUsage(),
            timestamp: new Date().toISOString()
        };

        try {
            // Check database connection (if available)
            if (this.supabase) {
                const { data, error } = await this.supabase
                    .from('health_checks')
                    .select('count')
                    .single();
                status.database = !error;
            } else {
                status.database = false;
            }
        } catch (error) {
            await this.logError(error, 'Database health check failed');
        }

        // Check external API services
        try {
            const response = await fetch(process.env.HERE_API_HEALTH_CHECK_URL);
            status.api_services = response.ok;
        } catch (error) {
            await this.logError(error, 'API health check failed');
        }

        // Log health check results (if database available)
        if (this.supabase) {
            await this.supabase
                .from('system_health')
                .insert([status])
                .catch(error => this.logError(error, 'Failed to log health check'));
        } else {
            console.log('Health check:', status);
        }

        return status;
    }

    /**
     * Monitor memory usage and log if above threshold
     * @param {number} threshold - Memory threshold in MB
     */
    async monitorMemory(threshold = 512) {
        const used = process.memoryUsage();
        const usedMB = Math.round(used.heapUsed / 1024 / 1024);
        
        if (usedMB > threshold) {
            await this.logError(
                new Error(`Memory usage exceeded ${threshold}MB`),
                'High memory usage',
                {
                    severity: 'warning',
                    memory_usage: usedMB,
                    threshold,
                    full_memory_stats: used
                }
            );
        }
    }
}

export const monitor = new MonitoringSystem();
