// ═══════════════════════════════════════════════
//  云端同步调试组件
// ═══════════════════════════════════════════════

import React, { useState } from 'react'

const envId = import.meta.env.VITE_CLOUDBASE_ENV_ID || 'sjy-d0gxtaklr8e1be761'
const region = import.meta.env.VITE_CLOUDBASE_REGION || 'ap-shanghai'
const publishableKey = import.meta.env.VITE_TCB_PUBLISHABLE_KEY || ''

export const CloudSyncDebug: React.FC = () => {
  const [logs, setLogs] = useState<string[]>([])
  const [loading, setLoading] = useState(false)

  const addLog = (msg: string) => {
    setLogs(prev => [...prev, `${new Date().toLocaleTimeString()} ${msg}`])
  }

  const runTest = async () => {
    setLoading(true)
    setLogs([])

    try {
      // 1. 检查配置
      addLog(`🔧 配置检查:`)
      addLog(`  - envId: ${envId}`)
      addLog(`  - region: ${region}`)
      addLog(`  - publishableKey: ${publishableKey ? '已设置' : '未设置'}`)

      // 2. 动态导入 CloudBase
      addLog(`🚀 初始化 CloudBase...`)
      const cloudbaseSDK = await import('@cloudbase/js-sdk')
      const cloudbase = cloudbaseSDK.default.init({
        env: envId,
        region,
        accessKey: publishableKey || undefined,
      })
      addLog(`✅ CloudBase 初始化成功`)

      // 3. 匿名登录
      addLog(`🔑 尝试匿名登录...`)
      try {
        const loginRes: any = await cloudbase.auth().anonymousAuthProvider().signIn()
        addLog(`✅ 匿名登录成功: ${loginRes?.uid || 'unknown'}`)
      } catch (loginErr: any) {
        addLog(`❌ 匿名登录失败: ${loginErr.message}`)
      }

      // 4. 调用云函数 - count
      addLog(`📡 调用云函数 crud (action=count)...`)
      try {
        const result = await cloudbase.callFunction({
          name: 'crud',
          data: { action: 'count', collection: 'products' }
        })
        addLog(`✅ 调用成功:`)
        addLog(`  结果: ${JSON.stringify(result, null, 2)}`)
      } catch (callErr: any) {
        addLog(`❌ 调用失败: ${callErr.message}`)
        addLog(`  错误详情: ${JSON.stringify(callErr, null, 2)}`)
      }

      // 5. 调用云函数 - batchCreate (测试写入)
      addLog(`📡 调用云函数 crud (action=batchCreate)...`)
      try {
        const result = await cloudbase.callFunction({
          name: 'crud',
          data: {
            action: 'batchCreate',
            collection: 'products',
            dataList: [{ name: '测试商品', price: 100, test: true }]
          }
        })
        addLog(`✅ 调用成功:`)
        addLog(`  结果: ${JSON.stringify(result, null, 2)}`)
      } catch (callErr: any) {
        addLog(`❌ 调用失败: ${callErr.message}`)
        addLog(`  错误详情: ${JSON.stringify(callErr, null, 2)}`)
      }

    } catch (error: any) {
      addLog(`💥 测试异常: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ padding: 20, maxWidth: 800, margin: '0 auto' }}>
      <h2>🔧 云端同步调试</h2>
      <button
        onClick={runTest}
        disabled={loading}
        style={{
          padding: '10px 20px',
          fontSize: 16,
          background: loading ? '#ccc' : '#3b82f6',
          color: 'white',
          border: 'none',
          borderRadius: 8,
          cursor: loading ? 'not-allowed' : 'pointer',
          marginBottom: 20
        }}
      >
        {loading ? '测试中...' : '开始诊断测试'}
      </button>

      <div style={{
        background: '#1e1e1e',
        color: '#d4d4d4',
        padding: 15,
        borderRadius: 8,
        fontFamily: 'monospace',
        fontSize: 12,
        lineHeight: 1.6,
        maxHeight: 500,
        overflow: 'auto'
      }}>
        {logs.length === 0 ? (
          <div style={{ color: '#666' }}>点击按钮开始测试...</div>
        ) : (
          logs.map((log, i) => (
            <div key={i} style={{
              color: log.includes('❌') ? '#f87171' :
                     log.includes('✅') ? '#4ade80' :
                     log.includes('💥') ? '#ef4444' : '#d4d4d4'
            }}>
              {log}
            </div>
          ))
        )}
      </div>
    </div>
  )
}

export default CloudSyncDebug
