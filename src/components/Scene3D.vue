<template>
  <div class="scene-container" ref="containerRef">
    <div v-if="loading" class="loading-overlay">
      <div class="loading-content">
        <div class="loading-spinner"></div>
        <p>加载中... {{ Math.round(loadingProgress) }}%</p>
      </div>
    </div>
    
    <!-- 移动提示 Tooltip -->
    <div
      v-if="showMoveTooltip && tooltipPosition"
      class="move-tooltip"
      :style="{
        left: tooltipPosition.x + 'px',
        top: tooltipPosition.y + 'px',
        pointerEvents: 'none'
      }"
    >
      <div class="tooltip-content">
        <p class="tooltip-text">{{ tooltipText }}</p>
      </div>
    </div>
    
    <!-- 展品提示 Tooltip -->
    <div
      v-if="showExhibitTooltip && exhibitTooltipPosition"
      class="exhibit-tooltip"
      :style="{
        left: exhibitTooltipPosition.x + 'px',
        top: exhibitTooltipPosition.y + 'px',
        pointerEvents: 'none'
      }"
    >
      <div class="tooltip-content">
        <p class="tooltip-text">{{ exhibitTooltipText }}</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, watch, nextTick } from 'vue'
import * as THREE from 'three'
import { Scene3D } from '@/utils/threejs/scene.js'
import { ControlsManager } from '@/utils/threejs/controls.js'
import { CollisionSystem } from '@/utils/threejs/collision.js'
import { InteractionSystem } from '@/utils/threejs/interaction.js'
import { MobileAdapter } from '@/utils/threejs/mobile.js'
import { DebugGUI } from '@/utils/threejs/debugGUI.js'
import { PathNavigator } from '@/utils/threejs/pathNavigator.js'
import { PerformanceMonitor } from '@/utils/threejs/performanceMonitor.js'
import { Tween } from '@tweenjs/tween.js'
import config from '@/config/config.js'
import { getFloorByLevel } from '@/utils/configLoader.js'

const props = defineProps({
  modelPath: {
    type: String,
    default: '/models/exhibit.glb'
  },
  viewMode: {
    type: String,
    default: 'external' // external, internal
  },
  currentFloor: {
    type: Number,
    default: 1
  }
})

const emit = defineEmits(['item-click', 'exhibit-click', 'loading-complete'])

const containerRef = ref(null)
const loading = ref(true)
const loadingProgress = ref(0)
const showMoveTooltip = ref(false)
const tooltipPosition = ref(null)
const tooltipText = ref('点击移动')

const showExhibitTooltip = ref(false)
const exhibitTooltipPosition = ref(null)
const exhibitTooltipText = ref('')

let scene3D = null
let controlsManager = null
let collisionSystem = null
let interactionSystem = null
let mobileAdapter = null
let debugGUI = null
let pathNavigator = null
let performanceMonitor = null
let animationId = null
let moveTween = null
let currentPosition = [0, 0, 0]
let isMoving = false
let isDraggingView = false
let dragStart = { x: 0, y: 0 }
let lastDragPos = { x: 0, y: 0 }
let dragDistance = 0
let suppressNextClick = false
let userViewRotated = false

// 复用的临时对象，避免在高频事件和点击回调中频繁 GC
const _pointerEuler       = new THREE.Euler()
const _clickRaycaster     = new THREE.Raycaster()
const _clickGroundPlane   = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0)
const _clickIntersectPoint = new THREE.Vector3()
// moveTo 内复用的临时 Vector3
const _mtCurrentPos3D  = new THREE.Vector3()
const _mtTargetPos3D   = new THREE.Vector3()
const _mtDirection     = new THREE.Vector3()
const _mtToCenter      = new THREE.Vector3()
const _mtFallbackTarget = new THREE.Vector3()

// _runPath 内复用的临时 Vector3（单路径并发安全，不在多路径中共用）
const _rpLookAheadPt   = new THREE.Vector3()
const _rpModelCenterPt = new THREE.Vector3()
const _rpBlendedLookAt = new THREE.Vector3()
const _rpSafePosVec    = new THREE.Vector3()

