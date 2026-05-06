/**
 * 交互处理系统
 * 处理展品交互、游戏区交互等
 */
import * as THREE from 'three'
import { Raycaster } from 'three'
import { loadExhibits } from '@/utils/configLoader.js'
import config from '@/config/config.js'
import { isMobileDevice } from '@/utils/threejs/mobile.js'

export class InteractionSystem {
  constructor(scene, camera, renderer, currentFloor = 1) {
    this.scene = scene
    this.camera = camera
    this.renderer = renderer
    this.raycaster = new Raycaster()
    this.mouse = new THREE.Vector2()

    // UA 检测只做一次，整个会话不变
    this._isMobile = isMobileDevice()
    // 全局交互距离缓存（移动端/PC 各取一次，避免每次 hover 重复读 config）
    this._globalInteractionDist = this._isMobile && config.mobile?.enabled
      ? (config.mobile.interactionDistance ?? config.interactionDistance)
      : config.interactionDistance

    this.exhibits = loadExhibits()
    // 预计算每个展品的 normalizedBounds，避免每次 hover/click 都重新计算
    this._precomputeBounds()

    this.currentFloor = currentFloor
    this.controlsManager = null

    this.hoveredItem = null
    this.onItemClick = null
    this.lastClickHandled = false
    this.isDragging = false
    this.dragDistance = 0
    this._wasDragging = false

    // 保存绑定后的处理函数引用，确保 removeEventListener 能正确匹配注册时的函数
    this._boundHandlers = {
      mousemove:  (e) => this.onMouseMove(e),
      click:      (e) => this.onClick(e),
      touchstart: (e) => this.onTouchStart(e),
      touchmove:  (e) => this.onTouchMove(e),
      touchend:   (e) => this.onTouchEnd(e)
    }

    // 复用的临时 Vector3，避免 checkHover / _collectCandidates 循环内 new
    this._tmpCamPos = new THREE.Vector3()
    this._tmpItemPos = new THREE.Vector3()
    this._tmpDir = new THREE.Vector3()

    this.setupEventListeners()
  }

  /**
   * 预计算每个展品的 normalizedBounds（_nb）和正面法向量（_frontNormal）。
   * 这些值在整个会话中不变，集中计算一次，避免 checkHover 热路径上重复创建 Vector3。
   */
  _precomputeBounds() {
    for (const item of this.exhibits) {
      // 1. 归一化包围盒（用于射线检测 & 距离计算）
      if (item.bounds) {
        item._nb = this._normalizeBoundsRaw(item.bounds)
      }

      // 2. 正面法向量（用于背面过滤），所有交互类型统一使用（exhibit、pageLink、richText 等）
      const frontRef = item.cameraPosition || item.cameraLookAt
      if (Array.isArray(frontRef) && frontRef.length >= 3) {
        // 中心点
        let cx, cy, cz
        if (item._nb) {
          const { min, max } = item._nb
          cx = (min.x + max.x) / 2
          cy = (min.y + max.y) / 2
          cz = (min.z + max.z) / 2
        } else if (item.position) {
          ;[cx, cy, cz] = item.position
        }
        if (cx !== undefined) {
          item._frontNormal = new THREE.Vector3(
            frontRef[0] - cx,
            frontRef[1] - cy,
            frontRef[2] - cz
          ).normalize()
        }
      }
    }
  }

  setControlsManager(controlsManager) {
    this.controlsManager = controlsManager
  }

  setDragging(isDragging, dragDistance = 0) {
    if (this.isDragging && !isDragging && this.dragDistance > 5) {
      this._wasDragging = true
    }
    this.isDragging = isDragging
    this.dragDistance = dragDistance
  }

  setCurrentFloor(floor) {
    this.currentFloor = floor
    if (this.hoveredItem && this.hoveredItem.floor !== floor) {
      this.hoveredItem = null
      this.renderer.domElement.style.cursor = 'default'
    }
  }

  setupEventListeners() {
    const el = this.renderer.domElement
    el.addEventListener('mousemove',  this._boundHandlers.mousemove)
    el.addEventListener('click',      this._boundHandlers.click)
    el.addEventListener('touchstart', this._boundHandlers.touchstart)
    el.addEventListener('touchmove',  this._boundHandlers.touchmove)
    el.addEventListener('touchend',   this._boundHandlers.touchend)
  }

  updateMousePosition(event) {
    const rect = this.renderer.domElement.getBoundingClientRect()
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1
  }

  onMouseMove(event) {
    this.updateMousePosition(event)
    this.checkHover()
  }

  onTouchMove(event) {
    if (event.touches.length === 1) {
      this.updateMousePosition(event.touches[0])
      this.checkHover()
    }
  }

  onTouchStart(event) {
    if (event.touches.length === 1) {
      this.updateMousePosition(event.touches[0])
    }
  }

  onTouchEnd(event) {
    if (event.changedTouches.length === 1) {
      this.updateMousePosition(event.changedTouches[0])
      this.handleClick()
    }
  }

