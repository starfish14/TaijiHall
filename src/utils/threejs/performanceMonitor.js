/**
 * 模型性能测试模块
 * 在控制台输出实际性能值（帧率、帧耗时等），用于性能测试文档的数据采集
 * 通过 config.performanceMonitor.enabled 控制是否开启
 */
import config from '@/config/config.js'

export class PerformanceMonitor {
  constructor() {
    // 调用方应确保 config.performanceMonitor.enabled 为 true 时才创建实例
    this.enabled = true
    this.logInterval = (config.performanceMonitor?.logInterval ?? 5000) // 输出间隔（毫秒）
    this.frameCount = 0
    this.lastLogTime = performance.now()
    this.frameTimes = []
    this.maxSamples = 60 // 保留最近 60 帧用于计算平均值
  }

  /**
   * 每帧调用，用于统计帧率
   * @param {number} now - 当前时间戳（performance.now()）
   */
  tick(now = performance.now()) {
    if (!this.enabled) return

    this.frameCount++
    if (this._lastFrameTime !== undefined) {
      const frameTime = now - this._lastFrameTime
      this.frameTimes.push(frameTime)
      if (this.frameTimes.length > this.maxSamples) {
        this.frameTimes.shift()
      }
    }
    this._lastFrameTime = now

    // 达到输出间隔时输出到控制台
    if (now - this.lastLogTime >= this.logInterval) {
      this._logToConsole(now)
      this.lastLogTime = now
    }
  }

  _logToConsole(now) {
    if (this.frameTimes.length === 0) return

    const avgFrameTime = this.frameTimes.reduce((a, b) => a + b, 0) / this.frameTimes.length
    const fps = 1000 / avgFrameTime
    const minFrameTime = Math.min(...this.frameTimes)
    const maxFrameTime = Math.max(...this.frameTimes)

    // 内存信息（仅 Chrome 等支持 performance.memory 的浏览器）
    let memoryInfo = ''
    if (performance.memory) {
      const used = (performance.memory.usedJSHeapSize / 1024 / 1024).toFixed(2)
      const total = (performance.memory.totalJSHeapSize / 1024 / 1024).toFixed(2)
      memoryInfo = ` | 内存: ${used}MB / ${total}MB`
    }

    const output = [
      `[性能监控] 帧率: ${fps.toFixed(1)} fps`,
      `平均帧耗时: ${avgFrameTime.toFixed(2)} ms`,
      `帧耗时范围: ${minFrameTime.toFixed(1)} ~ ${maxFrameTime.toFixed(1)} ms`,
      `采样帧数: ${this.frameTimes.length}${memoryInfo}`
    ].join(' | ')

    console.log(output)
  }

  dispose() {
    this.enabled = false
    this.frameTimes = []
    this._lastFrameTime = undefined
  }
}
