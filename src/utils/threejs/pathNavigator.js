/**
 * PathNavigator —— 展馆导览路线管理器
 *
 * 职责：
 *   1. 存储并访问 paths.js 中定义的各楼层路线（有序路点集合）
 *   2. 根据当前位置与目标位置，沿路线计算最短折线路径
 *   3. 在三维场景中以黄色线段 + 方向箭头 + 球形标记可视化路线
 *   4. 提供 GUI 所需的路点增删改接口
 */
import * as THREE from 'three'
import pathsConfig from '@/config/paths.js'
import config from '@/config/config.js'
import { loadFloors } from '@/utils/configLoader.js'

export class PathNavigator {
  /**
   * @param {THREE.Scene} scene
   */
  constructor(scene) {
    this.scene = scene

    /** @type {Record<number, {line:THREE.Line|null, markers:THREE.Mesh[], arrows:THREE.ArrowHelper[]}>} */
    this._visObjects = {}
    /** @type {Record<number, boolean>} */
    this._visible = {}
    /** @type {Record<number, number>} 每层的相机 Y（floorHeight + cameraHeight） */
    this._cameraY = {}

    // 预计算各楼层相机 Y
    for (const floor of loadFloors()) {
      this._cameraY[floor.level] = floor.height + config.cameraHeight
      this._visible[floor.level] = false
    }

    // 内部复用的临时向量（仅用于 _nearestIdx XZ 距离比较，单线程安全）
    this._tmp = new THREE.Vector3()
  }

  // ─────────────────────────────────────────────
  //  配置访问器
  // ─────────────────────────────────────────────

  get enabled() { return pathsConfig.enabled }
  set enabled(v) { pathsConfig.enabled = v }

  /** 鼠标点击移动是否按路线节点方向移动（每次一个节点） */
  get clickFollow() { return pathsConfig.clickFollow }
  set clickFollow(v) { pathsConfig.clickFollow = v }

  /**
   * 返回指定楼层的原始路点数组（[x, z] 格式）
   * @param {number} floor
   * @returns {[number, number][]}
   */
  getWaypoints(floor) {
    return pathsConfig.floors?.[floor]?.waypoints ?? []
  }

  /**
   * 返回指定楼层路点的 Vector3 数组（Y 自动填充为相机高度）
   * @param {number} floor
   * @returns {THREE.Vector3[]}
   */
  getWaypointVectors(floor) {
    const y = this._cameraY[floor] ?? 0
    return this.getWaypoints(floor).map(([x, z]) => new THREE.Vector3(x, y, z))
  }

  // ─────────────────────────────────────────────
  //  路径查找（虚拟节点 Dijkstra 最优算法）
  // ─────────────────────────────────────────────

  /**
   * XZ 平面距离（忽略 Y 轴高度差）。
   * 用于虚拟边权重计算：同一楼层导航只需考虑水平位移。
   * @param {THREE.Vector3} a
   * @param {THREE.Vector3} b
   * @returns {number}
   */
  _xzDist(a, b) {
    const dx = a.x - b.x
    const dz = a.z - b.z
    return Math.sqrt(dx * dx + dz * dz)
  }

  /**
   * 找到 wps 数组中 XZ 距离最近的路点索引（O(n) 平方距离比较）。
   * 仍保留供内部其他逻辑调用。
   * @param {THREE.Vector3} pos
   * @param {THREE.Vector3[]} wps
   * @returns {number}
   */
  _nearestIdx(pos, wps) {
    let minD2 = Infinity
    let idx = 0
    for (let i = 0; i < wps.length; i++) {
      const dx = pos.x - wps[i].x
      const dz = pos.z - wps[i].z
      const d2 = dx * dx + dz * dz
      if (d2 < minD2) { minD2 = d2; idx = i }
    }
    return idx
  }