  checkHover() {
    this.raycaster.setFromCamera(this.mouse, this.camera)

    if (this.controlsManager && this.controlsManager.getCurrentMode() === 'external') {
      this.hoveredItem = null
      this.renderer.domElement.style.cursor = 'default'
      return
    }

    const candidates = this._collectCandidates(this.raycaster.ray)

    if (candidates.length > 0) {
      this.hoveredItem = candidates[0].item
      this.renderer.domElement.style.cursor = 'pointer'
    } else {
      this.hoveredItem = null
      this.renderer.domElement.style.cursor = 'default'
    }
  }

  /**
   * 收集当前射线下满足距离+方向条件的候选交互项，按命中距离升序排列。
   * checkHover 和 handleClick 共用此逻辑，避免重复代码。
   */
  _collectCandidates(ray) {
    const candidates = []
    this._tmpCamPos.copy(this.camera.position)

    for (const item of this.exhibits) {
      if (item.floor !== this.currentFloor) continue

      // 每个展品可单独配置交互距离
      const interactionDist = (item.interactionRadius > 0)
        ? item.interactionRadius
        : this._globalInteractionDist

      const distance = this._getDistanceToItem(item)
      if (distance > interactionDist) continue

      if (item.bounds) {
        // 使用预计算的 normalizedBounds 做 AABB 射线检测
        const hitT = item._nb
          ? this._rayIntersectsNB(ray, item._nb)
          : this.checkRayIntersectsBounds(ray, item.bounds)
        if (hitT >= 0 && !this.isClickOnExhibitBack(item)) {
          candidates.push({ item, hitDistance: hitT })
        }
      } else if (item.position) {
        this._tmpItemPos.set(...item.position)
        this._tmpDir.subVectors(this._tmpItemPos, this._tmpCamPos).normalize()
        const threshold = config.directionThreshold || 0.5
        if (this._tmpDir.dot(ray.direction) > threshold && !this.isClickOnExhibitBack(item)) {
          candidates.push({ item, hitDistance: this._tmpCamPos.distanceTo(this._tmpItemPos) })
        }
      }
    }

    if (candidates.length > 1) {
      candidates.sort((a, b) => a.hitDistance - b.hitDistance)
    }
    return candidates
  }

  // 私有：计算相机到展品的最近距离（使用缓存的 _tmpCamPos，外部循环中已赋值）
  _getDistanceToItem(item) {
    if (item.bounds) {
      if (item._nb) {
        // 直接用预计算的 normalizedBounds 算距离，避免重复 normalizeBounds
        const { min, max } = item._nb
        const cx = Math.max(min.x, Math.min(max.x, this._tmpCamPos.x))
        const cy = Math.max(min.y, Math.min(max.y, this._tmpCamPos.y))
        const cz = Math.max(min.z, Math.min(max.z, this._tmpCamPos.z))
        const dx = this._tmpCamPos.x - cx
        const dy = this._tmpCamPos.y - cy
        const dz = this._tmpCamPos.z - cz
        return Math.sqrt(dx * dx + dy * dy + dz * dz)
      }
      return this.getDistanceToBounds(item.bounds)
    }
    if (item.position) {
      this._tmpItemPos.set(...item.position)
      return this._tmpCamPos.distanceTo(this._tmpItemPos)
    }
    return Infinity
  }

  getDistanceToItem(item) {
    this._tmpCamPos.copy(this.camera.position)
    return this._getDistanceToItem(item)
  }

  getDistanceToExhibit(exhibit) {
    return this.getDistanceToItem(exhibit)
  }

  getDistanceToBounds(bounds) {
    const normalized = this.normalizeBounds(bounds)
    if (!normalized) return Infinity
    const { min, max } = normalized
    const cam = this.camera.position
    const cx = Math.max(min.x, Math.min(max.x, cam.x))
    const cy = Math.max(min.y, Math.min(max.y, cam.y))
    const cz = Math.max(min.z, Math.min(max.z, cam.z))
    const dx = cam.x - cx, dy = cam.y - cy, dz = cam.z - cz
    return Math.sqrt(dx * dx + dy * dy + dz * dz)
  }

  /**
   * 将 bounds 统一转换为 { min, max } 的 Vector3 格式
   * 同时对过薄的维度自动膨胀，防止射线难以命中
   */
  normalizeBounds(bounds, minThickness = 0.15) {
    return this._normalizeBoundsRaw(bounds, minThickness)
  }

  _normalizeBoundsRaw(bounds, minThickness = 0.15) {
    let min, max
    if (bounds.center && bounds.size) {
      const halfSize = new THREE.Vector3(...bounds.size).multiplyScalar(0.5)
      const center = new THREE.Vector3(...bounds.center)
      min = center.clone().sub(halfSize)
      max = center.clone().add(halfSize)
    } else if (bounds.min && bounds.max) {
      min = new THREE.Vector3(...bounds.min)
      max = new THREE.Vector3(...bounds.max)
    } else {
      return null
    }

    const realMin = new THREE.Vector3(
      Math.min(min.x, max.x), Math.min(min.y, max.y), Math.min(min.z, max.z)
    )
    const realMax = new THREE.Vector3(
      Math.max(min.x, max.x), Math.max(min.y, max.y), Math.max(min.z, max.z)
    )

    const halfMin = minThickness / 2
    for (const axis of ['x', 'y', 'z']) {
      if (realMax[axis] - realMin[axis] < minThickness) {
        const center = (realMin[axis] + realMax[axis]) / 2
        realMin[axis] = center - halfMin
        realMax[axis] = center + halfMin
      }
    }

    return { min: realMin, max: realMax }
  }

