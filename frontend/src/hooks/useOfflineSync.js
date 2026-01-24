import { useState, useEffect, useCallback } from 'react';
import offlineSyncService from '../lib/offlineSync';

/**
 * React hook for offline sync functionality
 * 
 * Usage:
 * const { isOnline, pendingChanges, sync, saveOffline, getOffline } = useOfflineSync();
 */
export function useOfflineSync() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [syncStatus, setSyncStatus] = useState({
    syncInProgress: false,
    pendingChanges: 0,
    lastSyncTimestamp: null
  });
  const [initialized, setInitialized] = useState(false);

  // Initialize the service
  useEffect(() => {
    const init = async () => {
      try {
        await offlineSyncService.init();
        const status = await offlineSyncService.getStatus();
        setSyncStatus(status);
        setIsOnline(status.isOnline);
        setInitialized(true);
      } catch (error) {
        console.error('Failed to initialize offline sync:', error);
      }
    };

    init();
  }, []);

  // Listen for sync events
  useEffect(() => {
    const handleSyncEvent = async (event, data) => {
      switch (event) {
        case 'online':
          setIsOnline(true);
          break;
        case 'offline':
          setIsOnline(false);
          break;
        case 'sync_started':
          setSyncStatus(prev => ({ ...prev, syncInProgress: true }));
          break;
        case 'sync_completed':
          const status = await offlineSyncService.getStatus();
          setSyncStatus(status);
          break;
        case 'sync_error':
          setSyncStatus(prev => ({ ...prev, syncInProgress: false }));
          break;
        case 'queue_updated':
          const newStatus = await offlineSyncService.getStatus();
          setSyncStatus(newStatus);
          break;
        default:
          break;
      }
    };

    const removeListener = offlineSyncService.addListener(handleSyncEvent);
    return () => removeListener();
  }, []);

  // Manual sync trigger
  const sync = useCallback(async () => {
    return await offlineSyncService.sync();
  }, []);

  // Save data offline
  const saveOffline = useCallback(async (collection, data, markForSync = true) => {
    return await offlineSyncService.saveLocal(collection, data, markForSync);
  }, []);

  // Get data from offline storage
  const getOffline = useCallback(async (collection, id = null) => {
    if (id) {
      return await offlineSyncService.getLocal(collection, id);
    }
    return await offlineSyncService.getAllLocal(collection);
  }, []);

  // Delete from offline storage
  const deleteOffline = useCallback(async (collection, id, markForSync = true) => {
    return await offlineSyncService.deleteLocal(collection, id, markForSync);
  }, []);

  // Get data with fallback to cache
  const getDataWithCache = useCallback(async (collection, fetchFn) => {
    return await offlineSyncService.getData(collection, fetchFn);
  }, []);

  // Cache API response
  const cacheResponse = useCallback(async (collection, data) => {
    return await offlineSyncService.cacheResponse(collection, data);
  }, []);

  return {
    // Status
    isOnline,
    initialized,
    syncInProgress: syncStatus.syncInProgress,
    pendingChanges: syncStatus.pendingChanges,
    lastSyncTimestamp: syncStatus.lastSyncTimestamp,
    
    // Actions
    sync,
    saveOffline,
    getOffline,
    deleteOffline,
    getDataWithCache,
    cacheResponse
  };
}

export default useOfflineSync;