onMounted(async () => {
  if (!containerRef.value) return
  
  // 初始化移动端适配
  mobileAdapter = new MobileAdapter()
  mobileAdapter.init()
  
  // 初始化场景
  scene3D = new Scene3D(containerRef.value)

  // 初始化路线导航器（场景创建后立即初始化，可视化对象依赖 scene）
  pathNavigator = new PathNavigator(scene3D.scene)
  
  // 将 scene3D 实例存储到 scene.userData 中，供调试面板使用
  scene3D.scene.userData.scene3D = scene3D
  // interactionSystem 在下方初始化后才会写入 scene.userData，此处不提前赋 null

  // 监听加载进度
  const progressInterval = setInterval(() => {
    if (scene3D) {
      loadingProgress.value = scene3D.loadingProgress
    }
  }, 100)
  
  // 初始化控制器（需要在模型加载前初始化，以便设置引用）
  controlsManager = new ControlsManager(
    scene3D.scene,
    scene3D.camera,
    scene3D.renderer
  )
  
  // 将 OrbitControls 引用传递给 Scene3D，以便自动适配
  scene3D.setOrbitControls(controlsManager.orbitControls)
  
  try {
    // 加载主场景模型
    await scene3D.loadModel(props.modelPath)
    // 加载模型展品（独立 3D 模型）
    await scene3D.loadModelExhibits()
    loading.value = false
    clearInterval(progressInterval)
    
    // 模型渲染成功后，调用外部观察视角
    // 使用 nextTick 确保 DOM 更新完成
    await nextTick()
    switchToExternalMode(true) // 设置为外部观察视角
    
    emit('loading-complete')
  } catch (error) {
    console.error('模型加载失败:', error)
    loading.value = false
    clearInterval(progressInterval)
  }
  
  // 初始化碰撞系统
  collisionSystem = new CollisionSystem()
  
  // 初始化交互系统（传入当前楼层）
  interactionSystem = new InteractionSystem(
    scene3D.scene,
    scene3D.camera,
    scene3D.renderer,
    props.currentFloor
  )
  
  // 设置 ControlsManager 引用，用于判断当前模式
  interactionSystem.setControlsManager(controlsManager)

  // interactionSystem 初始化完成后，存入 scene.userData 供调试面板使用
  scene3D.scene.userData.interactionSystem = interactionSystem
  
  // 设置统一的交互回调
  interactionSystem.setItemClickCallback((item) => {
    // 统一触发 item-click 事件
    emit('item-click', item)
    emit('exhibit-click', item)
  })
  
  // 设置点击移动（内部模式）
  setupClickToMove()
  
  // 设置移动端触摸事件
  if (mobileAdapter.isEnabled()) {
    setupMobileControls()
  }
  
  // 根据初始模式设置
  // 如果初始模式是内部模式，则切换到内部模式
  if (props.viewMode === 'internal') {
    switchToInternalMode(false) // false 表示不重新适配相机
  }
  
  // 设置当前楼层
  setFloor(props.currentFloor)
  
  // 初始化调试GUI（如果启用）
  if (config.debug?.showGUI) {
    debugGUI = new DebugGUI(
      scene3D.scene,
      scene3D.camera,
      scene3D.renderer,
      controlsManager,
      collisionSystem,
      pathNavigator
    )
  }

  // 初始化性能监控（如果启用，在控制台输出帧率等性能数据，用于测试文档采集）
  if (config.performanceMonitor?.enabled) {
    performanceMonitor = new PerformanceMonitor()
  }

  // 开始渲染循环
  animate()
})

// 设置点击移动
function setupClickToMove() {
  scene3D.renderer.domElement.addEventListener('click', onSceneClick)
  scene3D.renderer.domElement.addEventListener('mousemove', onMouseMove)
  scene3D.renderer.domElement.addEventListener('mouseleave', onMouseLeave)
  scene3D.renderer.domElement.addEventListener('contextmenu', onRightClick) // 右键停止移动
  scene3D.renderer.domElement.addEventListener('pointerdown', onPointerDown)
  scene3D.renderer.domElement.addEventListener('pointermove', onPointerMove)
  scene3D.renderer.domElement.addEventListener('pointerup', onPointerUp)
  // 添加键盘事件（ESC键停止移动）
  window.addEventListener('keydown', onKeyDown)
}

// 鼠标移动事件
function onMouseMove(event) {
  // 只在内部模式下显示tooltip
  if (controlsManager.getCurrentMode() !== 'internal') {
    showMoveTooltip.value = false
    showExhibitTooltip.value = false
    return
  }
  
  if (!scene3D?.renderer?.domElement) return
  
  const rect = scene3D.renderer.domElement.getBoundingClientRect()
  
  // 检查鼠标是否在场景内
  const mouseX = event.clientX - rect.left
  const mouseY = event.clientY - rect.top
  
  if (mouseX < 0 || mouseX > rect.width || mouseY < 0 || mouseY > rect.height) {
    showMoveTooltip.value = false
    showExhibitTooltip.value = false
    return
  }
  
  // 检查是否悬停在展品上
  if (interactionSystem) {
    const hoveredExhibit = interactionSystem.getHoveredExhibit()
    if (hoveredExhibit) {
      // 显示展品 tooltip
      exhibitTooltipPosition.value = {
        x: event.clientX + 10,
        y: event.clientY - 30
      }
      exhibitTooltipText.value = hoveredExhibit.name || hoveredExhibit.id
      showExhibitTooltip.value = true
      showMoveTooltip.value = false
      return
    }
  }
  
  // 如果没有悬停在展品上，显示移动 tooltip
  showExhibitTooltip.value = false
  tooltipPosition.value = {
    x: event.clientX - rect.left + 10,
    y: event.clientY - rect.top - 30
  }
  
  // 更新tooltip文本
  if (isMoving) {
    tooltipText.value = '移动中... (右键或ESC停止)'
  } else {
    tooltipText.value = '点击移动'
  }
  
  showMoveTooltip.value = true
}

