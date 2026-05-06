/**
 * 系统配置文件
 * 包含场景、相机、交互等基础配置参数
 */
const isDebug = false; // 是否显示调试面板
export default {
  // 移动速度（单位/秒）
  movementSpeed: 2.0,
  
  // 最大移动距离（步长，单位：米）
  maxStepDistance: 0.7,
  
  // 第一人称相机高度（米）
  cameraHeight: 1.6,
  
  // 内部模式初始位置配置
  internalMode: {
    // 初始位置相对于模型中心的偏移 [x, y, z]
    // y 轴会自动加上 floorHeight + cameraHeight
    initialPositionOffset: [0, 0, 0],  // 相机在模型中心
    // 初始朝向目标点相对于模型中心的偏移 [x, y, z]
    // y 轴会自动加上 floorHeight + cameraHeight
    initialLookAtOffset: [0, 0, -5]  // 朝向展馆内部（Z轴负方向）
  },
  
  // 交互距离（米）- 距离展品多近时可以交互
  interactionDistance: 3.0,
  
  // 方向检测阈值（0-1）- 鼠标指向方向与展品方向的相似度阈值
  // 值越大要求越精确（1.0 = 完全一致，0.5 = 约60度内）
  directionThreshold: 0.5,
  
  // 默认视角模式：orbit（自由环绕）/ fixed（固定视角）
  defaultViewMode: "orbit",
  
  // 固定视角预设（当defaultViewMode为fixed时使用）
  fixedViews: [
    {
      name: "正面视角",
      position: [0, 5, 10],
      target: [0, 0, 0]
    },
    {
      name: "侧面视角",
      position: [10, 5, 0],
      target: [0, 0, 0]
    },
    {
      name: "俯视视角",
      position: [0, 15, 0],
      target: [0, 0, 0]
    }
  ],
  
  // 移动端配置
  mobile: {
    // 是否启用移动端优化
    enabled: true,
    
    // 移动端帧率限制（30或60）
    targetFPS: 30,
    
    // 触摸灵敏度（0.5-2.0）
    touchSensitivity: 1.0,
    
    // 是否启用虚拟摇杆（替代点击移动）
    enableVirtualJoystick: false,
    
    // 按钮大小倍数（相对于PC端）
    buttonScale: 1.5,
    
    // 是否启用性能模式（降低画质提升性能，移动端默认开启）
    performanceMode: false,
    
    // 移动端交互距离（米）
    interactionDistance: 5.5,
    
    // 是否启用手势导航
    enableGestureNavigation: true
  },

  // 碰撞配置
  collision: {
    // 相机不能超出的碰撞体类型
    boundaryTypes: [
      { role: "wall", type: "wall" },
      { role: "wall", type: "glass_wall" },
      { role: "wall", type: "展馆外壳" },
      { role: "ceiling", type: "ceiling" },
      { role: "floor", type: "floor" }
    ],
    // 点碰撞时要忽略的碰撞体类型
    ignoreTypesForPointCollision: ["wall", "ceiling", "floor"]
  },
  
  // 场景配置
  scene: {
    // 背景色
    backgroundColor: 0x000000,
    // 雾效
    fog: {
      enabled: false,
      color: 0xffffff,
      near: 10,
      far: 50
    },
    // 地面配置
    ground: {
      enabled: true,
      color: 0x4a4a4a, // 深灰色
      roughness: 0.9, // 粗糙度（水泥质感）
      metalness: 0.1, // 金属度（水泥不反光）
      size: 10000, // 地面大小（足够大，看起来无限）
      position: 0, // 地面Y轴位置（初始值，模型加载后会自动调整到模型最低点以下）
      offset: -0.1 // 地面相对模型最低点的偏移（米，负值表示在模型下方）
    },
    // 光照配置
    lighting: {
      // 半球光（天空和地面）
      hemisphere: {
        enabled: true,
        skyColor: 0x87ceeb, // 天空颜色（浅蓝色）
        groundColor: 0x8b7355, // 地面颜色（棕色）
        intensity: 0.6
      },
      // 方向光（太阳光）
      directional: {
        enabled: true,
        color: 0xffffff,
        intensity: 0.8,
        position: [10, 10, 5],
        castShadow: false,
        shadow: {
          enabled: false,
          mapSize: 2048,
          camera: {
            near: 0.5,
            far: 50,
            left: -20,
            right: 20,
            top: 20,
            bottom: -20
          }
        }
      },
      // 环境光（基础照明）
      ambient: {
        enabled: true,
        color: 0xffffff,
        intensity: 0.4
      }
    }
  },
  
  // 相机配置
  camera: {
    // 外部视角相机位置
    externalPosition: [14.2, 0.39, 9.02],
    // 外部视角目标点（根据相机位置、旋转和距离计算）
    externalTarget: [0, 0, 0], // 将在初始化时根据实际配置计算
    // 外部视角相机旋转（欧拉角，单位：度）
    externalRotation: {
      x: -3.12,
      y: 51.07,
      z: 2.43
    },
    // 外部视角距离目标（米）
    externalDistance: 18.83,
    // 外部视角缩放级别
    externalZoom: 1.2,
    // 视野角度
    fov: 75,
    // 近裁剪面
    near: 0.1,
    // 远裁剪面
    far: 1000
  },
  
  // 模型性能测试（控制台输出实际性能值，用于测试文档数据采集）
  performanceMonitor: {
    // 是否开启性能监控
    enabled: false,
    // 输出间隔（毫秒），每隔多久在控制台输出一次性能数据
    logInterval: 5000
  },

  // 调试配置
  debug: {
    // 是否显示GUI调试面板
    showGUI: isDebug,
    // 是否显示碰撞体（调试用）
    showCollisions: isDebug,
    // 是否显示辅助网格
    showGrid: isDebug,
    // 是否显示坐标轴
    showAxes: isDebug
  }
}

