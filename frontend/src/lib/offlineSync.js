/**
 * Offline Sync Service - IndexedDB based local storage with automatic sync
 * 
 * Features:
 * - Stores recently accessed/modified data locally
 * - Automatic background sync when online
 * - Conflict resolution (last modified wins with server preference)
 * - Queue management for offline operations
 */

const DB_NAME = 'jewellery_erp_offline';
const DB_VERSION = 1;

// Collections that support offline sync
const SYNCABLE_STORES = [
  'items',
  'categories', 
  'customers',
  'sellers',
  'invoices',
  'transactions',
  'expenses',
  'stock_adjustments'
];

// Sync queue store for pending operations
const SYNC_QUEUE_STORE = 'sync_queue';
const SYNC_META_STORE = 'sync_meta';

class OfflineSyncService {
  constructor() {
    this.db = null;
    this.isOnline = navigator.onLine;
    this.syncInProgress = false;
    this.listeners = new Set();
    
    // Listen for online/offline events
    window.addEventListener('online', () => this.handleOnline());
    window.addEventListener('offline', () => this.handleOffline());
  }

  // Initialize IndexedDB
  async init() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => reject(request.error);
      
      request.onsuccess = () => {
        this.db = request.result;
        console.log('[OfflineSync] Database initialized');
        resolve(this.db);
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        
        // Create object stores for each syncable collection
        SYNCABLE_STORES.forEach(storeName => {
          if (!db.objectStoreNames.contains(storeName)) {
            const store = db.createObjectStore(storeName, { keyPath: 'id' });
            store.createIndex('synced_at', 'synced_at', { unique: false });
            store.createIndex('local_modified', 'local_modified', { unique: false });
          }
        });

        // Create sync queue store
        if (!db.objectStoreNames.contains(SYNC_QUEUE_STORE)) {
          const syncStore = db.createObjectStore(SYNC_QUEUE_STORE, { keyPath: 'queue_id', autoIncrement: true });
          syncStore.createIndex('collection', 'collection', { unique: false });
          syncStore.createIndex('timestamp', 'timestamp', { unique: false });
        }

        // Create sync metadata store
        if (!db.objectStoreNames.contains(SYNC_META_STORE)) {
          db.createObjectStore(SYNC_META_STORE, { keyPath: 'key' });
        }
      };
    });
  }

  // Store data locally
  async saveLocal(collection, data, markForSync = true) {
    if (!this.db || !SYNCABLE_STORES.includes(collection)) return;

    const transaction = this.db.transaction([collection], 'readwrite');
    const store = transaction.objectStore(collection);
    
    const item = {
      ...data,
      local_modified: markForSync ? new Date().toISOString() : null,
      cached_at: new Date().toISOString()
    };

    return new Promise((resolve, reject) => {
      const request = store.put(item);
      request.onsuccess = () => {
        if (markForSync) {
          this.addToSyncQueue(collection, data.id, 'update', data);
        }
        resolve(item);
      };
      request.onerror = () => reject(request.error);
    });
  }

  // Get data from local storage
  async getLocal(collection, id) {
    if (!this.db || !SYNCABLE_STORES.includes(collection)) return null;

    const transaction = this.db.transaction([collection], 'readonly');
    const store = transaction.objectStore(collection);

    return new Promise((resolve, reject) => {
      const request = store.get(id);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  // Get all data from a collection
  async getAllLocal(collection) {
    if (!this.db || !SYNCABLE_STORES.includes(collection)) return [];

    const transaction = this.db.transaction([collection], 'readonly');
    const store = transaction.objectStore(collection);

    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  // Delete from local storage
  async deleteLocal(collection, id, markForSync = true) {
    if (!this.db || !SYNCABLE_STORES.includes(collection)) return;

    const transaction = this.db.transaction([collection], 'readwrite');
    const store = transaction.objectStore(collection);

    return new Promise((resolve, reject) => {
      const request = store.delete(id);
      request.onsuccess = () => {
        if (markForSync) {
          this.addToSyncQueue(collection, id, 'delete', { id });
        }
        resolve(true);
      };
      request.onerror = () => reject(request.error);
    });
  }

  // Add operation to sync queue
  async addToSyncQueue(collection, documentId, action, data) {
    if (!this.db) return;

    const transaction = this.db.transaction([SYNC_QUEUE_STORE], 'readwrite');
    const store = transaction.objectStore(SYNC_QUEUE_STORE);

    const queueItem = {
      collection,
      document_id: documentId,
      action,
      data,
      timestamp: new Date().toISOString(),
      client_id: this.getClientId()
    };

    return new Promise((resolve, reject) => {
      const request = store.add(queueItem);
      request.onsuccess = () => {
        this.notifyListeners('queue_updated');
        resolve(request.result);
      };
      request.onerror = () => reject(request.error);
    });
  }

  // Get pending sync items
  async getPendingSyncItems() {
    if (!this.db) return [];

    const transaction = this.db.transaction([SYNC_QUEUE_STORE], 'readonly');
    const store = transaction.objectStore(SYNC_QUEUE_STORE);

    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  // Clear sync queue item
  async clearSyncQueueItem(queueId) {
    if (!this.db) return;

    const transaction = this.db.transaction([SYNC_QUEUE_STORE], 'readwrite');
    const store = transaction.objectStore(SYNC_QUEUE_STORE);

    return new Promise((resolve, reject) => {
      const request = store.delete(queueId);
      request.onsuccess = () => resolve(true);
      request.onerror = () => reject(request.error);
    });
  }

  // Get/Set last sync timestamp
  async getLastSyncTimestamp() {
    if (!this.db) return null;

    const transaction = this.db.transaction([SYNC_META_STORE], 'readonly');
    const store = transaction.objectStore(SYNC_META_STORE);

    return new Promise((resolve) => {
      const request = store.get('last_sync');
      request.onsuccess = () => resolve(request.result?.value || null);
      request.onerror = () => resolve(null);
    });
  }

  async setLastSyncTimestamp(timestamp) {
    if (!this.db) return;

    const transaction = this.db.transaction([SYNC_META_STORE], 'readwrite');
    const store = transaction.objectStore(SYNC_META_STORE);

    return new Promise((resolve, reject) => {
      const request = store.put({ key: 'last_sync', value: timestamp });
      request.onsuccess = () => resolve(true);
      request.onerror = () => reject(request.error);
    });
  }

  // Generate unique client ID
  getClientId() {
    let clientId = localStorage.getItem('erp_client_id');
    if (!clientId) {
      clientId = 'client_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
      localStorage.setItem('erp_client_id', clientId);
    }
    return clientId;
  }

  // Handle coming online
  async handleOnline() {
    console.log('[OfflineSync] Back online');
    this.isOnline = true;
    this.notifyListeners('online');
    
    // Auto-sync when coming back online
    await this.sync();
  }

  // Handle going offline
  handleOffline() {
    console.log('[OfflineSync] Gone offline');
    this.isOnline = false;
    this.notifyListeners('offline');
  }

  // Main sync function
  async sync() {
    if (!this.isOnline || this.syncInProgress) {
      console.log('[OfflineSync] Sync skipped - offline or in progress');
      return { success: false, reason: 'offline_or_in_progress' };
    }

    this.syncInProgress = true;
    this.notifyListeners('sync_started');

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No auth token');
      }

      const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      };

      // Step 1: Push local changes
      const pendingItems = await this.getPendingSyncItems();
      
      if (pendingItems.length > 0) {
        console.log(`[OfflineSync] Pushing ${pendingItems.length} local changes`);
        
        const syncItems = pendingItems.map(item => ({
          collection: item.collection,
          document_id: item.document_id,
          action: item.action,
          data: item.data,
          local_timestamp: item.timestamp,
          client_id: item.client_id
        }));

        const pushResponse = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/sync/push`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            items: syncItems,
            last_sync_timestamp: await this.getLastSyncTimestamp(),
            client_id: this.getClientId()
          })
        });

        if (pushResponse.ok) {
          const pushResult = await pushResponse.json();
          
          // Clear synced items from queue
          for (const synced of pushResult.results.synced) {
            const queueItem = pendingItems.find(
              p => p.document_id === synced.document_id && p.collection === synced.collection
            );
            if (queueItem) {
              await this.clearSyncQueueItem(queueItem.queue_id);
            }
          }

          // Handle conflicts - update local with server data
          for (const conflict of pushResult.results.conflicts) {
            if (conflict.resolution === 'server_wins') {
              await this.saveLocal(conflict.collection, conflict.server_data, false);
            }
            // Clear from queue regardless
            const queueItem = pendingItems.find(
              p => p.document_id === conflict.document_id && p.collection === conflict.collection
            );
            if (queueItem) {
              await this.clearSyncQueueItem(queueItem.queue_id);
            }
          }
        }
      }

      // Step 2: Pull server changes
      const lastSync = await this.getLastSyncTimestamp();
      const pullUrl = new URL(`${process.env.REACT_APP_BACKEND_URL}/api/sync/pull`);
      if (lastSync) {
        pullUrl.searchParams.set('last_sync', lastSync);
      }

      const pullResponse = await fetch(pullUrl.toString(), { headers });
      
      if (pullResponse.ok) {
        const pullResult = await pullResponse.json();
        
        // Update local storage with server changes
        for (const [collection, documents] of Object.entries(pullResult.changes)) {
          for (const doc of documents) {
            await this.saveLocal(collection, doc, false);
          }
        }

        // Update last sync timestamp
        await this.setLastSyncTimestamp(pullResult.sync_timestamp);
        
        console.log(`[OfflineSync] Pulled ${pullResult.total_changes} changes from server`);
      }

      this.syncInProgress = false;
      this.notifyListeners('sync_completed');
      
      return { success: true };

    } catch (error) {
      console.error('[OfflineSync] Sync error:', error);
      this.syncInProgress = false;
      this.notifyListeners('sync_error', error.message);
      return { success: false, error: error.message };
    }
  }

  // Cache API response data locally
  async cacheResponse(collection, data) {
    if (!SYNCABLE_STORES.includes(collection)) return;
    
    if (Array.isArray(data)) {
      for (const item of data) {
        if (item.id) {
          await this.saveLocal(collection, item, false);
        }
      }
    } else if (data && data.id) {
      await this.saveLocal(collection, data, false);
    }
  }

  // Get data - tries local first if offline, then API
  async getData(collection, fetchFn) {
    if (this.isOnline) {
      try {
        const data = await fetchFn();
        await this.cacheResponse(collection, data);
        return { data, source: 'server' };
      } catch (error) {
        console.log('[OfflineSync] Server fetch failed, trying local cache');
        const localData = await this.getAllLocal(collection);
        return { data: localData, source: 'cache' };
      }
    } else {
      const localData = await this.getAllLocal(collection);
      return { data: localData, source: 'cache' };
    }
  }

  // Add listener for sync events
  addListener(callback) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  // Notify all listeners
  notifyListeners(event, data = null) {
    this.listeners.forEach(callback => callback(event, data));
  }

  // Get sync status
  async getStatus() {
    const pendingItems = await this.getPendingSyncItems();
    const lastSync = await this.getLastSyncTimestamp();
    
    return {
      isOnline: this.isOnline,
      syncInProgress: this.syncInProgress,
      pendingChanges: pendingItems.length,
      lastSyncTimestamp: lastSync
    };
  }

  // Clear all local data (use with caution)
  async clearAllLocal() {
    if (!this.db) return;

    for (const storeName of [...SYNCABLE_STORES, SYNC_QUEUE_STORE]) {
      const transaction = this.db.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      await new Promise((resolve) => {
        const request = store.clear();
        request.onsuccess = () => resolve();
        request.onerror = () => resolve();
      });
    }
  }
}

// Singleton instance
const offlineSyncService = new OfflineSyncService();

export default offlineSyncService;
export { SYNCABLE_STORES };