// 鼠标离开场景时隐藏tooltip
function onMouseLeave() {
  showMoveTooltip.value = false
  showExhibitTooltip.value = false
}

// 右键点击停止移动
function onRightClick(event) {
  if (controlsManager.getCurrentMode() !== 'internal') return
  
  event.preventDefault()
  
  if (isMoving) {
    stopMovement()
    tooltipText.value = '移动已停止'
    setTimeout(() => {
      tooltipText.value = '点击移动'
    }, 1000)
  }
}

// 键盘事件（ESC键停止移动）
function onKeyDown(event) {
  if (controlsManager.getCurrentMode() !== 'internal') return
  
  if (event.key === 'Escape' && isMoving) {
    stopMovement()
    tooltipText.value = '移动已停止'
    setTimeout(() => {
      tooltipText.value = '点击移动'
    }, 1000)
  }
}

// 停止移动
function stopMovement() {
  if (moveTween) {
    moveTween.stop()
    moveTween = null
  }
  isMoving = false
}

function onSceneClick(event) {
  // 只在内部模式下启用点击移动
  if (controlsManager.getCurrentMode() !== 'internal') return
  if (suppressNextClick) {
    suppressNextClick = false
    return
  }
  
  // 如果正在移动，再次点击可以停止移动
  if (isMoving) {
    stopMovement()
    tooltipText.value = '移动已停止'
    setTimeout(() => {
      tooltipText.value = '点击移动'
    }, 1000)
    return
  }
  
  // 先检查是否点击了展品（立即检查，不延迟）
  if (interactionSystem) {
    const hoveredExhibit = interactionSystem.getHoveredExhibit()
    if (hoveredExhibit) {
      // 如果悬停在展品上，不执行移动（展品点击由 InteractionSystem 处理）
      return
    }
  }
  
  // 延迟执行，让 InteractionSystem 先处理点击事件
  setTimeout(() => {
    // 如果 InteractionSystem 已经处理了点击（如展品点击），则不执行移动
    if (interactionSystem && interactionSystem.wasLastClickHandled()) {
      return
    }
    const rect = scene3D.renderer.domElement.getBoundingClientRect()
    // 复用模块级 Vector2，避免每次点击 new
    const mouseX = ((event.clientX - rect.left) / rect.width) * 2 - 1
    const mouseY = -((event.clientY - rect.top) / rect.height) * 2 + 1
    
    // 复用缓存的 Raycaster 和 Plane
    _clickRaycaster.setFromCamera({ x: mouseX, y: mouseY }, scene3D.camera)
    
    const floorInfo = getFloorByLevel(props.currentFloor)
    const groundY = floorInfo ? floorInfo.height : 0
    
    // 更新平面的常数（-groundY），无需重新 new
    _clickGroundPlane.constant = -groundY
    
    const result = _clickRaycaster.ray.intersectPlane(_clickGroundPlane, _clickIntersectPoint)
    
    if (result) {
      // 计算从当前位置到目标点的距离
      const currentPos3D = new THREE.Vector3(currentPosition[0], groundY, currentPosition[2])
      const targetDistance = _clickIntersectPoint.distanceTo(currentPos3D)
      
      // 如果距离超过步长，限制到步长距离
      if (targetDistance > config.maxStepDistance) {
        const direction = new THREE.Vector3()
          .subVectors(_clickIntersectPoint, currentPos3D)
          .normalize()
        _clickIntersectPoint.copy(currentPos3D).add(direction.multiplyScalar(config.maxStepDistance))
      }
      
      tooltipText.value = '正在移动...'
      moveTo(_clickIntersectPoint)
    }
  }, 100) // 延迟100ms，让 InteractionSystem 先处理
}

// 拖拽调整内部参观方向
function onPointerDown(event) {
  if (controlsManager.getCurrentMode() !== 'internal') return
  isDraggingView = true
  dragStart = { x: event.clientX, y: event.clientY }
  lastDragPos = { x: event.clientX, y: event.clientY }
  dragDistance = 0
  // 通知交互系统开始拖拽
  if (interactionSystem) {
    interactionSystem.setDragging(true, 0)
  }
}

