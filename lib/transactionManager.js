// lib/transactionManager.js
// Enterprise transaction management for CSV generation
// Ensures atomicity and consistency across database operations

import { adminSupabase } from '../utils/supabaseClient.js';
import { monitor } from './monitor.js';

/**
 * Transaction context for coordinating multiple database operations
 */
export class TransactionContext {
  constructor(traceId) {
    this.traceId = traceId;
    this.operations = [];
    this.rollbackActions = [];
    this.completed = false;
    this.failed = false;
    this.startTime = Date.now();
  }

  /**
   * Add an operation to the transaction
   */
  addOperation(name, operation, rollback = null) {
    if (this.completed || this.failed) {
      throw new Error('Cannot add operations to completed transaction');
    }

    this.operations.push({ name, operation, rollback });
    if (rollback) {
      this.rollbackActions.unshift({ name, rollback }); // Reverse order for rollback
    }
  }

  /**
   * Execute all operations in order
   * If any fails, rollback all previous operations
   */
  async execute() {
    const results = [];
    let currentOperation = null;

    try {
      monitor.log('info', `🔄 Starting transaction ${this.traceId} with ${this.operations.length} operations`);

      for (let i = 0; i < this.operations.length; i++) {
        currentOperation = this.operations[i];
        monitor.log('debug', `Executing operation ${i + 1}/${this.operations.length}: ${currentOperation.name}`);
        
        const result = await currentOperation.operation();
        results.push({ name: currentOperation.name, result });
        
        monitor.log('debug', `✅ Operation ${currentOperation.name} completed`);
      }

      this.completed = true;
      monitor.log('info', `✅ Transaction ${this.traceId} completed successfully in ${Date.now() - this.startTime}ms`);
      
      return results;

    } catch (error) {
      this.failed = true;
      monitor.log('error', `❌ Transaction ${this.traceId} failed at operation: ${currentOperation?.name}`, error);

      // Execute rollback actions
      if (this.rollbackActions.length > 0) {
        monitor.log('info', `🔄 Rolling back ${this.rollbackActions.length} operations for transaction ${this.traceId}`);
        
        for (const { name, rollback } of this.rollbackActions) {
          try {
            await rollback();
            monitor.log('debug', `✅ Rollback completed for: ${name}`);
          } catch (rollbackError) {
            monitor.log('error', `❌ Rollback failed for: ${name}`, rollbackError);
            // Continue with other rollbacks even if one fails
          }
        }
      }

      throw new Error(`Transaction ${this.traceId} failed: ${error.message}`);
    }
  }
}

/**
 * Manages reference ID generation and persistence atomically
 */
export class ReferenceIdManager {
  constructor() {
    this.generatedIds = new Map(); // lane_id -> reference_id
    this.usedIds = new Set();
  }

  /**
   * Generate a unique reference ID for a lane
   * Ensures uniqueness within the current batch
   */
  generateReferenceId(laneId) {
    // Check if we already generated one for this lane
    if (this.generatedIds.has(laneId)) {
      return this.generatedIds.get(laneId);
    }

    // Generate from lane ID consistently
    const laneStr = String(laneId);
    const numericPart = laneStr.split('-')[0].replace(/[a-f]/g, '').substring(0, 5) || '10000';
    const baseNum = Math.abs(parseInt(numericPart, 10) || 10000) % 100000;
    
    let referenceId = `RR${String(baseNum).padStart(5, '0')}`;
    let counter = 1;

    // Ensure uniqueness within this batch
    while (this.usedIds.has(referenceId)) {
      const newNum = (baseNum + counter) % 100000;
      referenceId = `RR${String(newNum).padStart(5, '0')}`;
      counter++;

      // Safety check
      if (counter > 100000) {
        referenceId = `RR${String(Math.floor(Math.random() * 100000)).padStart(5, '0')}`;
        break;
      }
    }

    this.usedIds.add(referenceId);
    this.generatedIds.set(laneId, referenceId);
    
    return referenceId;
  }

  /**
   * Get all generated reference IDs for batch processing
   */
  getAllGeneratedIds() {
    return new Map(this.generatedIds);
  }

  /**
   * Clear the manager for a new batch
   */
  reset() {
    this.generatedIds.clear();
    this.usedIds.clear();
  }
}

