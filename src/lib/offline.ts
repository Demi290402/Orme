import { supabase } from './supabase';

export interface OfflineOperation {
    id: string;
    action: 'insert' | 'update' | 'delete' | 'upsert';
    table: string;
    data: any;
    filter?: Record<string, any>;
    timestamp: number;
}

// Check network status
export function isOnline(): boolean {
    return typeof navigator !== 'undefined' && navigator.onLine;
}

// Local Cache helper
export function getCachedData<T>(key: string): T | null {
    try {
        const val = localStorage.getItem(`cache_${key}`);
        return val ? JSON.parse(val) : null;
    } catch (e) {
        console.error('Offline Cache read error:', e);
        return null;
    }
}

export function setCachedData<T>(key: string, data: T): void {
    try {
        localStorage.setItem(`cache_${key}`, JSON.stringify(data));
    } catch (e) {
        console.error('Offline Cache write error:', e);
    }
}

// Local queue helper
export function getOfflineQueue(): OfflineOperation[] {
    try {
        const val = localStorage.getItem('offline_write_queue');
        return val ? JSON.parse(val) : [];
    } catch (e) {
        console.error('Offline Queue read error:', e);
        return [];
    }
}

export function setOfflineQueue(queue: OfflineOperation[]): void {
    try {
        localStorage.setItem('offline_write_queue', JSON.stringify(queue));
    } catch (e) {
        console.error('Offline Queue write error:', e);
    }
}

// Queue a write operation
export function enqueueOfflineWrite(
    action: OfflineOperation['action'],
    table: string,
    data: any,
    filter?: Record<string, any>
): void {
    const queue = getOfflineQueue();
    const operation: OfflineOperation = {
        id: crypto.randomUUID(),
        action,
        table,
        data,
        filter,
        timestamp: Date.now()
    };
    queue.push(operation);
    setOfflineQueue(queue);

    // Apply change immediately to cache
    applyOperationToCache(operation);

    // Dispatch custom event to notify components of queue updates
    window.dispatchEvent(new CustomEvent('offline_queue_changed'));
}

// Synchronize the queue with Supabase
let isSyncing = false;
export async function syncOfflineQueue(): Promise<void> {
    if (isSyncing || !isOnline()) return;
    const queue = getOfflineQueue();
    if (queue.length === 0) return;

    isSyncing = true;
    console.log(`Avvio sincronizzazione offline: ${queue.length} operazioni in attesa.`);
    
    // Create status event
    window.dispatchEvent(new CustomEvent('offline_sync_status', { detail: 'syncing' }));

    const failedOperations: OfflineOperation[] = [];

    for (const op of queue) {
        try {
            let error = null;

            if (op.action === 'insert') {
                const res = await supabase.from(op.table).insert(op.data);
                error = res.error;
            } else if (op.action === 'update') {
                let query = supabase.from(op.table).update(op.data);
                if (op.filter) {
                    Object.entries(op.filter).forEach(([k, v]) => {
                        query = query.eq(k, v);
                    });
                }
                const res = await query;
                error = res.error;
            } else if (op.action === 'upsert') {
                const res = await supabase.from(op.table).upsert(op.data);
                error = res.error;
            } else if (op.action === 'delete') {
                let query = supabase.from(op.table).delete();
                if (op.filter) {
                    Object.entries(op.filter).forEach(([k, v]) => {
                        query = query.eq(k, v);
                    });
                }
                const res = await query;
                error = res.error;
            }

            if (error) {
                console.error(`Sincronizzazione fallita per operazione ${op.id} su tabella ${op.table}:`, error);
                failedOperations.push(op);
            } else {
                console.log(`Sincronizzazione riuscita: ${op.action} su ${op.table}`);
            }
        } catch (err) {
            console.error(`Eccezione durante la sincronizzazione dell'operazione ${op.id}:`, err);
            failedOperations.push(op);
        }
    }

    setOfflineQueue(failedOperations);
    isSyncing = false;

    window.dispatchEvent(new CustomEvent('offline_queue_changed'));
    window.dispatchEvent(new CustomEvent('offline_sync_status', { detail: failedOperations.length > 0 ? 'error' : 'done' }));
}

// Automatically apply queued write operations to the read caches
function applyOperationToCache(op: OfflineOperation) {
    // We attempt to update cached tables
    const cacheKey = getCacheKeyForTable(op.table);
    if (!cacheKey) return;

    const cacheData = getCachedData<any[]>(cacheKey);
    if (!cacheData) return;

    let updatedCache = [...cacheData];

    if (op.action === 'insert') {
        updatedCache.unshift({ ...op.data, id: op.data.id || crypto.randomUUID(), created_at: new Date().toISOString() });
    } else if (op.action === 'update') {
        updatedCache = updatedCache.map(item => {
            if (op.filter && matchFilter(item, op.filter)) {
                return { ...item, ...op.data, updated_at: new Date().toISOString() };
            }
            return item;
        });
    } else if (op.action === 'upsert') {
        const matches = op.filter ? updatedCache.filter(item => matchFilter(item, op.filter!)) : [];
        if (matches.length > 0) {
            updatedCache = updatedCache.map(item => {
                if (op.filter && matchFilter(item, op.filter)) {
                    return { ...item, ...op.data };
                }
                return item;
            });
        } else {
            updatedCache.unshift({ ...op.data, id: op.data.id || crypto.randomUUID() });
        }
    } else if (op.action === 'delete') {
        if (op.filter) {
            updatedCache = updatedCache.filter(item => !matchFilter(item, op.filter!));
        }
    }

    setCachedData(cacheKey, updatedCache);
}

function getCacheKeyForTable(table: string): string | null {
    switch (table) {
        case 'locations': return 'locations';
        case 'inventario_attrezzi': return 'inventario_attrezzi';
        case 'inventario_luoghi': return 'inventario_luoghi';
        case 'eventi_calendario': return 'eventi_calendario';
        case 'verbali': return 'verbali';
        case 'lista_attesa': return 'lista_attesa';
        case 'servizi_trasporto': return 'servizi_trasporto';
        case 'bilancio': return 'bilancio';
        default: return null;
    }
}

function matchFilter(item: any, filter: Record<string, any>): boolean {
    return Object.entries(filter).every(([k, v]) => {
        // camelCase to snake_case mapping helper if needed
        const itemVal = item[k] !== undefined ? item[k] : item[camelToSnake(k)];
        return String(itemVal) === String(v);
    });
}

function camelToSnake(str: string): string {
    return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
}

// Auto-sync setup on online event
if (typeof window !== 'undefined') {
    window.addEventListener('online', () => {
        console.log('Connessione ripristinata. Sincronizzazione coda offline avviata.');
        syncOfflineQueue();
    });
}