function onPointerMove(event) {
  if (!isDraggingView || controlsManager.getCurrentMode() !== 'internal') return
  
  const deltaX = event.clientX - lastDragPos.x
  const deltaY = event.clientY - lastDragPos.y
  
  dragDistance += Math.abs(deltaX) + Math.abs(deltaY)
  lastDragPos = { x: event.clientX, y: event.clientY }
  if (dragDistance > 0) {
    userViewRotated = true
  }
  
  // 通知交互系统拖拽距离
  if (interactionSystem) {
    interactionSystem.setDragging(true, dragDistance)
  }
  
  const sensitivity = 0.005
  _pointerEuler.setFromQuaternion(scene3D.camera.quaternion, 'YXZ')
  _pointerEuler.y -= deltaX * sensitivity
  _pointerEuler.x -= deltaY * sensitivity
  
  const maxPitch = Math.PI / 2 - 0.01
  const minPitch = -Math.PI / 2 + 0.01
  _pointerEuler.x = Math.max(minPitch, Math.min(maxPitch, _pointerEuler.x))
  
  scene3D.camera.quaternion.setFromEuler(_pointerEuler)
}

function onPointerUp() {
  if (!isDraggingView) return
  isDraggingView = false
  // 通知交互系统拖拽结束
  if (interactionSystem) {
    interactionSystem.setDragging(false, 0)
  }
  if (dragDistance > 5) {
    suppressNextClick = true
    // 如果拖拽了，延迟重置标志，避免影响展品点击
    setTimeout(() => {
      suppressNextClick = false
    }, 50)
  }
  dragDistance = 0 // 重置拖拽距离
}

/**
 * 沿有序路点序列驱动相机运动（基于链式 Tween）。
 *
 * - 每段路点间的持续时间由距离/速度决定，最短 opts.minDuration ms。
 * - 若设置 opts.lookAtFixed，相机在每段中朝向该固定点；
 *   否则朝前看（并与 opts.modelCenter 混合）。
 * - 若设置 opts.maxRange 且相机超出模型范围，立即停止并拉回中心。
 * - 注意：本函数不修改 isMoving，调用方负责在 onFinish 中管理状态。
 *
 * @param {THREE.Vector3[]} positions        路点序列（含最终目标）
 * @param {{ modelCenter?: THREE.Vector3,
 *           maxRange?: number,
 *           lookAtFixed?: THREE.Vector3,
 *           minDuration?: number }} opts
 * @param {Function} onFinish                所有路点完成后的回调
 */
function _runPath(positions, opts, onFinish) {
  if (!positions || positions.length === 0) {
    onFinish?.()
    return
  }

  const {
    modelCenter  = null,
    maxRange     = Infinity,
    lookAtFixed  = null,
    minDuration  = 150
  } = opts

  if (modelCenter) {
    _rpModelCenterPt.set(modelCenter.x, 0, modelCenter.z)
  }

  let idx = 0

  function goNext() {
    if (idx >= positions.length) {
      onFinish?.()
      return
    }

    const target = positions[idx++]
    const startState = { x: currentPosition[0], y: currentPosition[1], z: currentPosition[2] }
    const endState   = { x: target.x,           y: target.y,           z: target.z           }

    const segDX  = endState.x - startState.x
    const segDZ  = endState.z - startState.z
    const segLen = Math.sqrt(segDX * segDX + segDZ * segDZ)
    const invLen = segLen > 0 ? 1 / segLen : 0
    const dirX   = segDX * invLen
    const dirZ   = segDZ * invLen
    const segDuration = Math.max(minDuration, 1000 * segLen / config.movementSpeed)

    moveTween = new Tween(startState)
      .to(endState, segDuration)
      .onUpdate(() => {
        scene3D.camera.position.set(startState.x, startState.y, startState.z)
        currentPosition = [startState.x, startState.y, startState.z]

        if (!userViewRotated) {
          if (lookAtFixed) {
            scene3D.camera.lookAt(lookAtFixed.x, startState.y, lookAtFixed.z)
          } else if (modelCenter) {
            _rpLookAheadPt.set(
              startState.x + dirX * 3,
              startState.y,
              startState.z + dirZ * 3
            )
            _rpModelCenterPt.y = startState.y
            _rpBlendedLookAt.lerpVectors(_rpLookAheadPt, _rpModelCenterPt, 0.5)
            scene3D.camera.lookAt(_rpBlendedLookAt)
          } else {
            _rpLookAheadPt.set(
              startState.x + dirX * 5,
              startState.y,
              startState.z + dirZ * 5
            )
            scene3D.camera.lookAt(_rpLookAheadPt)
          }
        }

        // 模型边界检查（平方距离，避免 sqrt）
        if (modelCenter && maxRange !== Infinity) {
          const bdx = startState.x - modelCenter.x
          const bdz = startState.z - modelCenter.z
          if (bdx * bdx + bdz * bdz > maxRange * maxRange) {
            moveTween.stop()
            moveTween = null
            _rpSafePosVec.set(modelCenter.x, startState.y, modelCenter.z)
            scene3D.camera.position.copy(_rpSafePosVec)
            currentPosition = [_rpSafePosVec.x, _rpSafePosVec.y, _rpSafePosVec.z]
            // 越界时不触发 onFinish，由 stopMovement 兜底
          }
        }
      })
      .onComplete(() => {
        scene3D.camera.position.set(endState.x, endState.y, endState.z)
        currentPosition = [endState.x, endState.y, endState.z]
        goNext()
      })
      .start()
  }

  goNext()
}