  /**
   * 根据楼层配置构建无向邻接表。
   *
   * 边生成优先级（三层互不重叠，后两层可叠加）：
   *
   *   1. parents 数组（推荐）→ 树状结构
   *      parents[i] = j 表示路点 i 与路点 j 之间有一条双向边。
   *      同一个父节点可被多个子节点引用，天然形成分叉路口。
   *      路点 i 的父为 null / 越界 → 该路点是根节点，不产生父子边。
   *
   *   2. connections 数组（可选，叠加）
   *      - 当 parents 存在时：connections 作为额外"捷径"叠加在树边之上
   *      - 当 parents 不存在时：connections 作为全部边（需列出所有想要的边）
   *
   *   3. 回退（parents 和 connections 均不存在）
   *      自动生成线性相邻边 W0-W1-W2-...
   *
   *   4. loop=true → 无论以上哪种模式，均额外连接首尾路点形成环
   *
   * @param {number} floor
   * @param {THREE.Vector3[]} wps  已转换好的路点 Vector3 数组
   * @returns {Array<Array<{to:number, d:number}>>}  adj[i] = [{to, d}, ...]
   */
  _buildAdjacency(floor, wps) {
    const n       = wps.length
    const floorCfg = pathsConfig.floors?.[floor]
    const adj     = Array.from({ length: n }, () => [])

    // 已添加的边用 Set 去重（无向图，key = "min_max"）
    const added = new Set()
    const addEdge = (a, b) => {
      if (a < 0 || b < 0 || a >= n || b >= n || a === b) return
      const key = a < b ? `${a}-${b}` : `${b}-${a}`
      if (added.has(key)) return
      added.add(key)
      const d = this._xzDist(wps[a], wps[b])
      adj[a].push({ to: b, d })
      adj[b].push({ to: a, d })
    }

    const parents     = floorCfg?.parents
    const connections = floorCfg?.connections
    const hasParents  = Array.isArray(parents) && parents.some(p => typeof p === 'number')

    if (hasParents) {
      // ── 模式 1：树状结构 ────────────────────────────────────
      for (let i = 0; i < parents.length && i < n; i++) {
        const p = parents[i]
        if (typeof p === 'number') addEdge(i, p)
      }
      // 可选：叠加捷径
      if (Array.isArray(connections)) {
        for (const conn of connections) {
          if (Array.isArray(conn)) addEdge(conn[0], conn[1])
        }
      }
    } else if (Array.isArray(connections) && connections.length > 0) {
      // ── 模式 2：纯自定义边（需列出所有边）───────────────────
      for (const conn of connections) {
        if (Array.isArray(conn)) addEdge(conn[0], conn[1])
      }
    } else {
      // ── 模式 3：回退线性链 ──────────────────────────────────
      for (let i = 0; i < n - 1; i++) addEdge(i, i + 1)
    }

    // 环形：额外连接首尾
    if (floorCfg?.loop && n >= 2) addEdge(0, n - 1)

    return adj
  }

  /**
   * Dijkstra 单源最短路，返回到所有节点的距离与前驱数组。
   * 时间复杂度 O(n²)，适合路点数 < 200 的展馆场景。
   *
   * @param {number} n    节点总数
   * @param {Array<Array<{to:number,d:number}>>} adj  邻接表
   * @param {number} start  起点索引
   * @returns {{ dist: number[], prev: number[] }}
   */
  _dijkstraFull(n, adj, start) {
    const dist    = new Array(n).fill(Infinity)
    const prev    = new Array(n).fill(-1)
    const visited = new Array(n).fill(false)

    dist[start] = 0

    for (let iter = 0; iter < n; iter++) {
      let u = -1
      let minD = Infinity
      for (let i = 0; i < n; i++) {
        if (!visited[i] && dist[i] < minD) { minD = dist[i]; u = i }
      }
      if (u === -1) break

      visited[u] = true

      for (const { to, d } of adj[u]) {
        if (!visited[to]) {
          const nd = dist[u] + d
          if (nd < dist[to]) { dist[to] = nd; prev[to] = u }
        }
      }
    }

    return { dist, prev }
  }

  /**
   * 从前驱数组 prev 回溯重建 start→end 的节点索引序列（含两端）。
   * maxLen 用于防御环路（通常传 n+1 即可）。
   *
   * @param {number[]} prev
   * @param {number} start
   * @param {number} end
   * @param {number} maxLen
   * @returns {number[]|null}
   */
  _reconstructPath(prev, start, end, maxLen) {
    if (prev[end] === -1 && end !== start) return null
    const path = []
    for (let at = end; at !== -1; at = prev[at]) {
      path.unshift(at)
      if (path.length > maxLen) return null // 环路保护
    }
    return path
  }

