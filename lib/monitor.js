// lib/monitor.js
// Central monitoring and logging system

class Monitor {
    constructor() {
        this.operations = new Map();
    }

    log(level, ...args) {
        const timestamp = new Date().toISOString();
        console.log(`[${timestamp}] [${level.toUpperCase()}]`, ...args);
    }

    startOperation(id, metadata = {}) {
        this.operations.set(id, {
            startTime: Date.now(),
            ...metadata
        });
        this.log('info', `Starting operation ${id}`, metadata);
    }

    endOperation(id, results = {}) {
        const op = this.operations.get(id);
        if (op) {
            const duration = Date.now() - op.startTime;
            this.log('info', `Completed operation ${id} in ${duration}ms`, results);
            this.operations.delete(id);
        }
    }

    async logError(error, context, metadata = {}) {
        this.log('error', `${context}:`, {
            message: error.message,
            ...metadata,
            stack: error.stack
        });
    }

    async monitorMemory() {
        const used = process.memoryUsage();
        this.log('debug', 'Memory usage:', {
            heapUsed: `${Math.round(used.heapUsed / 1024 / 1024)}MB`,
            heapTotal: `${Math.round(used.heapTotal / 1024 / 1024)}MB`,
            rss: `${Math.round(used.rss / 1024 / 1024)}MB`
        });
    }
}

// Singleton instance
const monitor = new Monitor();
export { monitor };
