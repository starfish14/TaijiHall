/**
 * 碰撞检测系统
 *
 * 碰撞体配置支持两种格式（与 exhibits.js 的 bounds 一致）：
 * 1. position + size: position: [x,y,z], size: [w,h,d]
 * 2. bounds: { center: [x,y,z], size: [w,h,d] } 或 { min: [x,y,z], max: [x,y,z] }
 */
import * as THREE from 'three'
import { loadCollisions } from '@/utils/configLoader.js'
import config from '@/config/config.js'

/**
 * 从碰撞体配置解析出中心点和尺寸（支持 position+size 或 bounds 格式）
 * 优先级：position+size > bounds（便于调试面板编辑后生效）
 */
function parseBoxConfig(collision) {
  let center, size
  if (collision.position && collision.size) {
    center = new THREE.Vector3(...collision.position)
    size = new THREE.Vector3(...collision.size)
  } else if (collision.bounds) {
    const b = collision.bounds
    if (b.center && b.size) {
      center = new THREE.Vector3(...b.center)
      size = new THREE.Vector3(...b.size)
    } else if (b.min && b.max) {
      center = new THREE.Vector3(
        (b.min[0] + b.max[0]) / 2,
        (b.min[1] + b.max[1]) / 2,
        (b.min[2] + b.max[2]) / 2
      )
      size = new THREE.Vector3(
        b.max[0] - b.min[0],
        b.max[1] - b.min[1],
        b.max[2] - b.min[2]
      )
    } else {
      throw new Error(`无效的 bounds 配置: ${JSON.stringify(b)}`)
    }
  } else {
    throw new Error(`碰撞体缺少 position+size 或 bounds 配置`)
  }
  return { center, size }
}

/** 获取用于编辑的 position 和 size（兼容 bounds 格式） */
export function getCollisionEditParams(cfg) {
  if (cfg.position && cfg.size) {
    return { position: [...cfg.position], size: cfg.type === 'sphere' ? cfg.size : [...cfg.size] }
  }
  if (cfg.type === 'box' && cfg.bounds) {
    const { center, size } = parseBoxConfig(cfg)
    return {
      position: [center.x, center.y, center.z],
      size: [size.x, size.y, size.z]
    }
  }
  return { position: [0, 0, 0], size: cfg.type === 'sphere' ? 1 : [1, 1, 1] }
}

export class CollisionSystem {
  constructor() {
    this.collisionBoxes = []
    this.collisionSpheres = []
    this.collisionConfigs = []

    // 按楼层分组的索引，避免每次碰撞检测都全量 filter
    // Map<floor, { all: [], normal: [], byRole: Map<role, []> }>
    this._boxIndex = new Map()
    this._sphereIndex = new Map()

    // 预解析的边界类型（config 不变，只需解析一次）
    this._boundaryTypesCache = null

    // getModelCenter 结果缓存（碰撞配置不变时无需重算）
    this._modelCenterCache = null

    // ---- 复用的临时 Vector3，减少热路径上的 GC 压力 ----
    this._stepTestPoint  = new THREE.Vector3()
    this._toCenterVec    = new THREE.Vector3()
    // 供 _checkPointCollisionVec 内部循环使用，与外部的 _stepTestPoint 相同对象；
    // 在同一调用栈中不会并发，因此可以安全共享。
    this._ptVec = new THREE.Vector3()

    this.init()
  }

  init() {
    const collisions = loadCollisions()
    collisions.forEach((collision, index) => {
      this.collisionConfigs.push(collision)

      if (collision.type === 'box') {
        const box = new THREE.Box3()
        const { center, size } = parseBoxConfig(collision)
        box.setFromCenterAndSize(center, size)
        const entry = {
          box,
          floor: collision.floor,
          rotation: collision.rotation || [0, 0, 0],
          configIndex: index,
          collisionType: collision.collisionType || 'normal',
          boundaryRole: collision.boundaryRole || null
        }
        this.collisionBoxes.push(entry)
      } else if (collision.type === 'sphere') {
        const sphere = new THREE.Sphere(
          new THREE.Vector3(...collision.position),
          collision.size
        )
        const entry = {
          sphere,
          floor: collision.floor,
          configIndex: index,
          boundaryRole: collision.boundaryRole || null
        }
        this.collisionSpheres.push(entry)
      }
    })

    this._buildIndex()
  }