// 移动到目标位置
function moveTo(target) {
  if (isMoving) return

  const floorInfo  = getFloorByLevel(props.currentFloor)
  const floorHeight = floorInfo ? floorInfo.height : 0
  const cameraY    = floorHeight + config.cameraHeight

  target.y = cameraY

  const animModelCenter = scene3D.modelCenter
  const animModelSize   = scene3D.modelSize
  const animMaxRange    = (animModelCenter && animModelSize)
    ? Math.max(animModelSize.x, animModelSize.y, animModelSize.z) * 1.5
    : Infinity

  // ── 路线导航模式 ─────────────────────────────────────────
  // 条件：clickFollow 已启用 且 当前楼层已配置路点（≥ 2 个）
  // 行为：每次点击仅移动一个节点（按点击方向选最对齐的相邻路点），
  //       不做碰撞检测 / 步长截断 / 模型范围校验（路点已预置在合法位置）
  if (pathNavigator?.clickFollow &&
      pathNavigator.getWaypoints(props.currentFloor).length >= 2) {
    _mtCurrentPos3D.set(currentPosition[0], cameraY, currentPosition[2])
    const nextWp = pathNavigator.findNextWaypoint(_mtCurrentPos3D, target, props.currentFloor)
    if (!nextWp) return

    if (moveTween) moveTween.stop()
    isMoving = true
    _runPath(
      [nextWp],
      { modelCenter: animModelCenter, maxRange: animMaxRange },
      () => {
        isMoving = false
        if (!userViewRotated && animModelCenter) {
          scene3D.camera.lookAt(animModelCenter.x, currentPosition[1], animModelCenter.z)
        }
        tooltipText.value = '移动完成'
        setTimeout(() => { tooltipText.value = '点击移动' }, 1000)
      }
    )
    return
  }

  // ── 自由移动模式 ─────────────────────────────────────────
  // 条件：路线导航未启用 或 当前楼层无路点配置
  // 行为：直线到达，受碰撞检测 / 步长 / 模型范围约束
  const modelCenter   = scene3D.modelCenter
  const modelCenterVec = modelCenter
    ? _mtToCenter.set(modelCenter.x, cameraY, modelCenter.z)
    : null

  const safeTarget = collisionSystem.getSafeTargetPoint(
    [target.x, target.y, target.z],
    currentPosition,
    props.currentFloor,
    5,
    modelCenterVec
  )

  _mtCurrentPos3D.set(currentPosition[0], cameraY, currentPosition[2])
  _mtTargetPos3D.set(safeTarget[0], safeTarget[1], safeTarget[2])
  let actualDistance = _mtCurrentPos3D.distanceTo(_mtTargetPos3D)

  // 距离极小时，尝试向模型中心方向找一个备用目标
  if (actualDistance < 0.01) {
    if (modelCenter) {
      _mtDirection.set(
        modelCenter.x - currentPosition[0],
        0,
        modelCenter.z - currentPosition[2]
      )
      const toCenterLen = _mtDirection.length()
      if (toCenterLen > 0.1) {
        _mtDirection.normalize()
        _mtFallbackTarget.set(
          currentPosition[0] + _mtDirection.x * config.maxStepDistance,
          cameraY,
          currentPosition[2] + _mtDirection.z * config.maxStepDistance
        )
        const fallbackSafe = collisionSystem.getSafeTargetPoint(
          [_mtFallbackTarget.x, _mtFallbackTarget.y, _mtFallbackTarget.z],
          currentPosition,
          props.currentFloor,
          5,
          modelCenterVec
        )
        _mtTargetPos3D.set(fallbackSafe[0], fallbackSafe[1], fallbackSafe[2])
        const fallbackDist = _mtCurrentPos3D.distanceTo(_mtTargetPos3D)
        if (fallbackDist > 0.01) {
          safeTarget[0] = fallbackSafe[0]
          safeTarget[1] = fallbackSafe[1]
          safeTarget[2] = fallbackSafe[2]
          actualDistance = fallbackDist
        } else {
          return
        }
      } else {
        return
      }
    } else {
      return
    }
  }

  // 步长限制
  if (actualDistance > config.maxStepDistance) {
    _mtDirection.subVectors(_mtTargetPos3D, _mtCurrentPos3D).normalize()
    _mtTargetPos3D.copy(_mtCurrentPos3D).addScaledVector(_mtDirection, config.maxStepDistance)
    safeTarget[0] = _mtTargetPos3D.x
    safeTarget[1] = _mtTargetPos3D.y
    safeTarget[2] = _mtTargetPos3D.z
  }

  // 模型范围校验（用平方距离避免 sqrt）
  const modelSize = scene3D.modelSize
  if (modelCenter && modelSize) {
    const dx = safeTarget[0] - modelCenter.x
    const dz = safeTarget[2] - modelCenter.z
    const maxModelDim = Math.max(modelSize.x, modelSize.y, modelSize.z)
    const maxRange = maxModelDim * 1.5
    if (dx * dx + dz * dz > maxRange * maxRange) return
  }

  if (moveTween) moveTween.stop()

  isMoving = true
  _runPath(
    [_mtTargetPos3D.clone()],
    { modelCenter: animModelCenter, maxRange: animMaxRange },
    () => {
      isMoving = false
      if (!userViewRotated && animModelCenter) {
        scene3D.camera.lookAt(animModelCenter.x, currentPosition[1], animModelCenter.z)
      }
      tooltipText.value = '移动完成'
      setTimeout(() => { tooltipText.value = '点击移动' }, 1000)
    }
  )
}