/**
 * Atomic CSV generation coordinator
 * Manages all database operations as a single transaction
 */
export class CsvGenerationTransaction {
  constructor(lanes, traceId = null) {
    this.traceId = traceId || `csv_gen_${Date.now()}`;
    this.lanes = lanes;
    this.referenceManager = new ReferenceIdManager();
    this.generatedRows = [];
    this.transaction = new TransactionContext(this.traceId);
    this.postedPairsToInsert = [];
    this.laneUpdates = [];
  }

  /**
   * Add CSV rows to the transaction context
   */
  addGeneratedRows(laneId, rows) {
    const referenceId = this.referenceManager.generateReferenceId(laneId);
    
    // Update rows with consistent reference ID
    const updatedRows = rows.map(row => ({
      ...row,
      'Reference ID': referenceId
    }));

    this.generatedRows.push(...updatedRows);

    // Prepare lane update
    this.laneUpdates.push({
      id: laneId,
      reference_id: referenceId,
      status: 'posted',
      posted_at: new Date().toISOString()
    });

    // Prepare posted pairs
    const pairs = updatedRows.map(row => ({
      reference_id: referenceId,
      origin_city: row['Origin City*'],
      origin_state: row['Origin State*'],
      dest_city: row['Destination City*'],
      dest_state: row['Destination State*'],
      lane_id: laneId,
      created_by: this.lanes.find(l => l.id === laneId)?.user_id
    })).filter((pair, index, self) => 
      // Remove duplicates by reference_id
      index === self.findIndex(p => p.reference_id === pair.reference_id)
    );

    this.postedPairsToInsert.push(...pairs);
  }

  /**
   * Execute the complete transaction atomically
   */
  async commit() {
    // Operation 1: Update lane reference IDs and status
    if (this.laneUpdates.length > 0) {
      this.transaction.addOperation(
        'update_lane_references',
        async () => {
          const updates = [];
          
          for (const update of this.laneUpdates) {
            const { error } = await adminSupabase
              .from('lanes')
              .update({
                reference_id: update.reference_id,
                status: update.status,
                posted_at: update.posted_at
              })
              .eq('id', update.id);

            if (error) {
              throw new Error(`Failed to update lane ${update.id}: ${error.message}`);
            }
            
            updates.push(update.id);
          }

          return { updated_lanes: updates };
        },
        // Rollback: revert lane status and reference_id
        async () => {
          for (const update of this.laneUpdates) {
            await adminSupabase
              .from('lanes')
              .update({
                reference_id: null,
                status: 'pending',
                posted_at: null
              })
              .eq('id', update.id);
          }
        }
      );
    }

    // Operation 2: Insert posted pairs
    if (this.postedPairsToInsert.length > 0) {
      this.transaction.addOperation(
        'insert_posted_pairs',
        async () => {
          const { data, error } = await adminSupabase
            .from('posted_pairs')
            .insert(this.postedPairsToInsert)
            .select('id');

          if (error) {
            throw new Error(`Failed to insert posted pairs: ${error.message}`);
          }

          return { inserted_pairs: data?.length || 0 };
        },
        // Rollback: delete inserted pairs
        async () => {
          const referenceIds = [...new Set(this.postedPairsToInsert.map(p => p.reference_id))];
          if (referenceIds.length > 0) {
            await adminSupabase
              .from('posted_pairs')
              .delete()
              .in('reference_id', referenceIds);
          }
        }
      );
    }

    // Execute the transaction
    const results = await this.transaction.execute();
    
    monitor.log('info', `🎯 CSV transaction ${this.traceId} completed:`, {
      lanes_updated: this.laneUpdates.length,
      pairs_inserted: this.postedPairsToInsert.length,
      rows_generated: this.generatedRows.length,
      execution_time: Date.now() - this.transaction.startTime
    });

    return {
      success: true,
      results,
      rows: this.generatedRows,
      transaction_id: this.traceId
    };
  }

  /**
   * Get current transaction status
   */
  getStatus() {
    return {
      transaction_id: this.traceId,
      lanes_count: this.lanes.length,
      rows_generated: this.generatedRows.length,
      operations_pending: this.transaction.operations.length,
      completed: this.transaction.completed,
      failed: this.transaction.failed
    };
  }
}

