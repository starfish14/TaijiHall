/**
 * 移动端适配工具
 */
import config from '@/config/config.js'

/** 检测当前设备是否为移动端（统一入口，避免各模块重复 UA 正则） */
export const isMobileDevice = () =>
  /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)

export class MobileAdapter {
  constructor() {
    this.isMobile = this.detectMobile()
    this.touchStartPos = null
    this.touchStartTime = 0
    this.lastTouchTime = 0
    this.doubleTapDelay = 300
  }
  
  detectMobile() {
    return isMobileDevice()
  }
  
  isEnabled() {
    return config.mobile?.enabled && this.isMobile
  }
  
  getConfig() {
    return config.mobile || {}
  }
  
  // 处理触摸事件
  handleTouchStart(event) {
    const touch = event.touches[0]
    this.touchStartPos = {
      x: touch.clientX,
      y: touch.clientY
    }
    this.touchStartTime = Date.now()
    
    // 检测双击
    const now = Date.now()
    if (now - this.lastTouchTime < this.doubleTapDelay) {
      this.onDoubleTap(event)
    }
    this.lastTouchTime = now
  }
  
  handleTouchMove(event) {
    // 可以在这里处理手势识别
  }
  
  handleTouchEnd(event) {
    this.touchStartPos = null
  }
  
  onDoubleTap(event) {
    // 双击事件处理
    if (this.onDoubleTapCallback) {
      this.onDoubleTapCallback(event)
    }
  }
  
  setDoubleTapCallback(callback) {
    this.onDoubleTapCallback = callback
  }
  
  // 防止默认行为
  preventDefault(event) {
    event.preventDefault()
  }
  
  // 获取触摸灵敏度
  getTouchSensitivity() {
    return this.getConfig().touchSensitivity || 1.0
  }
  
  // 获取目标帧率
  getTargetFPS() {
    return this.getConfig().targetFPS || 30
  }
  
  // 是否启用性能模式
  isPerformanceMode() {
    return this.getConfig().performanceMode || false
  }
  
  // 是否启用虚拟摇杆
  isVirtualJoystickEnabled() {
    return this.getConfig().enableVirtualJoystick || false
  }
  
  // 获取按钮缩放比例
  getButtonScale() {
    return this.getConfig().buttonScale || 1.5
  }
  
  // 获取交互距离
  getInteractionDistance() {
    return this.getConfig().interactionDistance || config.interactionDistance
  }
  
  // 是否启用手势导航
  isGestureNavigationEnabled() {
    return this.getConfig().enableGestureNavigation || false
  }
  
  // 设置视口
  setupViewport() {
    const viewport = document.querySelector('meta[name="viewport"]')
    if (viewport) {
      viewport.setAttribute('content', 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover')
    }
  }
  
  // 禁用右键菜单（移动端）
  disableContextMenu() {
    if (this.isMobile) {
      document.addEventListener('contextmenu', (e) => {
        e.preventDefault()
      })
    }
  }
  
  // 初始化移动端适配
  init() {
    if (this.isEnabled()) {
      this.setupViewport()
      this.disableContextMenu()
    }
  }
}

