/**
 * 控制器管理
 * 管理外部观察模式和内部第一人称模式的控制器
 */
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import config from '@/config/config.js'
import { isMobileDevice } from '@/utils/threejs/mobile.js'

export class ControlsManager {
  constructor(scene, camera, renderer) {
    this.scene = scene
    this.camera = camera
    this.renderer = renderer
    
    this.orbitControls = null
    this.currentMode = 'external' // external: 外部观察, internal: 内部浏览
    this.currentViewMode = config.defaultViewMode // orbit: 自由环绕, fixed: 固定视角
    
    this.init()
  }
  
  init() {
    // 初始化外部观察控制器（OrbitControls）
    this.orbitControls = new OrbitControls(this.camera, this.renderer.domElement)
    this.orbitControls.enableDamping = true
    this.orbitControls.dampingFactor = 0.05
    this.orbitControls.minDistance = 2
    this.orbitControls.maxDistance = 300
    this.orbitControls.maxPolarAngle = Math.PI / 2
    this.orbitControls.minPolarAngle = 0

    // 移动端触摸灵敏度
    const touchSensitivity = config.mobile?.enabled && isMobileDevice()
      ? (config.mobile.touchSensitivity ?? 1.0)
      : 1.0
    this.orbitControls.rotateSpeed *= touchSensitivity
    this.orbitControls.zoomSpeed *= touchSensitivity
    this.orbitControls.panSpeed *= touchSensitivity

    // 设置外部视角初始位置
    this.setExternalView()
  }
  
  // 切换到外部观察模式
  // setDefaultView: 是否设置默认视角（默认 true，如果相机已适配则为 false）
  switchToExternal(setDefaultView = true) {
    this.currentMode = 'external'
    this.orbitControls.enabled = true
    if (setDefaultView) {
      this.setExternalView()
    } else {
      this.orbitControls.update()
    }
  }
  
  // 切换到内部浏览模式
  switchToInternal() {
    this.currentMode = 'internal'
    this.orbitControls.enabled = false
  }
  
  // 设置外部视角
  setExternalView() {
    if (this.currentViewMode === 'fixed' && config.fixedViews.length > 0) {
      const view = config.fixedViews[0]
      this.camera.position.set(...view.position)
      this.orbitControls.target.set(...view.target)
      this.orbitControls.update()
    } else {
      const cameraConfig = config.camera
      
      this.camera.position.set(...cameraConfig.externalPosition)
      
      const euler = new THREE.Euler(
        THREE.MathUtils.degToRad(cameraConfig.externalRotation.x),
        THREE.MathUtils.degToRad(cameraConfig.externalRotation.y),
        THREE.MathUtils.degToRad(cameraConfig.externalRotation.z),
        'XYZ'
      )
      this.camera.setRotationFromEuler(euler)
      
      this.camera.zoom = cameraConfig.externalZoom
      this.camera.updateProjectionMatrix()
      
      // 计算目标点（根据相机位置、旋转和距离）
      const forward = new THREE.Vector3(0, 0, -1)
      forward.applyQuaternion(this.camera.quaternion)
      const target = this.camera.position.clone().add(
        forward.multiplyScalar(cameraConfig.externalDistance)
      )
      
      this.orbitControls.target.copy(target)
      this.orbitControls.update()
    }
  }
  
  // 切换到固定视角
  switchToFixedView(index) {
    if (index >= 0 && index < config.fixedViews.length) {
      const view = config.fixedViews[index]
      this.camera.position.set(...view.position)
      this.orbitControls.target.set(...view.target)
      this.orbitControls.update()
      this.currentViewMode = 'fixed'
    }
  }
  
  // 切换到自由环绕模式
  switchToOrbitMode() {
    this.currentViewMode = 'orbit'
  }
  
  // 更新控制器
  update() {
    if (this.currentMode === 'external' && this.orbitControls.enabled) {
      this.orbitControls.update()
    }
  }
  
  // 获取当前模式
  getCurrentMode() {
    return this.currentMode
  }
  
  // 获取当前视角模式
  getCurrentViewMode() {
    return this.currentViewMode
  }
}