  /**
   * 计算从 currentPos 到 targetPos 的沿路网的路点序列。
   *
   * 算法：最近入网点 + 最近出网点 + Dijkstra（路点图内部）
   *
   *   1. 找到距当前位置最近的路点作为「入网点」entryIdx
   *   2. 找到距目标位置最近的路点作为「出网点」exitIdx
   *   3. 在路点图上从 entryIdx 跑 Dijkstra，找到到达 exitIdx 的最短路
   *      （此步骤处理分叉路线，选择最优行进分支）
   *   4. 路径 = [entry, 中间路点..., exit, 精确 targetPos]
   *
   * 为什么不用虚拟节点全图 Dijkstra？
   *   虚拟终点 T 若允许从任意路点直接抵达，算法会发现「current→Wi→target」
   *   比沿走廊行进更短，从而跳过中间所有路点，造成相机穿墙/不漫游的问题。
   *   本算法限定路点图内部寻路，保证相机始终沿定义的走廊路点行进。
   *
   * 返回值：
   *   - 最后一个元素始终是 targetPos 的精确克隆（不是路点本身）
   *   - 前面的元素是需要经过的路点克隆（含 entry 和 exit）
   *   - 未启用路线导航 / 距离极短 / 路网不可达时退回 [targetPos.clone()]
   *
   * @param {THREE.Vector3} currentPos  当前相机位置
   * @param {THREE.Vector3} targetPos   最终目标位置
   * @param {number} floor              当前楼层
   * @returns {THREE.Vector3[]}
   */
  findPath(currentPos, targetPos, floor) {
    if (!pathsConfig.enabled) return [targetPos.clone()]

    const wps = this.getWaypointVectors(floor)
    if (wps.length < 2) return [targetPos.clone()]

    // 已经非常靠近目标，直线到达即可，不必绕行路网
    if (this._xzDist(currentPos, targetPos) < 0.3) return [targetPos.clone()]

    const n   = wps.length
    const adj = this._buildAdjacency(floor, wps)

    // ── 1. 找入网点和出网点（各取最近路点） ───────────────
    const entryIdx = this._nearestIdx(currentPos, wps)
    const exitIdx  = this._nearestIdx(targetPos,  wps)

    // 入网点与出网点相同：entry → targetPos 两段即可
    if (entryIdx === exitIdx) {
      return [wps[entryIdx].clone(), targetPos.clone()]
    }

    // ── 2. 在路点图上从 entryIdx 跑 Dijkstra ─────────────
    const { dist, prev } = this._dijkstraFull(n, adj, entryIdx)

    if (dist[exitIdx] === Infinity) return [targetPos.clone()] // 路网不可达，直线

    // ── 3. 重建路点索引序列 → Vector3 路径 ───────────────
    const rawPath = this._reconstructPath(prev, entryIdx, exitIdx, n + 1)
    if (!rawPath) return [targetPos.clone()]

    // 将路点索引序列映射为 Vector3，末尾追加精确目标位置
    const path = rawPath.map(i => wps[i].clone())
    path.push(targetPos.clone())

    return path
  }

