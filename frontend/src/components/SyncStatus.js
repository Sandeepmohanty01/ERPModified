import React, { useState } from 'react';
import { Wifi, WifiOff, RefreshCw, Cloud, CloudOff, Check, AlertCircle } from 'lucide-react';
import { useOfflineSync } from '../hooks/useOfflineSync';
import { Button } from './ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from './ui/tooltip';

/**
 * Sync Status Indicator Component
 * Shows online/offline status and pending sync count
 */
export function SyncStatusIndicator() {
  const {
    isOnline,
    syncInProgress,
    pendingChanges,
    lastSyncTimestamp,
    sync
  } = useOfflineSync();

  const [showDetails, setShowDetails] = useState(false);

  const handleSync = async () => {
    await sync();
  };

  const formatLastSync = (timestamp) => {
    if (!timestamp) return 'Never';
    const date = new Date(timestamp);
    const now = new Date();
    const diff = Math.floor((now - date) / 1000);
    
    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return date.toLocaleDateString();
  };

  return (
    <TooltipProvider>
      <div className="flex items-center gap-2">
        {/* Online/Offline Status */}
        <Tooltip>
          <TooltipTrigger asChild>
            <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
              isOnline 
                ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' 
                : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
            }`}>
              {isOnline ? (
                <>
                  <Wifi className="h-3 w-3" />
                  <span>Online</span>
                </>
              ) : (
                <>
                  <WifiOff className="h-3 w-3" />
                  <span>Offline</span>
                </>
              )}
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p>{isOnline ? 'Connected to server' : 'Working offline - changes will sync when online'}</p>
          </TooltipContent>
        </Tooltip>

        {/* Pending Changes Badge */}
        {pendingChanges > 0 && (
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                <CloudOff className="h-3 w-3" />
                <span>{pendingChanges}</span>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>{pendingChanges} changes pending sync</p>
            </TooltipContent>
          </Tooltip>
        )}

        {/* Sync Button */}
        {isOnline && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSync}
                disabled={syncInProgress}
                className="h-7 w-7 p-0"
                data-testid="sync-button"
              >
                <RefreshCw className={`h-4 w-4 ${syncInProgress ? 'animate-spin' : ''}`} />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>{syncInProgress ? 'Syncing...' : 'Sync now'}</p>
              <p className="text-xs text-muted-foreground">Last: {formatLastSync(lastSyncTimestamp)}</p>
            </TooltipContent>
          </Tooltip>
        )}

        {/* Sync Status Icon */}
        {syncInProgress && (
          <div className="flex items-center gap-1 text-blue-600 dark:text-blue-400">
            <Cloud className="h-4 w-4 animate-pulse" />
            <span className="text-xs">Syncing...</span>
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}

/**
 * Detailed Sync Status Panel
 * Shows more information about sync status
 */
export function SyncStatusPanel() {
  const {
    isOnline,
    initialized,
    syncInProgress,
    pendingChanges,
    lastSyncTimestamp,
    sync
  } = useOfflineSync();

  const handleSync = async () => {
    const result = await sync();
    console.log('Sync result:', result);
  };

  if (!initialized) {
    return (
      <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
        <p className="text-sm text-gray-500">Initializing offline sync...</p>
      </div>
    );
  }

  return (
    <div className="p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700" data-testid="sync-status-panel">
      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <Cloud className="h-5 w-5" />
        Sync Status
      </h3>

      <div className="space-y-3">
        {/* Connection Status */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600 dark:text-gray-400">Connection</span>
          <div className={`flex items-center gap-1 px-2 py-1 rounded text-sm ${
            isOnline ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
          }`}>
            {isOnline ? <Wifi className="h-4 w-4" /> : <WifiOff className="h-4 w-4" />}
            {isOnline ? 'Online' : 'Offline'}
          </div>
        </div>

        {/* Pending Changes */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600 dark:text-gray-400">Pending Changes</span>
          <div className={`flex items-center gap-1 px-2 py-1 rounded text-sm ${
            pendingChanges > 0 ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-600'
          }`}>
            {pendingChanges > 0 ? <AlertCircle className="h-4 w-4" /> : <Check className="h-4 w-4" />}
            {pendingChanges}
          </div>
        </div>

        {/* Last Sync */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600 dark:text-gray-400">Last Sync</span>
          <span className="text-sm">
            {lastSyncTimestamp 
              ? new Date(lastSyncTimestamp).toLocaleString() 
              : 'Never'
            }
          </span>
        </div>

        {/* Sync Button */}
        <Button
          onClick={handleSync}
          disabled={!isOnline || syncInProgress}
          className="w-full mt-4"
          data-testid="sync-now-button"
        >
          {syncInProgress ? (
            <>
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              Syncing...
            </>
          ) : (
            <>
              <RefreshCw className="h-4 w-4 mr-2" />
              Sync Now
            </>
          )}
        </Button>

        {!isOnline && (
          <p className="text-xs text-center text-gray-500 mt-2">
            Data will automatically sync when you're back online
          </p>
        )}
      </div>
    </div>
  );
}

export default SyncStatusIndicator;
