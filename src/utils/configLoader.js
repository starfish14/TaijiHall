/**
 * 配置文件加载器
 * 统一加载所有配置文件
 */
import config from '@/config/config.js'
import exhibits from '@/config/exhibits.js'
import modelExhibits from '@/config/modelExhibits.js'
import floors from '@/config/floors.js'
import collisions from '@/config/collisions.js'
import paths from '@/config/paths.js'

export function loadConfig() {
  return config
}

export function loadExhibits() {
  // 将展品展开为多个触发点（如果一个展品有多个位置）
  const expandedExhibits = []
  
  // 1. 普通展品
  for (const exhibit of exhibits.exhibits) {
    // 设置默认类型为 'exhibit'（如果未指定）
    const exhibitType = exhibit.type || 'exhibit'
    
    // 如果配置了 positions 数组（多个位置）
    if (exhibit.positions && Array.isArray(exhibit.positions)) {
      for (const pos of exhibit.positions) {
        expandedExhibits.push({
          ...exhibit,
          type: exhibitType,  // 确保有 type 字段
          // 使用位置的 id（如果存在），否则使用展品的 id
          triggerId: pos.id || exhibit.id,
          position: pos.position,
          // 移除 positions 属性，避免混淆
          positions: undefined
        })
      }
    } else if (exhibit.position) {
      // 单个位置（向后兼容）
      expandedExhibits.push({
        ...exhibit,
        type: exhibitType,  // 确保有 type 字段
        triggerId: exhibit.id
      })
    } else if (exhibit.bounds) {
      // 如果只有 bounds 没有 position，也添加展品（用于包围盒检测）
      expandedExhibits.push({
        ...exhibit,
        type: exhibitType,  // 确保有 type 字段
        triggerId: exhibit.id,
        // 从 bounds 计算中心点作为 position（用于距离计算）
        position: exhibit.bounds.center || [
          (exhibit.bounds.min[0] + exhibit.bounds.max[0]) / 2,
          (exhibit.bounds.min[1] + exhibit.bounds.max[1]) / 2,
          (exhibit.bounds.min[2] + exhibit.bounds.max[2]) / 2
        ]
      })
    }
  }
  
  // 2. 模型展品（合并到交互列表，支持点击）
  const modelExhibitConfigs = modelExhibits.modelExhibits || []
  for (const cfg of modelExhibitConfigs) {
    const type = cfg.type || 'modelExhibit'
    const position = cfg.position || (cfg.bounds?.center
      ? cfg.bounds.center
      : cfg.bounds?.min && cfg.bounds?.max
        ? [
            (cfg.bounds.min[0] + cfg.bounds.max[0]) / 2,
            (cfg.bounds.min[1] + cfg.bounds.max[1]) / 2,
            (cfg.bounds.min[2] + cfg.bounds.max[2]) / 2
          ]
        : [0, 0, 0])
    expandedExhibits.push({
      ...cfg,
      type: type === 'modelExhibit' ? 'exhibit' : type,
      triggerId: cfg.id,
      position
    })
  }
  
  return expandedExhibits
}

export function loadFloors() {
  return floors.floors
}

export function loadCollisions() {
  return collisions.collisions
}

export function loadPaths() {
  return paths
}

// 根据楼层获取展品
export function getExhibitsByFloor(floor) {
  return loadExhibits().filter(exhibit => exhibit.floor === floor)
}

// 根据ID获取展品（返回原始展品配置，不包含展开的触发点）
export function getExhibitById(id) {
  return exhibits.exhibits.find(exhibit => exhibit.id === id)
}

// 根据楼层获取碰撞体
export function getCollisionsByFloor(floor) {
  return loadCollisions().filter(collision => collision.floor === floor)
}

// 获取楼层信息
export function getFloorByLevel(level) {
  return loadFloors().find(floor => floor.level === level)
}

// ========== 模型展品 ==========

// 加载所有模型展品配置
export function loadModelExhibits() {
  return modelExhibits.modelExhibits || []
}

// 根据楼层获取模型展品
export function getModelExhibitsByFloor(floor) {
  return loadModelExhibits().filter(item => item.floor === floor)
}

// 根据 ID 获取模型展品
export function getModelExhibitById(id) {
  return modelExhibits.modelExhibits?.find(item => item.id === id) || null
}