// 设置移动端控制
function setupMobileControls() {
  // 移动端触摸事件已在InteractionSystem中处理
}

// 切换到外部模式
// shouldFit: 是否设置默认视角（默认 true，初始加载时为 false）
function switchToExternalMode(shouldFit = true) {
  // 切换到外部模式
  const setDefaultView = shouldFit
  controlsManager.switchToExternal(setDefaultView)
  
  // 如果模型已加载，确保 OrbitControls 的目标是模型中心
  if (scene3D.model && scene3D.modelCenter) {
    controlsManager.orbitControls.target.copy(scene3D.modelCenter)
    // 确保目标点的Y坐标在合理范围内
    const targetY = scene3D.modelCenter.y
    controlsManager.orbitControls.target.y = targetY
    controlsManager.orbitControls.update()
  }
  
  // 如果设置了默认视角，确保相机位置正确
  if (setDefaultView) {
    // 确保相机位置正确（恢复到外部观察视角）
    scene3D.setExternalView()
  }
  
  currentPosition = [
    scene3D.camera.position.x,
    scene3D.camera.position.y,
    scene3D.camera.position.z
  ]
  isDraggingView = false
  suppressNextClick = false
  userViewRotated = false
}

// 切换到内部模式
// shouldFit: 保留参数以保持一致性（内部模式不需要）
function switchToInternalMode(shouldFit = true) {
  // 停止当前的移动动画
  if (moveTween) {
    moveTween.stop()
    isMoving = false
  }
  
  controlsManager.switchToInternal()
  
  // 设置初始位置（确保在模型内部）
  const floorInfo = getFloorByLevel(props.currentFloor)
  const floorHeight = floorInfo ? floorInfo.height : 0
  const modelCenter = scene3D.modelCenter
  
  // 计算初始位置（在模型内部）
  let initialPos
  let lookAtTarget
  
  // 优先使用楼层特定的配置
  const floorCameraConfig = floorInfo?.internalCamera
  
  if (floorCameraConfig?.position && floorCameraConfig?.lookAt) {
    // 如果楼层配置了直接的世界坐标，直接使用
    initialPos = floorCameraConfig.position
    lookAtTarget = floorCameraConfig.lookAt
  } else if (modelCenter) {
    // 如果没有楼层配置，使用全局配置或默认值
    const globalConfig = config.internalMode
    
    // 获取位置偏移量（兼容旧配置）
    const positionOffset = globalConfig?.initialPositionOffset || [0, 0, 0]
    initialPos = [
      modelCenter.x + positionOffset[0],
      floorHeight + config.cameraHeight + positionOffset[1],
      modelCenter.z + positionOffset[2]
    ]
    
    // 获取朝向偏移量（兼容旧配置）
    const lookAtOffset = globalConfig?.initialLookAtOffset || [0, 0, -5]
    lookAtTarget = [
      modelCenter.x + lookAtOffset[0],
      floorHeight + config.cameraHeight + lookAtOffset[1],
      modelCenter.z + lookAtOffset[2]
    ]
  } else {
    // 如果没有模型中心，使用默认值
    initialPos = [0, floorHeight + config.cameraHeight, 0]
    lookAtTarget = [0, floorHeight + config.cameraHeight, -5]
  }
  
  scene3D.camera.position.set(...initialPos)
  // 让相机朝向展馆内部
  scene3D.camera.lookAt(...lookAtTarget)
  currentPosition = initialPos
  suppressNextClick = false
  userViewRotated = false
}

