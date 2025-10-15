/**
 * Offline Indicator Component
 * 
 * Shows connection status and sync progress
 * - Online/Offline badge
 * - Sync progress animation
 * - Queue statistics
 * - Retry status
 */

import React, { useEffect, useState } from 'react';
import { offlineDetector } from '../services/cache';
import { backgroundSync, SyncStatus } from '../services/backgroundSync';
import { offlineStorage } from '../services/offlineStorage';

interface OfflineIndicatorProps {
  className?: string;
  showDetails?: boolean;
}

export const OfflineIndicator: React.FC<OfflineIndicatorProps> = ({
  className = '',
  showDetails = false,
}) => {
  const [isOffline, setIsOffline] = useState(false);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({ status: 'idle' });
  const [queueStats, setQueueStats] = useState({
    total: 0,
    byType: {} as Record<string, number>,
    oldestTimestamp: null as number | null,
  });
  const [storageStats, setStorageStats] = useState({
    explanations: 0,
    queue: 0,
    analytics: 0,
    estimatedSizeMB: 0,
  });
  const [showDetailsPanel, setShowDetailsPanel] = useState(false);

  useEffect(() => {
    // Subscribe to offline status
    const unsubscribeOffline = offlineDetector.subscribe(setIsOffline);
    setIsOffline(offlineDetector.isCurrentlyOffline());

    // Subscribe to sync status
    const unsubscribeSync = backgroundSync.subscribe(setSyncStatus);

    // Load initial stats
    loadStats();

    // Refresh stats periodically
    const interval = setInterval(loadStats, 10000); // Every 10s

    return () => {
      unsubscribeOffline();
      unsubscribeSync();
      clearInterval(interval);
    };
  }, []);

  const loadStats = async () => {
    const queue = await backgroundSync.getQueueStats();
    const storage = await offlineStorage.getStats();
    setQueueStats(queue);
    setStorageStats(storage);
  };

  const handleSync = async () => {
    await backgroundSync.syncNow();
    await loadStats();
  };

  const handleClearCache = async () => {
    if (confirm('Clear all offline data? This will delete cached explanations and queued requests.')) {
      await offlineStorage.clearAll();
      await loadStats();
    }
  };

  // Don't show if online and nothing queued
  if (!isOffline && queueStats.total === 0 && syncStatus.status === 'idle') {
    return null;
  }

  return (
    <div className={`offline-indicator ${className}`}>
      {/* Status Badge */}
      <div 
        className="status-badge"
        onClick={() => showDetails && setShowDetailsPanel(!showDetailsPanel)}
        style={{ cursor: showDetails ? 'pointer' : 'default' }}
      >
        {isOffline && (
          <div className="badge offline">
            <span className="icon">📡</span>
            <span className="text">Offline</span>
          </div>
        )}

        {!isOffline && syncStatus.status === 'syncing' && (
          <div className="badge syncing">
            <span className="icon spinner">🔄</span>
            <span className="text">Syncing...</span>
          </div>
        )}

        {!isOffline && syncStatus.status === 'success' && syncStatus.synced > 0 && (
          <div className="badge success">
            <span className="icon">✅</span>
            <span className="text">Synced {syncStatus.synced} items</span>
          </div>
        )}

        {!isOffline && queueStats.total > 0 && syncStatus.status === 'idle' && (
          <div className="badge pending">
            <span className="icon">⏳</span>
            <span className="text">{queueStats.total} pending</span>
          </div>
        )}
      </div>

      {/* Details Panel */}
      {showDetails && showDetailsPanel && (
        <div className="details-panel">
          <div className="panel-header">
            <h4>Offline Status</h4>
            <button 
              className="close-btn"
              onClick={() => setShowDetailsPanel(false)}
            >
              ✕
            </button>
          </div>

          <div className="panel-content">
            {/* Connection Status */}
            <div className="stat-row">
              <span className="label">Connection:</span>
              <span className={`value ${isOffline ? 'offline' : 'online'}`}>
                {isOffline ? '📡 Offline' : '🌐 Online'}
              </span>
            </div>

            {/* Sync Status */}
            <div className="stat-row">
              <span className="label">Sync Status:</span>
              <span className="value">
                {syncStatus.status === 'idle' && '💤 Idle'}
                {syncStatus.status === 'syncing' && `🔄 Syncing (${syncStatus.progress}%)`}
                {syncStatus.status === 'success' && `✅ Success (${syncStatus.synced} items)`}
                {syncStatus.status === 'partial' && `⚠️ Partial (${syncStatus.synced}/${syncStatus.synced + syncStatus.failed})`}
                {syncStatus.status === 'error' && `❌ Error: ${syncStatus.error}`}
              </span>
            </div>

            {/* Queue Stats */}
            {queueStats.total > 0 && (
              <>
                <div className="divider" />
                <div className="stat-row">
                  <span className="label">Queued Requests:</span>
                  <span className="value">{queueStats.total}</span>
                </div>

                {Object.entries(queueStats.byType).map(([type, count]) => (
                  <div key={type} className="stat-row sub">
                    <span className="label">{type}:</span>
                    <span className="value">{count}</span>
                  </div>
                ))}

                {queueStats.oldestTimestamp && (
                  <div className="stat-row">
                    <span className="label">Oldest:</span>
                    <span className="value">
                      {formatTimestamp(queueStats.oldestTimestamp)}
                    </span>
                  </div>
                )}
              </>
            )}

            {/* Storage Stats */}
            <div className="divider" />
            <div className="stat-row">
              <span className="label">Cached Explanations:</span>
              <span className="value">{storageStats.explanations}</span>
            </div>

            <div className="stat-row">
              <span className="label">Storage Used:</span>
              <span className="value">
                {storageStats.estimatedSizeMB.toFixed(2)} MB
              </span>
            </div>

            {/* Actions */}
            <div className="divider" />
            <div className="actions">
              {!isOffline && queueStats.total > 0 && (
                <button 
                  className="btn-primary"
                  onClick={handleSync}
                  disabled={syncStatus.status === 'syncing'}
                >
                  {syncStatus.status === 'syncing' ? 'Syncing...' : 'Sync Now'}
                </button>
              )}

              <button 
                className="btn-secondary"
                onClick={handleClearCache}
              >
                Clear Cache
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .offline-indicator {
          position: relative;
        }

        .status-badge {
          display: inline-block;
        }

        .badge {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 6px 12px;
          border-radius: 12px;
          font-size: 13px;
          font-weight: 500;
          transition: all 0.2s ease;
        }

        .badge:hover {
          transform: translateY(-1px);
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }

        .badge.offline {
          background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
          color: white;
        }

        .badge.syncing {
          background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
          color: white;
        }

        .badge.success {
          background: linear-gradient(135deg, #10b981 0%, #059669 100%);
          color: white;
        }

        .badge.pending {
          background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
          color: white;
        }

        .icon {
          font-size: 14px;
          line-height: 1;
        }

        .icon.spinner {
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        .text {
          line-height: 1;
        }

        /* Details Panel */
        .details-panel {
          position: absolute;
          top: calc(100% + 8px);
          right: 0;
          width: 320px;
          background: white;
          border-radius: 12px;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12);
          z-index: 1000;
          animation: slideDown 0.2s ease;
        }

        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .panel-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px;
          border-bottom: 1px solid #e5e7eb;
        }

        .panel-header h4 {
          margin: 0;
          font-size: 15px;
          font-weight: 600;
          color: #1f2937;
        }

        .close-btn {
          background: none;
          border: none;
          font-size: 18px;
          color: #6b7280;
          cursor: pointer;
          padding: 4px;
          line-height: 1;
          transition: color 0.2s;
        }

        .close-btn:hover {
          color: #1f2937;
        }

        .panel-content {
          padding: 16px;
        }

        .stat-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 8px 0;
          font-size: 13px;
        }

        .stat-row.sub {
          padding-left: 16px;
          font-size: 12px;
        }

        .stat-row .label {
          color: #6b7280;
          font-weight: 500;
        }

        .stat-row .value {
          color: #1f2937;
          font-weight: 600;
        }

        .stat-row .value.online {
          color: #10b981;
        }

        .stat-row .value.offline {
          color: #ef4444;
        }

        .divider {
          height: 1px;
          background: #e5e7eb;
          margin: 12px 0;
        }

        .actions {
          display: flex;
          gap: 8px;
          margin-top: 16px;
        }

        .actions button {
          flex: 1;
          padding: 8px 16px;
          border-radius: 8px;
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
          border: none;
        }

        .btn-primary {
          background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%);
          color: white;
        }

        .btn-primary:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(139, 92, 246, 0.3);
        }

        .btn-primary:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .btn-secondary {
          background: #f3f4f6;
          color: #4b5563;
        }

        .btn-secondary:hover {
          background: #e5e7eb;
        }
      `}</style>
    </div>
  );
};

/**
 * Format timestamp to relative time
 */
function formatTimestamp(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;

  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (minutes > 0) return `${minutes}m ago`;
  return `${seconds}s ago`;
}

/**
 * Compact Offline Indicator (for header)
 */
export const CompactOfflineIndicator: React.FC = () => {
  const [isOffline, setIsOffline] = useState(false);
  const [queueCount, setQueueCount] = useState(0);

  useEffect(() => {
    const unsubscribe = offlineDetector.subscribe(setIsOffline);
    setIsOffline(offlineDetector.isCurrentlyOffline());

    const loadQueue = async () => {
      const stats = await backgroundSync.getQueueStats();
      setQueueCount(stats.total);
    };

    loadQueue();
    const interval = setInterval(loadQueue, 10000);

    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, []);

  if (!isOffline && queueCount === 0) return null;

  return (
    <div className="compact-indicator">
      {isOffline && <span className="dot offline" title="Offline" />}
      {!isOffline && queueCount > 0 && (
        <span className="dot syncing" title={`${queueCount} items queued`} />
      )}

      <style>{`
        .compact-indicator {
          display: inline-flex;
          align-items: center;
        }

        .dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          animation: pulse 2s ease-in-out infinite;
        }

        .dot.offline {
          background: #ef4444;
        }

        .dot.syncing {
          background: #f59e0b;
        }

        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  );
};