  /**
   * 判断当前相机是否在展品背面。
   * 所有交互类型（exhibit、pageLink、richText 等）统一逻辑：仅正面点击可响应。
   * 优先使用预计算的 _frontNormal，避免在热路径上创建 Vector3。
   */
  isClickOnExhibitBack(item) {
    // 无正面法向量时无法判断，允许点击（兼容未配置 cameraPosition/cameraLookAt 的项）
    if (!item._frontNormal) return false

    // cameraToCenter = center - camera.position，点积 > 0 说明相机在背面
    this._tmpDir.copy(this.camera.position)
    const center = this.getExhibitCenter(item)
    if (!center) return false
    this._tmpDir.subVectors(center, this.camera.position)
    return this._tmpDir.dot(item._frontNormal) > 0
  }

  getExhibitCenter(item) {
    if (item._nb) {
      const { min, max } = item._nb
      return new THREE.Vector3(
        (min.x + max.x) / 2,
        (min.y + max.y) / 2,
        (min.z + max.z) / 2
      )
    }
    if (item.bounds) {
      const normalized = this.normalizeBounds(item.bounds)
      if (!normalized) return null
      return new THREE.Vector3(
        (normalized.min.x + normalized.max.x) / 2,
        (normalized.min.y + normalized.max.y) / 2,
        (normalized.min.z + normalized.max.z) / 2
      )
    }
    if (item.position) {
      return new THREE.Vector3(...item.position)
    }
    return null
  }

  /**
   * 检查射线与预归一化包围盒的相交（内部快速版）
   */
  _rayIntersectsNB(ray, nb) {
    const { min, max } = nb
    const invDirX = 1 / ray.direction.x
    const invDirY = 1 / ray.direction.y
    const invDirZ = 1 / ray.direction.z

    const t1 = (min.x - ray.origin.x) * invDirX
    const t2 = (max.x - ray.origin.x) * invDirX
    const t3 = (min.y - ray.origin.y) * invDirY
    const t4 = (max.y - ray.origin.y) * invDirY
    const t5 = (min.z - ray.origin.z) * invDirZ
    const t6 = (max.z - ray.origin.z) * invDirZ

    const tmin = Math.max(Math.min(t1, t2), Math.min(t3, t4), Math.min(t5, t6))
    const tmax = Math.min(Math.max(t1, t2), Math.max(t3, t4), Math.max(t5, t6))

    if (tmax < 0 || tmin > tmax) return -1
    return tmin >= 0 ? tmin : tmax
  }

  /**
   * 检查射线是否与展品的包围盒相交（公开接口，兼容未预计算的 bounds）
   */
  checkRayIntersectsBounds(ray, bounds) {
    const normalized = this.normalizeBounds(bounds)
    if (!normalized) return -1
    return this._rayIntersectsNB(ray, normalized)
  }

  onClick(event) {
    this.updateMousePosition(event)
    this.handleClick()
  }

  handleClick() {
    this.lastClickHandled = false

    if (this.controlsManager && this.controlsManager.getCurrentMode() === 'external') return
    if (this.isDragging && this.dragDistance > 5) return
    if (this._wasDragging) {
      this._wasDragging = false
      return
    }

    // 每次点击统一做一次候选收集，消除之前 checkHover + _collectCandidates 的重复调用。
    // checkHover 会设置 cursor 样式和 hoveredItem，点击时只需要找到 item 并触发回调。
    this.raycaster.setFromCamera(this.mouse, this.camera)
    const candidates = this._collectCandidates(this.raycaster.ray)

    // 同步更新 hoveredItem（保持与 checkHover 一致）
    this.hoveredItem = candidates.length > 0 ? candidates[0].item : null
    this.renderer.domElement.style.cursor = this.hoveredItem ? 'pointer' : 'default'

    if (this.hoveredItem && this.onItemClick) {
      this.onItemClick(this.hoveredItem)
      this.lastClickHandled = true
    }
  }

  wasLastClickHandled() { return this.lastClickHandled }

  setItemClickCallback(callback) { this.onItemClick = callback }
  setExhibitClickCallback(callback) { this.onItemClick = callback }

  getHoveredItem() { return this.hoveredItem }
  getHoveredExhibit() { return this.hoveredItem }

  isMobile() { return this._isMobile }

  dispose() {
    const el = this.renderer.domElement
    el.removeEventListener('mousemove',  this._boundHandlers.mousemove)
    el.removeEventListener('click',      this._boundHandlers.click)
    el.removeEventListener('touchstart', this._boundHandlers.touchstart)
    el.removeEventListener('touchmove',  this._boundHandlers.touchmove)
    el.removeEventListener('touchend',   this._boundHandlers.touchend)
  }
}