  // 构建楼层索引
  _buildIndex() {
    this._boxIndex.clear()
    this._sphereIndex.clear()
    this._modelCenterCache = null

    const ignoreTypes = config.collision?.ignoreTypesForPointCollision || []

    for (const entry of this.collisionBoxes) {
      if (!this._boxIndex.has(entry.floor)) {
        this._boxIndex.set(entry.floor, { all: [], normal: [], byRole: new Map() })
      }
      const idx = this._boxIndex.get(entry.floor)
      idx.all.push(entry)
      if (!ignoreTypes.includes(entry.collisionType)) {
        idx.normal.push(entry)
      }
      const role = entry.boundaryRole
      if (role) {
        if (!idx.byRole.has(role)) idx.byRole.set(role, [])
        idx.byRole.get(role).push(entry)
      }
    }

    for (const entry of this.collisionSpheres) {
      if (!this._sphereIndex.has(entry.floor)) {
        this._sphereIndex.set(entry.floor, [])
      }
      this._sphereIndex.get(entry.floor).push(entry)
    }
  }

  // 从配置重新构建碰撞体（调试面板编辑后刷新）
  refreshFromConfigs() {
    this.collisionBoxes = []
    this.collisionSpheres = []

    this.collisionConfigs.forEach((collision, idx) => {
      if (collision.type === 'box') {
        const box = new THREE.Box3()
        const { center, size } = parseBoxConfig(collision)
        box.setFromCenterAndSize(center, size)
        this.collisionBoxes.push({
          box,
          floor: collision.floor,
          rotation: collision.rotation || [0, 0, 0],
          configIndex: idx,
          collisionType: collision.collisionType || 'normal',
          boundaryRole: collision.boundaryRole || null
        })
      } else if (collision.type === 'sphere') {
        const sphere = new THREE.Sphere(
          new THREE.Vector3(...collision.position),
          collision.size
        )
        this.collisionSpheres.push({
          sphere,
          floor: collision.floor,
          configIndex: idx,
          boundaryRole: collision.boundaryRole || null
        })
      }
    })

    this._buildIndex()
    this._boundaryTypesCache = null
  }

  // 更新碰撞体位置和尺寸（兼容旧接口）
  updateCollision(index, position, size) {
    const cfg = this.collisionConfigs[index]
    if (!cfg) return
    cfg.position = [...position]
    if (cfg.type === 'box') {
      cfg.size = [...size]
    } else if (cfg.type === 'sphere') {
      cfg.size = size
    }
    this.refreshFromConfigs()
  }

  getAllCollisionConfigs() { return this.collisionConfigs }
  getCollisionConfig(index) { return this.collisionConfigs[index] }

  // ─────────────────────────────────────────────────────────────────────────
  // 内部：直接接受 THREE.Vector3，避免热路径上的 Array ↔ Vector3 转换开销
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * 直接用 Vector3 检测点碰撞（内部调用，避免热路径上创建临时数组）
   */
  _checkPointCollisionVec(vec, floor) {
    const floorIdx = this._boxIndex.get(floor)
    if (floorIdx) {
      for (const c of floorIdx.normal) {
        if (c.box.containsPoint(vec)) return true
      }
    }
    const spheres = this._sphereIndex.get(floor)
    if (spheres) {
      for (const c of spheres) {
        if (c.sphere.containsPoint(vec)) return true
      }
    }
    return false
  }

  /**
   * 将 Vector3 原地 clamp 到指定楼层边界（内部调用，无数组创建，无函数调用开销）
   * wallBounds: { minX, maxX, minY, maxY, minZ, maxZ } - 由 _getWallBoundsForFloor 预计算
   */
  _clampVecInPlace(vec, wallBounds) {
    if (!wallBounds) return
    const { minX, maxX, minY, maxY, minZ, maxZ } = wallBounds
    if (minX !== Infinity)  vec.x = Math.max(minX, Math.min(maxX, vec.x))
    if (minZ !== Infinity)  vec.z = Math.max(minZ, Math.min(maxZ, vec.z))
    if (minY !== Infinity)  vec.y = Math.max(minY, Math.min(maxY, vec.y))
  }

