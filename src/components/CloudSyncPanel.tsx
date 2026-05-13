// ═══════════════════════════════════════════════
//  云端同步面板组件
// ═══════════════════════════════════════════════

import React, { useState, useEffect, useCallback } from 'react'
import {
  syncSpecificCollections,
  getLocalStats,
  type SyncProgress,
  type SyncResult,
  type SyncAllResult,
} from '../utils/syncToCloud'

interface CloudSyncPanelProps {
  onClose?: () => void
}

const COLLECTION_NAMES: Record<string, string> = {
  products: '商品',
  hanfuItems: '汉服',
  orders: '订单',
  rentalOrders: '租赁订单',
  users: '用户',
  favorites: '收藏',
}

export const CloudSyncPanel: React.FC<CloudSyncPanelProps> = ({ onClose }) => {
  const [localStats, setLocalStats] = useState<Record<string, number>>({})
  const [isLoading, setIsLoading] = useState(false)
  const [progress, setProgress] = useState<SyncProgress | null>(null)
  const [results, setResults] = useState<SyncResult[]>([])
  const [finalResult, setFinalResult] = useState<SyncAllResult | null>(null)
  const [selectedCollections, setSelectedCollections] = useState<string[]>([
    'products', 'hanfuItems', 'orders', 'rentalOrders', 'users', 'favorites'
  ])

  // 加载本地统计
  useEffect(() => {
    getLocalStats().then(setLocalStats)
  }, [])

  // 开始同步
  const handleSync = useCallback(async () => {
    setIsLoading(true)
    setProgress(null)
    setResults([])
    setFinalResult(null)

    const onProgress = (p: SyncProgress) => {
      setProgress(p)
    }

    // const onCollectionComplete = (result: SyncResult) => {
    //   setResults(prev => [...prev, result])
    // }

    try {
      const result = await syncSpecificCollections(selectedCollections, onProgress)
      setFinalResult(result)
    } catch (error) {
      console.error('同步失败:', error)
    } finally {
      setIsLoading(false)
      setProgress(null)
    }
  }, [selectedCollections])

  // 切换集合选择
  const toggleCollection = (collection: string) => {
    setSelectedCollections(prev =>
      prev.includes(collection)
        ? prev.filter(c => c !== collection)
        : [...prev, collection]
    )
  }

  // 计算总记录数
  const totalRecords = Object.values(localStats).reduce((sum, count) => sum + count, 0)

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2 style={styles.title}>☁️ 云端同步</h2>
        {onClose && (
          <button onClick={onClose} style={styles.closeBtn}>✕</button>
        )}
      </div>

      {/* 本地数据统计 */}
      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>📊 本地数据</h3>
        <div style={styles.statsGrid}>
          {Object.entries(localStats).map(([key, count]) => (
            <div key={key} style={styles.statItem}>
              <span style={styles.statName}>{COLLECTION_NAMES[key] || key}</span>
              <span style={styles.statCount}>{count} 条</span>
            </div>
          ))}
        </div>
        <div style={styles.total}>总计: {totalRecords} 条记录</div>
      </div>

      {/* 选择同步范围 */}
      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>🎯 同步范围</h3>
        <div style={styles.checkboxGroup}>
          {Object.entries(COLLECTION_NAMES).map(([key, name]) => (
            <label key={key} style={styles.checkbox}>
              <input
                type="checkbox"
                checked={selectedCollections.includes(key)}
                onChange={() => toggleCollection(key)}
                disabled={isLoading}
              />
              <span>{name} ({localStats[key] || 0})</span>
            </label>
          ))}
        </div>
      </div>

      {/* 同步按钮 */}
      <button
        onClick={handleSync}
        disabled={isLoading || selectedCollections.length === 0}
        style={{
          ...styles.syncBtn,
          opacity: isLoading || selectedCollections.length === 0 ? 0.6 : 1,
        }}
      >
        {isLoading ? '⏳ 同步中...' : '🚀 开始同步到云端'}
      </button>

      {/* 进度显示 */}
      {isLoading && progress && (
        <div style={styles.progressSection}>
          <div style={styles.progressHeader}>
            <span style={styles.progressCollection}>
              {COLLECTION_NAMES[progress.collection] || progress.collection}
            </span>
            <span style={styles.progressStatus}>{progress.message}</span>
          </div>
          <div style={styles.progressBar}>
            <div
              style={{
                ...styles.progressFill,
                width: progress.total > 0 ? `${(progress.current / progress.total) * 100}%` : '0%',
              }}
            />
          </div>
          <div style={styles.progressCount}>
            {progress.current} / {progress.total}
          </div>
        </div>
      )}

      {/* 同步结果 */}
      {results.length > 0 && (
        <div style={styles.section}>
          <h3 style={styles.sectionTitle}>📋 同步进度</h3>
          <div style={styles.resultList}>
            {results.map((result, index) => (
              <div
                key={index}
                style={{
                  ...styles.resultItem,
                  background: result.success ? '#f0fdf4' : '#fef2f2',
                  borderColor: result.success ? '#86efac' : '#fecaca',
                }}
              >
                <div style={styles.resultHeader}>
                  <span style={styles.resultName}>
                    {COLLECTION_NAMES[result.collection] || result.collection}
                  </span>
                  <span style={{
                    ...styles.resultStatus,
                    color: result.success ? '#16a34a' : '#dc2626',
                  }}>
                    {result.success ? '✓ 成功' : '✗ 失败'}
                  </span>
                </div>
                <div style={styles.resultDetail}>
                  {result.total > 0 ? (
                    <>
                      成功: {result.successCount} / {result.total} 条
                      {result.failCount > 0 && (
                        <span style={styles.failCount}>，失败: {result.failCount} 条</span>
                      )}
                      <span style={styles.duration}>（{result.duration}ms）</span>
                    </>
                  ) : (
                    <span>无数据</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 最终结果 */}
      {finalResult && (
        <div style={{
          ...styles.finalResult,
          background: finalResult.overallSuccess ? '#f0fdf4' : '#fef2f2',
          borderColor: finalResult.overallSuccess ? '#86efac' : '#fecaca',
        }}>
          <h3 style={styles.finalTitle}>
            {finalResult.overallSuccess ? '✅ 同步完成' : (finalResult.summary.failRecords === finalResult.summary.totalRecords ? '❌ 同步全部失败' : '⚠️ 同步完成（部分失败）')}
          </h3>
          <div style={styles.finalStats}>
            <div>总记录: {finalResult.summary.totalRecords} 条</div>
            <div style={{ color: '#16a34a' }}>成功: {finalResult.summary.successRecords} 条</div>
            {finalResult.summary.failRecords > 0 && (
              <div style={{ color: '#dc2626' }}>失败: {finalResult.summary.failRecords} 条</div>
            )}
            <div style={styles.finalDuration}>耗时: {finalResult.totalDuration}ms</div>
          </div>
          {/* 显示错误详情 */}
          {finalResult.results.some(r => r.errors.length > 0) && (
            <div style={{ marginTop: 12, padding: 10, background: '#fff1f2', borderRadius: 6, fontSize: 12 }}>
              <div style={{ fontWeight: 600, color: '#dc2626', marginBottom: 6 }}>错误详情：</div>
              {finalResult.results.filter(r => r.errors.length > 0).map((r, i) => (
                <div key={i} style={{ marginBottom: 8 }}>
                  <div style={{ fontWeight: 600, color: '#374151' }}>{COLLECTION_NAMES[r.collection] || r.collection}：</div>
                  {r.errors.slice(0, 3).map((e, j) => (
                    <div key={j} style={{ color: '#991b1b', paddingLeft: 8, lineHeight: 1.6 }}>
                      • {e.error}
                    </div>
                  ))}
                  {r.errors.length > 3 && (
                    <div style={{ color: '#6b7280', paddingLeft: 8 }}>...共 {r.errors.length} 个错误</div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── 样式 ───────────────────────────────────

const styles: Record<string, React.CSSProperties> = {
  container: {
    padding: '24px',
    maxWidth: '600px',
    margin: '0 auto',
    background: '#fff',
    borderRadius: '12px',
    boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px',
    paddingBottom: '16px',
    borderBottom: '1px solid #e5e7eb',
  },
  title: {
    margin: 0,
    fontSize: '20px',
    fontWeight: 600,
    color: '#111827',
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    fontSize: '20px',
    cursor: 'pointer',
    color: '#6b7280',
  },
  section: {
    marginBottom: '20px',
  },
  sectionTitle: {
    margin: '0 0 12px 0',
    fontSize: '14px',
    fontWeight: 600,
    color: '#374151',
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '12px',
  },
  statItem: {
    display: 'flex',
    flexDirection: 'column',
    padding: '12px',
    background: '#f9fafb',
    borderRadius: '8px',
  },
  statName: {
    fontSize: '12px',
    color: '#6b7280',
    marginBottom: '4px',
  },
  statCount: {
    fontSize: '18px',
    fontWeight: 600,
    color: '#111827',
  },
  total: {
    marginTop: '12px',
    padding: '12px',
    background: '#eff6ff',
    borderRadius: '8px',
    textAlign: 'center',
    fontWeight: 600,
    color: '#1d4ed8',
  },
  checkboxGroup: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '12px',
  },
  checkbox: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '8px 12px',
    background: '#f9fafb',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
  },
  syncBtn: {
    width: '100%',
    padding: '14px',
    background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.2s',
    marginBottom: '20px',
  },
  progressSection: {
    marginBottom: '20px',
    padding: '16px',
    background: '#eff6ff',
    borderRadius: '8px',
  },
  progressHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: '8px',
  },
  progressCollection: {
    fontWeight: 600,
    color: '#1d4ed8',
  },
  progressStatus: {
    fontSize: '12px',
    color: '#6b7280',
  },
  progressBar: {
    height: '8px',
    background: '#dbeafe',
    borderRadius: '4px',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    background: 'linear-gradient(90deg, #3b82f6, #2563eb)',
    borderRadius: '4px',
    transition: 'width 0.3s ease',
  },
  progressCount: {
    marginTop: '8px',
    fontSize: '12px',
    color: '#6b7280',
    textAlign: 'right',
  },
  resultList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  resultItem: {
    padding: '12px',
    borderRadius: '8px',
    border: '1px solid',
  },
  resultHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: '4px',
  },
  resultName: {
    fontWeight: 600,
    color: '#374151',
  },
  resultStatus: {
    fontSize: '12px',
    fontWeight: 600,
  },
  resultDetail: {
    fontSize: '12px',
    color: '#6b7280',
  },
  failCount: {
    color: '#dc2626',
  },
  duration: {
    marginLeft: '8px',
    color: '#9ca3af',
  },
  finalResult: {
    padding: '16px',
    borderRadius: '8px',
    border: '2px solid',
  },
  finalTitle: {
    margin: '0 0 12px 0',
    fontSize: '16px',
    fontWeight: 600,
  },
  finalStats: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '8px',
    fontSize: '14px',
  },
  finalDuration: {
    gridColumn: 'span 2',
    color: '#6b7280',
    fontSize: '12px',
  },
}

export default CloudSyncPanel