/**
 * Concurrent operation manager with proper ordering guarantees
 */
export class ConcurrentOperationManager {
  constructor(maxConcurrency = 5) {
    this.maxConcurrency = maxConcurrency;
    this.activeOperations = new Map();
    this.operationQueue = [];
    this.results = new Map();
  }

  /**
   * Add an operation to the queue
   */
  addOperation(key, operation, dependencies = []) {
    this.operationQueue.push({
      key,
      operation,
      dependencies,
      started: false,
      completed: false,
      result: null,
      error: null
    });
  }

  /**
   * Execute operations with dependency ordering
   */
  async executeAll() {
    while (this.operationQueue.length > 0 || this.activeOperations.size > 0) {
      // Start new operations if we have capacity
      while (this.activeOperations.size < this.maxConcurrency) {
        const nextOp = this.getNextReadyOperation();
        if (!nextOp) break;

        this.startOperation(nextOp);
      }

      // Wait for at least one operation to complete
      if (this.activeOperations.size > 0) {
        await this.waitForAnyCompletion();
      }
    }

    // Return all results
    const results = {};
    for (const [key, result] of this.results) {
      results[key] = result;
    }

    return results;
  }

  /**
   * Get the next operation that's ready to run (dependencies satisfied)
   */
  getNextReadyOperation() {
    for (let i = 0; i < this.operationQueue.length; i++) {
      const op = this.operationQueue[i];
      if (op.started) continue;

      // Check if all dependencies are completed
      const dependenciesSatisfied = op.dependencies.every(dep => 
        this.results.has(dep) && !this.results.get(dep).error
      );

      if (dependenciesSatisfied) {
        this.operationQueue.splice(i, 1);
        return op;
      }
    }

    return null;
  }

  /**
   * Start an operation
   */
  async startOperation(op) {
    op.started = true;
    this.activeOperations.set(op.key, op);

    try {
      const result = await op.operation();
      op.result = result;
      op.completed = true;
      this.results.set(op.key, { result, error: null });
    } catch (error) {
      op.error = error;
      op.completed = true;
      this.results.set(op.key, { result: null, error });
    } finally {
      this.activeOperations.delete(op.key);
    }
  }

  /**
   * Wait for any active operation to complete
   */
  async waitForAnyCompletion() {
    if (this.activeOperations.size === 0) return;

    // Create a promise that resolves when any operation completes
    return new Promise((resolve) => {
      const checkCompletion = () => {
        for (const op of this.activeOperations.values()) {
          if (op.completed) {
            resolve();
            return;
          }
        }
        // Check again in 10ms
        setTimeout(checkCompletion, 10);
      };
      checkCompletion();
    });
  }
}

/**
 * High-level atomic CSV generation function
 */
export async function generateCsvAtomically(lanes, options = {}) {
  const traceId = `atomic_csv_${Date.now()}`;
  
  try {
    monitor.log('info', `🚀 Starting atomic CSV generation for ${lanes.length} lanes`, { traceId });

    const transaction = new CsvGenerationTransaction(lanes, traceId);
    
    // Import the CSV generation function
    const { generateDatCsvRows } = await import('./datCsvBuilder.js');
    
    // Generate rows for each lane and add to transaction
    const errors = [];
    for (const lane of lanes) {
      try {
        const rows = await generateDatCsvRows(lane);
        if (rows && rows.length > 0) {
          transaction.addGeneratedRows(lane.id, rows);
        } else {
          errors.push({ laneId: lane.id, error: 'No rows generated' });
        }
      } catch (error) {
        errors.push({ laneId: lane.id, error: error.message });
        monitor.log('error', `Lane ${lane.id} failed in atomic generation:`, error);
      }
    }

    // Commit the transaction atomically
    const result = await transaction.commit();
    
    if (errors.length > 0) {
      result.warnings = errors;
      monitor.log('warn', `Atomic CSV generation completed with ${errors.length} lane errors`, { traceId });
    }

    return result;

  } catch (error) {
    monitor.log('error', `Atomic CSV generation failed:`, error);
    throw new Error(`Atomic CSV generation failed: ${error.message}`);
  }
}