  /**
   * 点击方向单步导航：返回当前位置最近路点的邻居中，
   * 与"当前→点击目标"方向最对齐的那个路点（XZ 方向余弦最大）。
   *
   * 适用于地面点击移动：每次点击走一步到最对齐方向的相邻路点，
   * 而不是一次性规划并走完全程（全程路线由 findPath 负责）。
   *
   * 算法：
   *   1. 找到距当前位置最近的路点 nearestIdx
   *   2. 候选集 = nearestIdx 的图邻居 ∪ nearestIdx 本身（若尚未到达）
   *   3. 对每个候选计算方向余弦 score = dot(dir_to_wp, click_dir)
   *   4. 返回 score 最大的候选路点（允许负值：所有方向均偏时也给出最优）
   *
   * @param {THREE.Vector3} currentPos  当前相机位置
   * @param {THREE.Vector3} clickPos    点击目标位置（仅用于确定方向）
   * @param {number}        floor       当前楼层
   * @returns {THREE.Vector3|null}      下一步路点的 Vector3 克隆；无路点可选时返回 null
   */
  findNextWaypoint(currentPos, clickPos, floor) {
    const wps = this.getWaypointVectors(floor)
    if (wps.length === 0) return null

    // 点击方向（XZ 平面单位向量）
    const cdx = clickPos.x - currentPos.x
    const cdz = clickPos.z - currentPos.z
    const clen = Math.sqrt(cdx * cdx + cdz * cdz)
    if (clen < 0.01) return null
    const ndx = cdx / clen
    const ndz = cdz / clen

    // 找到距当前位置最近的路点作为入网点
    const nearestIdx = this._nearestIdx(currentPos, wps)
    const adj        = this._buildAdjacency(floor, wps)

    // 候选集：入网点的图邻居
    const candidates = new Set(adj[nearestIdx].map(e => e.to))

    // 若尚未到达入网点本身（距离 > 阈值），将其也加入候选
    // 这样从任意位置点击，相机会先朝入网点靠拢再转向
    if (this._xzDist(currentPos, wps[nearestIdx]) > 0.3) {
      candidates.add(nearestIdx)
    }

    if (candidates.size === 0) return null

    // 对每个候选计算与点击方向的对齐度（方向余弦）
    let bestScore = -Infinity
    let bestIdx   = -1

    for (const idx of candidates) {
      const wp  = wps[idx]
      const wx  = wp.x - currentPos.x
      const wz  = wp.z - currentPos.z
      const wlen = Math.sqrt(wx * wx + wz * wz)
      if (wlen < 0.001) continue
      const score = (wx / wlen) * ndx + (wz / wlen) * ndz
      if (score > bestScore) { bestScore = score; bestIdx = idx }
    }

    return bestIdx >= 0 ? wps[bestIdx].clone() : null
  }

  // ─────────────────────────────────────────────
  //  循环 / 连接 访问器（供 GUI 使用）
  // ─────────────────────────────────────────────

  getLoop(floor) {
    return !!pathsConfig.floors?.[floor]?.loop
  }

  setLoop(floor, v) {
    if (!pathsConfig.floors[floor]) pathsConfig.floors[floor] = { waypoints: [] }
    pathsConfig.floors[floor].loop = !!v
    this.refreshVis(floor)
  }

  // ─────────────────────────────────────────────
  //  可视化
  // ─────────────────────────────────────────────

  /**
   * 设置指定楼层路线的显示/隐藏
   * @param {number} floor
   * @param {boolean} visible
   */
  setVisible(floor, visible) {
    this._visible[floor] = visible
    if (visible) {
      this._updateVis(floor)
    } else {
      this._clearVis(floor)
    }
  }

  /**
   * 路点数据发生变化后刷新可视化（若当前处于显示状态）
   * @param {number} floor
   */
  refreshVis(floor) {
    if (this._visible[floor]) this._updateVis(floor)
  }

  isVisible(floor) {
    return !!this._visible[floor]
  }