// 设置楼层
function setFloor(floor) {
  const floorInfo = getFloorByLevel(floor)
  if (floorInfo) {
    const currentMode = controlsManager.getCurrentMode()
    
    // 只在内部模式下调整相机
    if (currentMode === 'internal') {
      // 停止当前的移动动画
      if (moveTween) {
        moveTween.stop()
        isMoving = false
      }
      
      // 切换楼层时重置视角到初始位置
      switchToInternalMode()
    }
    // 外部模式下，楼层切换不应该改变相机位置
    // 保持当前的外部观察视角
  }
}

// 渲染循环
function animate() {
  const now = performance.now()
  animationId = requestAnimationFrame(animate)

  // 性能监控（每帧统计，按间隔输出到控制台）
  if (performanceMonitor) {
    performanceMonitor.tick(now)
  }

  // 更新控制器
  controlsManager.update()

  // 更新Tween动画
  if (moveTween) {
    moveTween.update()
  }

  // 渲染场景
  scene3D.render()
}

// 监听viewMode变化
watch(() => props.viewMode, (newMode) => {
  if (newMode === 'internal') {
    switchToInternalMode()
  } else {
    switchToExternalMode()
  }
})

// 监听currentFloor变化
watch(() => props.currentFloor, (newFloor) => {
  setFloor(newFloor)
  // 更新交互系统的当前楼层
  if (interactionSystem) {
    interactionSystem.setCurrentFloor(newFloor)
  }
})

onBeforeUnmount(() => {
  if (animationId) {
    cancelAnimationFrame(animationId)
  }
  
  if (moveTween) {
    moveTween.stop()
  }
  
  if (debugGUI) {
    debugGUI.dispose()
  }

  if (pathNavigator) {
    pathNavigator.dispose()
  }

  if (performanceMonitor) {
    performanceMonitor.dispose()
    performanceMonitor = null
  }
  
  if (interactionSystem) {
    interactionSystem.dispose()
  }
  
  if (scene3D) {
    scene3D.dispose()
  }
  
  if (scene3D?.renderer?.domElement) {
    const el = scene3D.renderer.domElement
    el.removeEventListener('click', onSceneClick)
    el.removeEventListener('mousemove', onMouseMove)
    el.removeEventListener('mouseleave', onMouseLeave)
    el.removeEventListener('contextmenu', onRightClick)
    el.removeEventListener('pointerdown', onPointerDown)
    el.removeEventListener('pointermove', onPointerMove)
    el.removeEventListener('pointerup', onPointerUp)
  }
  
  // 移除键盘事件监听
  window.removeEventListener('keydown', onKeyDown)
})