  /**
   * 预计算指定楼层的墙体边界（供 getSafeTargetPoint 在循环外一次性调用）
   * 返回 { minX, maxX, minY, maxY, minZ, maxZ }，如无墙体则返回 null
   */
  _getWallBoundsForFloor(floor) {
    const { wallTypes } = this._parseBoundaryTypes()
    const floorWalls = this._getBoundaryBoxes(floor, 'wall', wallTypes)
    if (floorWalls.length === 0) return null

    // clampToBoundary 与 checkBoundary 的计算规则不同：
    // clamp 取"各墙交集"（取每面墙的 max(min) / min(max)）
    let minX = -Infinity, maxX = Infinity
    let minZ = -Infinity, maxZ = Infinity
    let wallMinY = Infinity, wallMaxY = -Infinity

    for (const wall of floorWalls) {
      const b = wall.box
      if (b.min.x > minX) minX = b.min.x
      if (b.max.x < maxX) maxX = b.max.x
      if (b.min.z > minZ) minZ = b.min.z
      if (b.max.z < maxZ) maxZ = b.max.z
      if (b.min.y < wallMinY) wallMinY = b.min.y
      if (b.max.y > wallMaxY) wallMaxY = b.max.y
    }

    return {
      minX,
      maxX,
      minY: wallMinY !== Infinity  ? wallMinY : -Infinity,
      maxY: wallMaxY !== -Infinity ? wallMaxY :  Infinity,
      minZ,
      maxZ
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 公开 API
  // ─────────────────────────────────────────────────────────────────────────

  // 检查点是否在碰撞体内（不包括外墙/天花板，它们用于边界检查）
  checkPointCollision(point, floor) {
    this._ptVec.set(point[0], point[1], point[2])
    return this._checkPointCollisionVec(this._ptVec, floor)
  }

  // 检查路径是否与碰撞体相交
  checkPathCollision(start, end, floor, stepSize = 0.1) {
    const startVec = new THREE.Vector3(...start)
    const endVec   = new THREE.Vector3(...end)
    const direction = new THREE.Vector3().subVectors(endVec, startVec)
    const distance  = direction.length()
    direction.normalize()

    const steps = Math.ceil(distance / stepSize)
    const point = new THREE.Vector3()
    for (let i = 0; i <= steps; i++) {
      point.copy(startVec).addScaledVector(direction, i / steps * distance)
      // 直接传 Vector3，避免 [x,y,z] 临时数组
      if (this._checkPointCollisionVec(point, floor)) return true
    }
    return false
  }

  // 私有：解析 boundaryTypes 配置（带缓存，config 不变时只解析一次）
  _parseBoundaryTypes() {
    if (this._boundaryTypesCache) return this._boundaryTypesCache
    const boundaryTypes = config.collision?.boundaryTypes || []
    const getTypesByRole = (role) => boundaryTypes
      .filter((item) => item.role === role)
      .map((item) => item.type)
    this._boundaryTypesCache = {
      wallTypes:    getTypesByRole('wall'),
      ceilingTypes: getTypesByRole('ceiling'),
      floorTypes:   getTypesByRole('floor')
    }
    return this._boundaryTypesCache
  }

  // 私有：获取指定楼层和角色的边界碰撞体（先按 boundaryRole，回退按 collisionType）
  _getBoundaryBoxes(floor, role, types) {
    const floorIdx = this._boxIndex.get(floor)
    if (!floorIdx) return []
    const byRole = floorIdx.byRole.get(role)
    if (byRole && byRole.length > 0) return byRole
    return floorIdx.all.filter(c => types.includes(c.collisionType))
  }

  // 私有：从 floorWalls 一次性计算 XYZ 边界范围（checkBoundary 使用"并集"规则）
  _calcWallBounds(floorWalls) {
    let minX = Infinity,  maxX = -Infinity
    let minZ = Infinity,  maxZ = -Infinity
    let minY = Infinity,  maxY = -Infinity
    for (const wall of floorWalls) {
      const b = wall.box
      if (b.min.x < minX) minX = b.min.x
      if (b.max.x > maxX) maxX = b.max.x
      if (b.min.z < minZ) minZ = b.min.z
      if (b.max.z > maxZ) maxZ = b.max.z
      if (b.min.y < minY) minY = b.min.y
      if (b.max.y > maxY) maxY = b.max.y
    }
    return { minX, maxX, minY, maxY, minZ, maxZ }
  }

  // 检查点是否在外墙定义的边界内
  checkBoundary(point, floor) {
    const { wallTypes } = this._parseBoundaryTypes()
    const floorWalls = this._getBoundaryBoxes(floor, 'wall', wallTypes)
    if (floorWalls.length === 0) return true

    const { minX, maxX, minY, maxY, minZ, maxZ } = this._calcWallBounds(floorWalls)
    return (
      point[0] >= minX && point[0] <= maxX &&
      point[1] >= minY && point[1] <= maxY &&
      point[2] >= minZ && point[2] <= maxZ
    )
  }

  // 将点限制在边界内（返回 [x, y, z] 数组以保持向后兼容）
  clampToBoundary(point, floor) {
    const wallBounds = this._getWallBoundsForFloor(floor)
    if (!wallBounds) return [point[0], point[1], point[2]]

    const x = Math.max(wallBounds.minX, Math.min(wallBounds.maxX, point[0]))
    const z = Math.max(wallBounds.minZ, Math.min(wallBounds.maxZ, point[2]))
    const y = (wallBounds.minY !== -Infinity)
      ? Math.max(wallBounds.minY, Math.min(wallBounds.maxY, point[1]))
      : point[1]
    return [x, y, z]
  }

  // 检查点是否越界（与 clamp 后的距离超过阈值）
  isOnBoundary(point, floor, threshold = 0.1) {
    const clamped = this.clampToBoundary(point, floor)
    return (
      Math.abs(point[0] - clamped[0]) > threshold ||
      Math.abs(point[1] - clamped[1]) > threshold ||
      Math.abs(point[2] - clamped[2]) > threshold
    )
  }

  // 获取模型中心点（带缓存，配置不变时只计算一次）
  getModelCenter() {
    if (this._modelCenterCache) return this._modelCenterCache

    const allWalls = this.collisionBoxes.filter(c => c.boundaryRole === 'wall')
    const walls = allWalls.length > 0
      ? allWalls
      : this.collisionBoxes.filter(c => c.collisionType === 'wall')
    if (walls.length === 0) return null

    let minX = Infinity, maxX = -Infinity
    let minZ = Infinity, maxZ = -Infinity
    let avgY = 0
    const tmp = new THREE.Vector3()
    for (const wall of walls) {
      const b = wall.box
      if (b.min.x < minX) minX = b.min.x
      if (b.max.x > maxX) maxX = b.max.x
      if (b.min.z < minZ) minZ = b.min.z
      if (b.max.z > maxZ) maxZ = b.max.z
      b.getCenter(tmp)
      avgY += tmp.y
    }
    if (minX === Infinity || minZ === Infinity) return null

    avgY /= walls.length
    this._modelCenterCache = new THREE.Vector3((minX + maxX) / 2, avgY, (minZ + maxZ) / 2)
    return this._modelCenterCache
  }

  /**
   * 获取安全的移动目标点（目标在碰撞体内时返回最近安全点）
   *
   * 优化策略：
   * - 在循环外预计算一次 wallBounds，避免每步重复查 Map + 遍历 walls
   * - 循环内直接操作 Vector3（_stepTestPoint），不创建中间数组
   * - _checkPointCollisionVec 直接接受 Vector3，消除 [x,y,z] 临时数组分配
   */
  getSafeTargetPoint(target, current, floor, maxDistance = 5, modelCenter = null) {
    const targetVec  = new THREE.Vector3(...target)
    const currentVec = new THREE.Vector3(...current)

    // 预计算本次调用整个过程共用的墙体边界（循环外只算一次）
    const wallBounds = this._getWallBoundsForFloor(floor)

    // ── 内联 clamp 工具（接受/修改 Vector3，不分配任何对象）──
    const clampVec = (v) => {
      if (!wallBounds) return
      v.x = Math.max(wallBounds.minX, Math.min(wallBounds.maxX, v.x))
      v.z = Math.max(wallBounds.minZ, Math.min(wallBounds.maxZ, v.z))
      if (wallBounds.minY !== -Infinity) {
        v.y = Math.max(wallBounds.minY, Math.min(wallBounds.maxY, v.y))
      }
    }

    // ── 判断点是否越界（直接比较，无 clampToBoundary 函数调用开销）──
    const isOutside = (v) => {
      if (!wallBounds) return false
      const { minX, maxX, minY, maxY, minZ, maxZ } = wallBounds
      return v.x < minX || v.x > maxX || v.z < minZ || v.z > maxZ ||
        (minY !== -Infinity && (v.y < minY || v.y > maxY))
    }

    // 1. 先将目标点限制在边界内
    clampVec(targetVec)
    const isTargetOutside = isOutside(new THREE.Vector3(...target)) // 原始目标是否越界

    // 2. 若目标被边界截断（点击方向朝外墙），尝试向模型中心方向找可行点
    if (isTargetOutside) {
      const center = modelCenter || this.getModelCenter()
      if (center) {
        this._toCenterVec.subVectors(center, currentVec)
        this._toCenterVec.y = 0
        if (this._toCenterVec.length() > 0.1) {
          this._toCenterVec.normalize()
          const stepSize = 0.1
          const maxSteps = Math.floor(maxDistance / stepSize)

          for (let i = 1; i <= maxSteps; i++) {
            // 复用 _stepTestPoint，不 new
            this._stepTestPoint.copy(currentVec).addScaledVector(this._toCenterVec, i * stepSize)
            clampVec(this._stepTestPoint)
            if (!this._checkPointCollisionVec(this._stepTestPoint, floor)) {
              return [this._stepTestPoint.x, this._stepTestPoint.y, this._stepTestPoint.z]
            }
          }
        }
      }
    }

    // 3. 目标在边界内且不在普通碰撞体内，直接返回
    if (!this._checkPointCollisionVec(targetVec, floor)) {
      return [targetVec.x, targetVec.y, targetVec.z]
    }

    // 4. 目标在碰撞体内，沿当前→目标方向步进找最近安全点
    const direction = new THREE.Vector3().subVectors(targetVec, currentVec)
    const distanceToTarget = direction.length()

    if (distanceToTarget < 0.01) {
      // 目标与当前位置几乎重合，尝试朝模型中心走一步
      const center = modelCenter || this.getModelCenter()
      if (center) {
        this._toCenterVec.subVectors(center, currentVec)
        this._toCenterVec.y = 0
        if (this._toCenterVec.length() > 0.1) {
          this._toCenterVec.normalize()
          this._stepTestPoint.copy(currentVec).addScaledVector(
            this._toCenterVec, config.maxStepDistance || 0.7
          )
          clampVec(this._stepTestPoint)
          if (!this._checkPointCollisionVec(this._stepTestPoint, floor)) {
            return [this._stepTestPoint.x, this._stepTestPoint.y, this._stepTestPoint.z]
          }
        }
      }
    }

    direction.normalize()
    const stepSize = 0.1
    for (let dist = stepSize; dist <= maxDistance; dist += stepSize) {
      this._stepTestPoint.copy(currentVec).addScaledVector(direction, dist)
      clampVec(this._stepTestPoint)
      if (!this._checkPointCollisionVec(this._stepTestPoint, floor)) {
        return [this._stepTestPoint.x, this._stepTestPoint.y, this._stepTestPoint.z]
      }
    }

    // 5. 实在找不到安全点，回退到当前位置（限制在边界内）
    return this.clampToBoundary([currentVec.x, currentVec.y, currentVec.z], floor)
  }

  // 可视化碰撞体（调试用）
  getDebugMeshes() {
    const meshes = []

    for (const collision of this.collisionBoxes) {
      const size = new THREE.Vector3()
      collision.box.getSize(size)
      const geometry = new THREE.BoxGeometry(size.x, size.y, size.z)
      const material = new THREE.MeshBasicMaterial({
        color: 0xff0000, wireframe: true, transparent: true, opacity: 0.3
      })
      const mesh = new THREE.Mesh(geometry, material)
      const center = new THREE.Vector3()
      collision.box.getCenter(center)
      mesh.position.copy(center)
      mesh.userData.collisionIndex = collision.configIndex
      mesh.userData.collisionType = 'box'
      meshes.push(mesh)
    }

    for (const collision of this.collisionSpheres) {
      const geometry = new THREE.SphereGeometry(collision.sphere.radius, 16, 16)
      const material = new THREE.MeshBasicMaterial({
        color: 0x00ff00, wireframe: true, transparent: true, opacity: 0.3
      })
      const mesh = new THREE.Mesh(geometry, material)
      mesh.position.copy(collision.sphere.center)
      mesh.userData.collisionIndex = collision.configIndex
      mesh.userData.collisionType = 'sphere'
      meshes.push(mesh)
    }

    return meshes
  }
}