  /**
   * 内部：重建指定楼层的三维路线对象。
   *
   * 可视化完全反映实际路网拓扑：
   *   - 使用 _buildAdjacency 获取真实边集（支持 connections / loop）
   *   - 每条边独立绘制为黄色线段 + 中点方向箭头
   *   - 不再是简单的 W0→W1→W2 顺序折线，分叉、捷径、环路均能正确显示
   */
  _updateVis(floor) {
    this._clearVis(floor)
    const wps = this.getWaypointVectors(floor)
    if (wps.length < 1) return

    // lines: 每条边一个 THREE.Line，替代旧的单一折线 obj.line
    const obj = { lines: [], markers: [], arrows: [], labels: [] }
    const color = 0xffff00
    const lineMat = new THREE.LineBasicMaterial({ color, depthTest: false })

    if (wps.length >= 2) {
      // 按实际图拓扑画边（去重，无向图每条边只画一次）
      const adj     = this._buildAdjacency(floor, wps)
      const drawn   = new Set()

      for (let i = 0; i < wps.length; i++) {
        for (const { to } of adj[i]) {
          const key = i < to ? `${i}-${to}` : `${to}-${i}`
          if (drawn.has(key)) continue
          drawn.add(key)

          const from   = wps[i]
          const dest   = wps[to]
          const segLen = this._xzDist(from, dest)
          if (segLen < 0.01) continue

          // 线段
          const pts = [from.x, from.y, from.z, dest.x, dest.y, dest.z]
          const geo = new THREE.BufferGeometry()
          geo.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3))
          const line = new THREE.Line(geo, lineMat)
          line.renderOrder = 999
          this.scene.add(line)
          obj.lines.push(line)

          // 方向箭头（从 i 到 to，中点处）
          const dir = new THREE.Vector3().subVectors(dest, from).normalize()
          const mid = new THREE.Vector3().lerpVectors(from, dest, 0.5)
          const arrowLen = Math.min(0.4, segLen * 0.35)
          const arrow = new THREE.ArrowHelper(dir, mid, arrowLen, color, arrowLen * 0.5, arrowLen * 0.3)
          arrow.renderOrder = 999
          this.scene.add(arrow)
          obj.arrows.push(arrow)
        }
      }
    }

    // 球形路点标记 + 坐标标签
    const sphGeo = new THREE.SphereGeometry(0.08, 8, 6)
    const sphMat = new THREE.MeshBasicMaterial({ color, depthTest: false })
    const rawWps = this.getWaypoints(floor)
    for (let i = 0; i < wps.length; i++) {
      const mesh = new THREE.Mesh(sphGeo, sphMat)
      mesh.position.copy(wps[i])
      mesh.renderOrder = 999
      mesh.userData.waypointFloor = floor
      mesh.userData.waypointIndex = i
      this.scene.add(mesh)
      obj.markers.push(mesh)

      // 坐标标签 Sprite（序号 + XZ 坐标）
      const rawX = rawWps[i]?.[0] ?? wps[i].x
      const rawZ = rawWps[i]?.[1] ?? wps[i].z
      const label = this._makeWaypointLabel(i + 1, rawX, rawZ)
      label.position.set(wps[i].x, wps[i].y + 0.25, wps[i].z)
      this.scene.add(label)
      obj.labels.push(label)
    }

    this._visObjects[floor] = obj
  }

  /**
   * 创建一个带背景的坐标文字 Sprite。
   * 内容：序号（大字）+ X 坐标 + Z 坐标
   *
   * @param {number} index    路点序号（从 1 开始）
   * @param {number} x        X 轴坐标值
   * @param {number} z        Z 轴坐标值
   * @returns {THREE.Sprite}
   */
  _makeWaypointLabel(index, x, z) {
    const W = 256
    const H = 128
    const R = 12 // 圆角半径

    const canvas  = document.createElement('canvas')
    canvas.width  = W
    canvas.height = H
    const ctx = canvas.getContext('2d')

    // 圆角矩形背景
    ctx.beginPath()
    ctx.moveTo(R, 0)
    ctx.lineTo(W - R, 0)
    ctx.quadraticCurveTo(W, 0, W, R)
    ctx.lineTo(W, H - R)
    ctx.quadraticCurveTo(W, H, W - R, H)
    ctx.lineTo(R, H)
    ctx.quadraticCurveTo(0, H, 0, H - R)
    ctx.lineTo(0, R)
    ctx.quadraticCurveTo(0, 0, R, 0)
    ctx.closePath()
    ctx.fillStyle = 'rgba(0, 0, 0, 0.72)'
    ctx.fill()

    // 黄色描边
    ctx.strokeStyle = '#ffff00'
    ctx.lineWidth = 3
    ctx.stroke()

    // 左侧序号背景色块
    ctx.fillStyle = 'rgba(255, 255, 0, 0.18)'
    ctx.fillRect(R, 0, 56, H)

    // 序号文字
    ctx.font = 'bold 56px Arial'
    ctx.fillStyle = '#ffff00'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(String(index), R + 28, H / 2)

    // 坐标文字
    const xStr = x.toFixed(2)
    const zStr = z.toFixed(2)
    ctx.font = 'bold 30px Arial'
    ctx.fillStyle = '#ffffff'
    ctx.textAlign = 'left'
    ctx.textBaseline = 'middle'
    ctx.fillText(`X: ${xStr}`, R + 68, H * 0.33)
    ctx.fillText(`Z: ${zStr}`, R + 68, H * 0.67)

    const texture = new THREE.CanvasTexture(canvas)
    texture.needsUpdate = true

    const mat = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      depthTest: false
    })
    const sprite = new THREE.Sprite(mat)
    // 保持画布宽高比（256:128 = 2:1），世界空间宽度约 0.7 单位
    sprite.scale.set(0.7, 0.35, 1)
    sprite.renderOrder = 1000
    return sprite
  }

  /** 内部：清除指定楼层的三维路线对象 */
  _clearVis(floor) {
    const obj = this._visObjects[floor]
    if (!obj) return
    // 每条边各自一个 Line（旧版兼容 obj.line 单个对象）
    for (const line of (obj.lines ?? [])) {
      line.geometry.dispose()
      this.scene.remove(line)
    }
    if (obj.line) {
      obj.line.geometry.dispose()
      obj.line.material?.dispose()
      this.scene.remove(obj.line)
    }
    for (const m of obj.markers) {
      m.geometry.dispose()
      m.material.dispose()
      this.scene.remove(m)
    }
    for (const a of obj.arrows) {
      this.scene.remove(a)
    }
    for (const s of (obj.labels ?? [])) {
      s.material.map?.dispose()
      s.material.dispose()
      this.scene.remove(s)
    }
    this._visObjects[floor] = null
  }

  // ─────────────────────────────────────────────
  //  路点编辑 API（供 GUI 调用）
  // ─────────────────────────────────────────────

  /**
   * 在指定楼层末尾追加一个路点
   * @param {number} floor
   * @param {number} x
   * @param {number} z
   */
  addWaypoint(floor, x, z) {
    if (!pathsConfig.floors[floor]) {
      pathsConfig.floors[floor] = { waypoints: [] }
    }
    const cfg = pathsConfig.floors[floor]
    cfg.waypoints.push([
      parseFloat(x.toFixed(3)),
      parseFloat(z.toFixed(3))
    ])
    // 若已有 parents 数组，自动将新路点的父设为前一个路点（保持链式连接）
    if (Array.isArray(cfg.parents)) {
      const newIdx = cfg.waypoints.length - 1
      cfg.parents.push(newIdx > 0 ? newIdx - 1 : null)
    }
    this.refreshVis(floor)
  }

  /**
   * 删除指定索引的路点，并同步修正 parents 数组中的引用索引。
   * @param {number} floor
   * @param {number} index
   */
  removeWaypoint(floor, index) {
    const cfg = pathsConfig.floors?.[floor]
    if (!cfg?.waypoints || index < 0 || index >= cfg.waypoints.length) return
    cfg.waypoints.splice(index, 1)
    // 同步修正 parents：删除对应条目，并将 > index 的引用减 1，== index 的置 null
    if (Array.isArray(cfg.parents)) {
      cfg.parents.splice(index, 1)
      for (let i = 0; i < cfg.parents.length; i++) {
        const p = cfg.parents[i]
        if (typeof p === 'number') {
          if (p === index)        cfg.parents[i] = null
          else if (p > index)     cfg.parents[i] = p - 1
        }
      }
      // parents 全为 null 则清空（退回线性回退）
      if (cfg.parents.every(p => p === null)) cfg.parents = null
    }
    this.refreshVis(floor)
  }

  /**
   * 更新指定路点的 XZ 坐标
   * @param {number} floor
   * @param {number} index
   * @param {number} x
   * @param {number} z
   */
  updateWaypoint(floor, index, x, z) {
    const wps = pathsConfig.floors?.[floor]?.waypoints
    if (!wps || index < 0 || index >= wps.length) return
    wps[index] = [parseFloat(x.toFixed(3)), parseFloat(z.toFixed(3))]
    this.refreshVis(floor)
  }

  // ─────────────────────────────────────────────
  //  连接关系编辑 API（供 GUI 调用）
  // ─────────────────────────────────────────────

  // ─────────────────────────────────────────────
  //  parents（树状结构）API
  // ─────────────────────────────────────────────

  /**
   * 返回指定楼层的 parents 配置数组（null = 未使用树状结构）。
   * parents[i] = j 表示路点 i 的父路点是 j；null 表示根节点。
   * @param {number} floor
   * @returns {(number|null)[]|null}
   */
  getParents(floor) {
    return pathsConfig.floors?.[floor]?.parents ?? null
  }

  /**
   * 设置某路点的父路点索引，并刷新可视化。
   * @param {number} floor
   * @param {number} waypointIdx   要设置父节点的路点索引
   * @param {number|null} parentIdx  父路点索引（null 表示设为根节点）
   */
  setParent(floor, waypointIdx, parentIdx) {
    if (!pathsConfig.floors[floor]) return
    const n = pathsConfig.floors[floor].waypoints?.length ?? 0
    if (waypointIdx < 0 || waypointIdx >= n) return
    // 防止自环
    const p = (typeof parentIdx === 'number' && parentIdx >= 0 && parentIdx < n && parentIdx !== waypointIdx)
      ? parentIdx : null
    // 确保 parents 数组已初始化
    if (!Array.isArray(pathsConfig.floors[floor].parents)) {
      pathsConfig.floors[floor].parents = new Array(n).fill(null)
    }
    pathsConfig.floors[floor].parents[waypointIdx] = p
    this.refreshVis(floor)
  }

  /**
   * 清空 parents 数组，恢复回退逻辑（connections 或线性链）。
   * @param {number} floor
   */
  clearParents(floor) {
    if (!pathsConfig.floors[floor]) return
    pathsConfig.floors[floor].parents = null
    this.refreshVis(floor)
  }

  // ─────────────────────────────────────────────
  //  connections（捷径）API
  // ─────────────────────────────────────────────

  /**
   * 返回指定楼层的 connections 捷径列表。
   * 当 parents 存在时 connections 叠加为捷径；否则作为全部边。
   * @param {number} floor
   * @returns {[number,number][]|null}
   */
  getConnections(floor) {
    return pathsConfig.floors?.[floor]?.connections ?? null
  }

  /**
   * 添加一条捷径连接（双向有效）。若已存在则忽略。
   * @param {number} floor
   * @param {number} a  路点索引 A
   * @param {number} b  路点索引 B
   */
  addConnection(floor, a, b) {
    if (a === b) return
    if (!pathsConfig.floors[floor]) pathsConfig.floors[floor] = { waypoints: [] }
    const existing = pathsConfig.floors[floor].connections
    const conns = Array.isArray(existing) ? existing : []
    const dup = conns.some(([ca, cb]) => (ca === a && cb === b) || (ca === b && cb === a))
    if (dup) return
    conns.push([a, b])
    pathsConfig.floors[floor].connections = conns
    this.refreshVis(floor)
  }

  /**
   * 删除指定索引的捷径连接。
   * @param {number} floor
   * @param {number} idx  connections 数组中的索引
   */
  removeConnection(floor, idx) {
    const conns = pathsConfig.floors?.[floor]?.connections
    if (!Array.isArray(conns) || idx < 0 || idx >= conns.length) return
    conns.splice(idx, 1)
    if (conns.length === 0) pathsConfig.floors[floor].connections = null
    this.refreshVis(floor)
  }

  /**
   * 清空所有捷径连接。
   * @param {number} floor
   */
  clearConnections(floor) {
    if (!pathsConfig.floors[floor]) return
    pathsConfig.floors[floor].connections = null
    this.refreshVis(floor)
  }

  // ─────────────────────────────────────────────
  //  销毁
  // ─────────────────────────────────────────────

  dispose() {
    for (const floor of Object.keys(this._visObjects)) {
      this._clearVis(parseInt(floor))
    }
  }
}