// 移动到展品正前方
function moveToExhibitFront(exhibit) {
  // 确保在内部模式
  if (controlsManager.getCurrentMode() !== 'internal') {
    switchToInternalMode()
  }
  
  // 停止当前的移动动画
  if (moveTween) {
    moveTween.stop()
    isMoving = false
  }
  
  // 检查展品是否配置了相机位置
  if (!exhibit.cameraPosition || !Array.isArray(exhibit.cameraPosition) || exhibit.cameraPosition.length !== 3) {
    console.warn('展品未配置 cameraPosition，无法导航', exhibit)
    return
  }
  
  // 使用配置的相机位置
  const targetPosition = new THREE.Vector3(...exhibit.cameraPosition)
  
  // 获取相机朝向目标点（用于碰撞检测的固定参考点）
  const cameraRotation = exhibit.cameraRotation && Array.isArray(exhibit.cameraRotation) && exhibit.cameraRotation.length === 3
    ? exhibit.cameraRotation
    : null
  const lookAtTarget = !cameraRotation && exhibit.cameraLookAt && Array.isArray(exhibit.cameraLookAt) && exhibit.cameraLookAt.length === 3
    ? new THREE.Vector3(...exhibit.cameraLookAt)
    : null
  
  // 使用展品的 cameraLookAt 作为碰撞检测的参考点，确保无论从哪过来都能得到一致的相机位置
  // （getSafeTargetPoint 会根据 current 计算方向，用固定参考点可避免“刚进一层”与“切换展品后”视角不一致）
  const collisionRef = lookAtTarget ? [lookAtTarget.x, lookAtTarget.y, lookAtTarget.z] : currentPosition
  
  // 检查碰撞，获取安全位置
  const safeTarget = collisionSystem.getSafeTargetPoint(
    [targetPosition.x, targetPosition.y, targetPosition.z],
    collisionRef,
    props.currentFloor,
    10, // maxDistance
    null
  )
  
  const safeTargetVec = new THREE.Vector3(safeTarget[0], safeTarget[1], safeTarget[2])

  // 构建路径：启用路线导航 且 当前楼层有路点配置 → 沿路线行进；否则直线到达
  const currentCamVec = new THREE.Vector3(
    scene3D.camera.position.x,
    scene3D.camera.position.y,
    scene3D.camera.position.z
  )
  const usePathNavExhibit = !!(pathNavigator?.enabled &&
    pathNavigator.getWaypoints(props.currentFloor).length >= 2)
  const positions = usePathNavExhibit
    ? pathNavigator.findPath(currentCamVec, safeTargetVec, props.currentFloor)
    : [safeTargetVec]

  // 行进中朝向目标点（或有旋转配置时自由朝前看）
  const pathLookAt = lookAtTarget ?? (cameraRotation ? null : safeTargetVec)

  isMoving = true

  _runPath(
    positions,
    { lookAtFixed: pathLookAt, minDuration: 500 },
    () => {
      // 到达最终路点后，确保位置精确
      scene3D.camera.position.set(safeTargetVec.x, safeTargetVec.y, safeTargetVec.z)
      currentPosition = [safeTargetVec.x, safeTargetVec.y, safeTargetVec.z]

      if (cameraRotation) {
        // 平滑旋转到展品配置的视角
        const startRot = {
          x: scene3D.camera.rotation.x,
          y: scene3D.camera.rotation.y,
          z: scene3D.camera.rotation.z
        }
        const endRot = {
          x: cameraRotation[0],
          y: cameraRotation[1],
          z: cameraRotation[2]
        }
        moveTween = new Tween(startRot)
          .to(endRot, 600)
          .onUpdate(() => {
            scene3D.camera.rotation.set(startRot.x, startRot.y, startRot.z)
          })
          .onComplete(() => {
            scene3D.camera.rotation.set(endRot.x, endRot.y, endRot.z)
            isMoving = false
            userViewRotated = false
          })
          .start()
      } else {
        if (lookAtTarget) {
          scene3D.camera.lookAt(lookAtTarget.x, lookAtTarget.y, lookAtTarget.z)
        }
        isMoving = false
        userViewRotated = false
      }
    }
  )
}

// 暴露方法供父组件调用
defineExpose({
  switchToExternal: switchToExternalMode,
  switchToInternal: switchToInternalMode,
  switchToFixedView: (index) => controlsManager?.switchToFixedView(index),
  switchToOrbitMode: () => controlsManager?.switchToOrbitMode(),
  moveToExhibit: moveToExhibitFront,
  getPathNavigator: () => pathNavigator
})
</script>

<style scoped>
.scene-container {
  width: 100%;
  height: 100%;
  position: relative;
}

.loading-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.loading-content {
  text-align: center;
  color: white;
}

.loading-spinner {
  width: 50px;
  height: 50px;
  border: 4px solid rgba(255, 255, 255, 0.3);
  border-top-color: white;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 20px;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.loading-content p {
  margin-top: 10px;
  font-size: 16px;
}

/* 移动提示 Tooltip */
.move-tooltip {
  position: absolute;
  z-index: 1000;
  pointer-events: none;
  user-select: none;
}

.tooltip-content {
  background: rgba(0, 0, 0, 0.75);
  color: white;
  padding: 8px 12px;
  border-radius: 4px;
  font-size: 14px;
  white-space: nowrap;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
  backdrop-filter: blur(4px);
}

.tooltip-text {
  margin: 0;
  font-size: 14px;
  line-height: 1.4;
}

/* 展品提示 Tooltip */
.exhibit-tooltip {
  position: fixed;
  z-index: 1001;
  pointer-events: none;
  user-select: none;
}

.exhibit-tooltip .tooltip-content {
  background: rgba(0, 0, 0, 0.75);
  color: white;
  padding: 8px 12px;
  border-radius: 4px;
  font-size: 14px;
  white-space: nowrap;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
  backdrop-filter: blur(4px);
  font-weight: 500;
}
</style>

