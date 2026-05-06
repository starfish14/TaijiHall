/**
 * lil-gui 调试面板
 */
import GUI from 'lil-gui'
import * as THREE from 'three'
import config from '@/config/config.js'
import { loadExhibits, getExhibitById, loadModelExhibits } from '@/utils/configLoader.js'
import exhibitsConfig from '@/config/exhibits.js'
import modelExhibitsConfig from '@/config/modelExhibits.js'
export class DebugGUI {
  constructor(scene, camera, renderer, controlsManager, collisionSystem, pathNavigator = null) {
    this.scene = scene
    this.camera = camera
    this.renderer = renderer
    this.controlsManager = controlsManager
    this.collisionSystem = collisionSystem
    this.pathNavigator = pathNavigator
    
    this.gui = null
    this.debugObjects = {
      gridHelper: null,
      axesHelper: null,
      axesLabels: [], // 存储坐标轴标签
      collisionMeshes: [],
      exhibitMeshes: [] // 存储展品线框
    }
    this.collisionEditorFolders = [] // 存储碰撞体编辑器文件夹
    this.exhibitEditorFolders = [] // 存储展品编辑器文件夹
    this.modelExhibitEditorFolders = [] // 存储模型展品编辑器文件夹
    
    if (config.debug?.showGUI) {
      this.init()
    }
  }
  
  init() {
    this.gui = new GUI()
    this.gui.title('调试面板')
    
    // 将调试面板移到页面左边
    const guiElement = this.gui.domElement
    if (guiElement) {
      guiElement.style.left = '0'
      guiElement.style.right = 'auto'
    }
    
    // 相机控制
    this.setupCameraControls()
    
    // 场景控制
    this.setupSceneControls()
    
    // 光照控制
    this.setupLightingControls()
    
    // 渲染控制
    this.setupRendererControls()
    
    // 碰撞检测控制
    this.setupCollisionControls()
    
    // 展品位置控制
    this.setupExhibitControls()
    
    // 模型展品位置控制
    this.setupModelExhibitControls()
    
    // 模型坐标轴控制
    this.setupModelControls()
    
    // 路线导航控制
    this.setupPathControls()
    
    // 性能监控
    this.setupPerformanceControls()
  }
  
  setupCameraControls() {
    const cameraFolder = this.gui.addFolder('相机')
    
    const cameraParams = {
      fov: this.camera.fov,
      near: this.camera.near,
      far: this.camera.far,
      positionX: this.camera.position.x,
      positionY: this.camera.position.y,
      positionZ: this.camera.position.z,
      // 实时显示信息
      rotationX: 0,
      rotationY: 0,
      rotationZ: 0,
      distance: 0,
      zoom: 1
    }
    
    // 可调整的参数
    cameraFolder
      .add(cameraParams, 'fov', 10, 120)
      .name('视野角度')
      .onChange((value) => {
        this.camera.fov = value
        this.camera.updateProjectionMatrix()
      })
    
    cameraFolder
      .add(cameraParams, 'near', 0.1, 10)
      .name('近裁剪面')
      .onChange((value) => {
        this.camera.near = value
        this.camera.updateProjectionMatrix()
      })
    
    cameraFolder
      .add(cameraParams, 'far', 100, 5000)
      .name('远裁剪面')
      .onChange((value) => {
        this.camera.far = value
        this.camera.updateProjectionMatrix()
      })
    
    cameraFolder
      .add(cameraParams, 'positionX', -50, 50)
      .name('位置 X')
      .onChange((value) => {
        this.camera.position.x = value
      })
    
    cameraFolder
      .add(cameraParams, 'positionY', 0, 50)
      .name('位置 Y')
      .onChange((value) => {
        this.camera.position.y = value
      })
    
    cameraFolder
      .add(cameraParams, 'positionZ', -50, 50)
      .name('位置 Z')
      .onChange((value) => {
        this.camera.position.z = value
      })
    
    // 实时显示信息（只读）
    cameraFolder
      .add(cameraParams, 'positionX')
      .name('实时位置 X')
      .listen()
      .disable()
    
    cameraFolder
      .add(cameraParams, 'positionY')
      .name('实时位置 Y')
      .listen()
      .disable()
    
    cameraFolder
      .add(cameraParams, 'positionZ')
      .name('实时位置 Z')
      .listen()
      .disable()
    
    cameraFolder
      .add(cameraParams, 'rotationX')
      .name('旋转 X (度)')
      .listen()
      .disable()
    
    cameraFolder
      .add(cameraParams, 'rotationY')
      .name('旋转 Y (度)')
      .listen()
      .disable()
    
    cameraFolder
      .add(cameraParams, 'rotationZ')
      .name('旋转 Z (度)')
      .listen()
      .disable()
    
    // OrbitControls 相关信息
    if (this.controlsManager?.orbitControls) {
      cameraFolder
        .add(cameraParams, 'distance')
        .name('距离目标 (米)')
        .listen()
        .disable()
      
      cameraFolder
        .add(cameraParams, 'zoom')
        .name('缩放级别')
        .listen()
        .disable()
    }
    
    cameraFolder.add({
      resetCamera: () => {
        this.camera.position.set(...config.camera.externalPosition)
        if (this.controlsManager?.orbitControls) {
          this.controlsManager.orbitControls.target.set(...(config.camera.externalTarget || [0, 0, 0]))
          this.controlsManager.orbitControls.update()
        }
      }
    }, 'resetCamera').name('重置相机')
    
    // 实时更新相机信息
    const updateCameraInfo = () => {
      if (!this.gui) return
      
      // 更新位置
      cameraParams.positionX = this.camera.position.x
      cameraParams.positionY = this.camera.position.y
      cameraParams.positionZ = this.camera.position.z
      
      // 更新旋转角度（转换为度）
      const euler = new THREE.Euler().setFromQuaternion(this.camera.quaternion)
      cameraParams.rotationX = THREE.MathUtils.radToDeg(euler.x)
      cameraParams.rotationY = THREE.MathUtils.radToDeg(euler.y)
      cameraParams.rotationZ = THREE.MathUtils.radToDeg(euler.z)
      
      // 更新OrbitControls信息
      if (this.controlsManager?.orbitControls) {
        const distance = this.camera.position.distanceTo(this.controlsManager.orbitControls.target)
        cameraParams.distance = distance.toFixed(2)
        cameraParams.zoom = this.camera.zoom.toFixed(2)
      }
      
      requestAnimationFrame(updateCameraInfo)
    }
    
    updateCameraInfo()
  }
  
  setupSceneControls() {
    const sceneFolder = this.gui.addFolder('场景')
    
    const sceneParams = {
      backgroundColor: `#${config.scene.backgroundColor.toString(16).padStart(6, '0')}`,
      showGrid: config.debug?.showGrid || false,
      showAxes: config.debug?.showAxes || false
    }
    
    sceneFolder
      .add(sceneParams, 'backgroundColor')
      .name('背景色')
      .onChange((value) => {
        const color = new THREE.Color(value)
        this.scene.background = color
        config.scene.backgroundColor = color.getHex()
      })
    
    sceneFolder
      .add(sceneParams, 'showGrid')
      .name('显示网格')
      .onChange((value) => {
        if (value) {
          if (!this.debugObjects.gridHelper) {
            this.debugObjects.gridHelper = new THREE.GridHelper(50, 50, 0x888888, 0x444444)
            this.scene.add(this.debugObjects.gridHelper)
          }
        } else {
          if (this.debugObjects.gridHelper) {
            this.scene.remove(this.debugObjects.gridHelper)
            this.debugObjects.gridHelper = null
          }
        }
      })
    
    sceneFolder
      .add(sceneParams, 'showAxes')
      .name('显示坐标轴')
      .onChange((value) => {
        if (value) {
          if (!this.debugObjects.axesHelper) {
            this.debugObjects.axesHelper = this.createAxesHelperWithLabels(10)
            
            // 获取模型的实际中心点位置
            const scene3D = this.scene.userData.scene3D
            if (scene3D && scene3D.modelCenter) {
              // 坐标轴显示在模型的实际中心点位置
              // 由于标签已经添加到坐标轴辅助器中，它们会自动跟随坐标轴移动
              this.debugObjects.axesHelper.position.set(
                scene3D.modelCenter.x,
                scene3D.modelCenter.y,
                scene3D.modelCenter.z
              )
            }
            
            this.scene.add(this.debugObjects.axesHelper)
          }
        } else {
          if (this.debugObjects.axesHelper) {
            this.scene.remove(this.debugObjects.axesHelper)
            // 清理标签
            if (this.debugObjects.axesLabels) {
              this.debugObjects.axesLabels.forEach(label => {
                this.scene.remove(label)
                label.geometry.dispose()
                label.material.dispose()
              })
              this.debugObjects.axesLabels = []
            }
            this.debugObjects.axesHelper = null
          }
        }
      })
  }
  
  setupLightingControls() {
    const lightingFolder = this.gui.addFolder('光照系统')
    
    // 获取场景中的光照对象
    const scene3D = this.scene.userData.scene3D
    const lights = scene3D?.getLights?.() || {}
    
    // 半球光控制
    if (lights.hemisphere) {
      const hemisphereFolder = lightingFolder.addFolder('半球光（天空/地面）')
      const hemisphereParams = {
        enabled: config.scene.lighting.hemisphere.enabled,
        skyColor: `#${config.scene.lighting.hemisphere.skyColor.toString(16).padStart(6, '0')}`,
        groundColor: `#${config.scene.lighting.hemisphere.groundColor.toString(16).padStart(6, '0')}`,
        intensity: config.scene.lighting.hemisphere.intensity
      }
      
      hemisphereFolder
        .add(hemisphereParams, 'enabled')
        .name('启用')
        .onChange((value) => {
          lights.hemisphere.visible = value
          config.scene.lighting.hemisphere.enabled = value
        })
      
      hemisphereFolder
        .add(hemisphereParams, 'intensity', 0, 2)
        .name('强度')
        .onChange((value) => {
          lights.hemisphere.intensity = value
          config.scene.lighting.hemisphere.intensity = value
        })
      
      hemisphereFolder
        .addColor(hemisphereParams, 'skyColor')
        .name('天空颜色')
        .onChange((value) => {
          const color = new THREE.Color(value)
          lights.hemisphere.color.copy(color)
          config.scene.lighting.hemisphere.skyColor = color.getHex()
        })
      
      hemisphereFolder
        .addColor(hemisphereParams, 'groundColor')
        .name('地面颜色')
        .onChange((value) => {
          const color = new THREE.Color(value)
          lights.hemisphere.groundColor.copy(color)
          config.scene.lighting.hemisphere.groundColor = color.getHex()
        })
    }
    
    // 环境光控制
    if (lights.ambient) {
      const ambientFolder = lightingFolder.addFolder('环境光')
      const ambientParams = {
        enabled: config.scene.lighting.ambient.enabled,
        intensity: config.scene.lighting.ambient.intensity,
        color: `#${config.scene.lighting.ambient.color.toString(16).padStart(6, '0')}`
      }
      
      ambientFolder
        .add(ambientParams, 'enabled')
        .name('启用')
        .onChange((value) => {
          lights.ambient.visible = value
          config.scene.lighting.ambient.enabled = value
        })
      
      ambientFolder
        .add(ambientParams, 'intensity', 0, 2)
        .name('强度')
        .onChange((value) => {
          lights.ambient.intensity = value
          config.scene.lighting.ambient.intensity = value
        })
      
      ambientFolder
        .addColor(ambientParams, 'color')
        .name('颜色')
        .onChange((value) => {
          const color = new THREE.Color(value)
          lights.ambient.color.copy(color)
          config.scene.lighting.ambient.color = color.getHex()
        })
    }
    
    // 方向光控制
    if (lights.directional) {
      const directionalFolder = lightingFolder.addFolder('方向光（太阳光）')
      const directionalParams = {
        enabled: config.scene.lighting.directional.enabled,
        intensity: config.scene.lighting.directional.intensity,
        color: `#${config.scene.lighting.directional.color.toString(16).padStart(6, '0')}`,
        positionX: config.scene.lighting.directional.position[0],
        positionY: config.scene.lighting.directional.position[1],
        positionZ: config.scene.lighting.directional.position[2],
        castShadow: config.scene.lighting.directional.castShadow
      }
      
      directionalFolder
        .add(directionalParams, 'enabled')
        .name('启用')
        .onChange((value) => {
          lights.directional.visible = value
          config.scene.lighting.directional.enabled = value
        })
      
      directionalFolder
        .add(directionalParams, 'intensity', 0, 2)
        .name('强度')
        .onChange((value) => {
          lights.directional.intensity = value
          config.scene.lighting.directional.intensity = value
        })
      
      directionalFolder
        .addColor(directionalParams, 'color')
        .name('颜色')
        .onChange((value) => {
          const color = new THREE.Color(value)
          lights.directional.color.copy(color)
          config.scene.lighting.directional.color = color.getHex()
        })
      
      directionalFolder
        .add(directionalParams, 'positionX', -50, 50)
        .name('位置 X')
        .onChange((value) => {
          lights.directional.position.x = value
          config.scene.lighting.directional.position[0] = value
        })
      
      directionalFolder
        .add(directionalParams, 'positionY', 0, 50)
        .name('位置 Y')
        .onChange((value) => {
          lights.directional.position.y = value
          config.scene.lighting.directional.position[1] = value
        })
      
      directionalFolder
        .add(directionalParams, 'positionZ', -50, 50)
        .name('位置 Z')
        .onChange((value) => {
          lights.directional.position.z = value
          config.scene.lighting.directional.position[2] = value
        })
      
      directionalFolder
        .add(directionalParams, 'castShadow')
        .name('投射阴影')
        .onChange((value) => {
          lights.directional.castShadow = value
          config.scene.lighting.directional.castShadow = value
        })
    }
  }
  
  setupRendererControls() {
    const rendererFolder = this.gui.addFolder('渲染器')
    
    const rendererParams = {
      pixelRatio: this.renderer.getPixelRatio(),
      shadowMap: this.renderer.shadowMap.enabled,
      antialias: true
    }
    
    rendererFolder
      .add(rendererParams, 'pixelRatio', 0.5, 2, 0.5)
      .name('像素比')
      .onChange((value) => {
        this.renderer.setPixelRatio(value)
      })
    
    rendererFolder
      .add(rendererParams, 'shadowMap')
      .name('阴影映射')
      .onChange((value) => {
        this.renderer.shadowMap.enabled = value
      })
  }
  
  setupCollisionControls() {
    const collisionFolder = this.gui.addFolder('碰撞检测')
    
    const collisionParams = {
      showCollisions: config.debug?.showCollisions || false
    }
    
    collisionFolder
      .add(collisionParams, 'showCollisions')
      .name('显示碰撞体')
      .onChange((value) => {
        if (value) {
          this.showCollisionMeshes()
          this.setupCollisionEditors()
        } else {
          this.hideCollisionMeshes()
          this.removeCollisionEditors()
        }
      })
    
    // 如果默认显示，立即设置编辑器
    if (collisionParams.showCollisions) {
      this.setupCollisionEditors()
    }
  }
  
  setupExhibitControls() {
    const exhibitFolder = this.gui.addFolder('展品位置')
    
    const exhibitParams = {
      showExhibits: config.debug?.showExhibits || false
    }
    
    exhibitFolder
      .add(exhibitParams, 'showExhibits')
      .name('显示展品线框')
      .onChange((value) => {
        if (value) {
          this.showExhibitMeshes()
          this.setupExhibitEditors()
        } else {
          this.hideExhibitMeshes()
          this.removeExhibitEditors()
        }
      })
    
    // 如果默认显示，立即显示和设置编辑器
    if (exhibitParams.showExhibits) {
      this.showExhibitMeshes()
      this.setupExhibitEditors()
    }
  }
  
  setupModelExhibitControls() {
    // 移除旧的模型展品文件夹（若存在）
    const oldFolder = this.gui.children.find(f => f._title === '模型展品位置')
    if (oldFolder) oldFolder.destroy()
    
    const modelExhibitFolder = this.gui.addFolder('模型展品位置')
    
    const configs = loadModelExhibits()
    if (!configs || configs.length === 0) {
      modelExhibitFolder.add({ note: '暂无模型展品' }, 'note').name('提示').disable()
      return
    }
    
    // 移除旧的模型展品编辑器
    this.modelExhibitEditorFolders.forEach(f => f.destroy())
    this.modelExhibitEditorFolders = []
    
    configs.forEach((cfg) => {
      const name = cfg.name || cfg.id
      const editorFolder = modelExhibitFolder.addFolder(`${name} (${cfg.floor}层)`)
      
      // 从配置或 bounds 计算初始位置
      let pos = cfg.position
      if (!pos && cfg.bounds) {
        if (cfg.bounds.center) {
          pos = [...cfg.bounds.center]
        } else if (cfg.bounds.min && cfg.bounds.max) {
          pos = [
            (cfg.bounds.min[0] + cfg.bounds.max[0]) / 2,
            (cfg.bounds.min[1] + cfg.bounds.max[1]) / 2,
            (cfg.bounds.min[2] + cfg.bounds.max[2]) / 2
          ]
        }
      }
      pos = pos || [0, 0, 0]
      
      const rot = cfg.rotation || [0, 0, 0]
      const scaleVal = cfg.scale
      const scaleX = typeof scaleVal === 'number' ? scaleVal : (scaleVal?.[0] ?? 1)
      const scaleY = typeof scaleVal === 'number' ? scaleVal : (scaleVal?.[1] ?? 1)
      const scaleZ = typeof scaleVal === 'number' ? scaleVal : (scaleVal?.[2] ?? 1)
      
      const params = {
        positionX: pos[0],
        positionY: pos[1],
        positionZ: pos[2],
        rotationX: rot[0],
        rotationY: rot[1],
        rotationZ: rot[2],
        scaleX,
        scaleY,
        scaleZ
      }
      
      editorFolder
        .add(params, 'positionX', -50, 50, 0.01)
        .name('位置 X')
        .onChange(() => this.updateModelExhibit(cfg.id, params))
      
      editorFolder
        .add(params, 'positionY', -50, 50, 0.01)
        .name('位置 Y')
        .onChange(() => this.updateModelExhibit(cfg.id, params))
      
      editorFolder
        .add(params, 'positionZ', -50, 50, 0.01)
        .name('位置 Z')
        .onChange(() => this.updateModelExhibit(cfg.id, params))
      
      editorFolder
        .add(params, 'rotationX', -Math.PI * 2, Math.PI * 2, 0.01)
        .name('旋转 X')
        .onChange(() => this.updateModelExhibit(cfg.id, params))
      
      editorFolder
        .add(params, 'rotationY', -Math.PI * 2, Math.PI * 2, 0.01)
        .name('旋转 Y')
        .onChange(() => this.updateModelExhibit(cfg.id, params))
      
      editorFolder
        .add(params, 'rotationZ', -Math.PI * 2, Math.PI * 2, 0.01)
        .name('旋转 Z')
        .onChange(() => this.updateModelExhibit(cfg.id, params))
      
      editorFolder
        .add(params, 'scaleX', 0.01, 10, 0.01)
        .name('缩放 X')
        .onChange(() => this.updateModelExhibit(cfg.id, params))
      
      editorFolder
        .add(params, 'scaleY', 0.01, 10, 0.01)
        .name('缩放 Y')
        .onChange(() => this.updateModelExhibit(cfg.id, params))
      
      editorFolder
        .add(params, 'scaleZ', 0.01, 10, 0.01)
        .name('缩放 Z')
        .onChange(() => this.updateModelExhibit(cfg.id, params))
      
      // 导航相机
      const camPos = cfg.cameraPosition || [0, 0, 0]
      const camLook = cfg.cameraLookAt || [0, 0, 0]
      const cameraParams = {
        camPosX: camPos[0],
        camPosY: camPos[1],
        camPosZ: camPos[2],
        camLookX: camLook[0],
        camLookY: camLook[1],
        camLookZ: camLook[2]
      }
      const cameraFolder = editorFolder.addFolder('导航相机')
      cameraFolder.add(cameraParams, 'camPosX', -50, 50, 0.01).name('相机位置 X').onChange(() => this.updateModelExhibitCamera(cfg.id, cameraParams))
      cameraFolder.add(cameraParams, 'camPosY', -50, 50, 0.01).name('相机位置 Y').onChange(() => this.updateModelExhibitCamera(cfg.id, cameraParams))
      cameraFolder.add(cameraParams, 'camPosZ', -50, 50, 0.01).name('相机位置 Z').onChange(() => this.updateModelExhibitCamera(cfg.id, cameraParams))
      cameraFolder.add(cameraParams, 'camLookX', -50, 50, 0.01).name('朝向目标 X').onChange(() => this.updateModelExhibitCamera(cfg.id, cameraParams))
      cameraFolder.add(cameraParams, 'camLookY', -50, 50, 0.01).name('朝向目标 Y').onChange(() => this.updateModelExhibitCamera(cfg.id, cameraParams))
      cameraFolder.add(cameraParams, 'camLookZ', -50, 50, 0.01).name('朝向目标 Z').onChange(() => this.updateModelExhibitCamera(cfg.id, cameraParams))
      
      // bounds 编辑器（交互区域）
      if (cfg.bounds) {
        this.setupModelExhibitBoundsEditor(editorFolder, cfg)
      } else {
        // 无 bounds 时可添加
        editorFolder.add({
          addBounds: () => {
            if (!cfg.bounds) {
              cfg.bounds = { min: [pos[0] - 0.5, pos[1] - 0.5, pos[2] - 0.5], max: [pos[0] + 0.5, pos[1] + 0.5, pos[2] + 0.5] }
              this.modelExhibitEditorFolders.forEach(f => f.destroy())
              this.modelExhibitEditorFolders = []
              this.setupModelExhibitControls()
            }
          }
        }, 'addBounds').name('添加 bounds')
      }
      
      this.modelExhibitEditorFolders.push(editorFolder)
    })
  }
  
  setupModelExhibitBoundsEditor(editorFolder, cfg) {
    const boundsFolder = editorFolder.addFolder('交互区域(bounds)')
    
    if (cfg.bounds.center && cfg.bounds.size) {
      const boundsParams = {
        centerX: cfg.bounds.center[0],
        centerY: cfg.bounds.center[1],
        centerZ: cfg.bounds.center[2],
        sizeX: cfg.bounds.size[0],
        sizeY: cfg.bounds.size[1],
        sizeZ: cfg.bounds.size[2]
      }
      boundsFolder.add(boundsParams, 'centerX', -50, 50, 0.01).name('中心 X').onChange(() => this.updateModelExhibitBounds(cfg.id, boundsParams, 'center-size'))
      boundsFolder.add(boundsParams, 'centerY', -50, 50, 0.01).name('中心 Y').onChange(() => this.updateModelExhibitBounds(cfg.id, boundsParams, 'center-size'))
      boundsFolder.add(boundsParams, 'centerZ', -50, 50, 0.01).name('中心 Z').onChange(() => this.updateModelExhibitBounds(cfg.id, boundsParams, 'center-size'))
      boundsFolder.add(boundsParams, 'sizeX', 0.1, 50, 0.01).name('宽度').onChange(() => this.updateModelExhibitBounds(cfg.id, boundsParams, 'center-size'))
      boundsFolder.add(boundsParams, 'sizeY', 0.1, 50, 0.01).name('高度').onChange(() => this.updateModelExhibitBounds(cfg.id, boundsParams, 'center-size'))
      boundsFolder.add(boundsParams, 'sizeZ', 0.1, 50, 0.01).name('深度').onChange(() => this.updateModelExhibitBounds(cfg.id, boundsParams, 'center-size'))
    } else if (cfg.bounds.min && cfg.bounds.max) {
      const boundsParams = {
        minX: cfg.bounds.min[0],
        minY: cfg.bounds.min[1],
        minZ: cfg.bounds.min[2],
        maxX: cfg.bounds.max[0],
        maxY: cfg.bounds.max[1],
        maxZ: cfg.bounds.max[2]
      }
      boundsFolder.add(boundsParams, 'minX', -50, 50, 0.01).name('最小 X').onChange(() => this.updateModelExhibitBounds(cfg.id, boundsParams, 'min-max'))
      boundsFolder.add(boundsParams, 'minY', -50, 50, 0.01).name('最小 Y').onChange(() => this.updateModelExhibitBounds(cfg.id, boundsParams, 'min-max'))
      boundsFolder.add(boundsParams, 'minZ', -50, 50, 0.01).name('最小 Z').onChange(() => this.updateModelExhibitBounds(cfg.id, boundsParams, 'min-max'))
      boundsFolder.add(boundsParams, 'maxX', -50, 50, 0.01).name('最大 X').onChange(() => this.updateModelExhibitBounds(cfg.id, boundsParams, 'min-max'))
      boundsFolder.add(boundsParams, 'maxY', -50, 50, 0.01).name('最大 Y').onChange(() => this.updateModelExhibitBounds(cfg.id, boundsParams, 'min-max'))
      boundsFolder.add(boundsParams, 'maxZ', -50, 50, 0.01).name('最大 Z').onChange(() => this.updateModelExhibitBounds(cfg.id, boundsParams, 'min-max'))
    }
  }
  
  updateModelExhibitBounds(exhibitId, boundsParams, type) {
    const cfg = modelExhibitsConfig.modelExhibits?.find(e => e.id === exhibitId)
    if (!cfg || !cfg.bounds) return
    
    if (type === 'center-size') {
      cfg.bounds.center = [boundsParams.centerX, boundsParams.centerY, boundsParams.centerZ]
      cfg.bounds.size = [boundsParams.sizeX, boundsParams.sizeY, boundsParams.sizeZ]
      delete cfg.bounds.min
      delete cfg.bounds.max
    } else if (type === 'min-max') {
      cfg.bounds.min = [boundsParams.minX, boundsParams.minY, boundsParams.minZ]
      cfg.bounds.max = [boundsParams.maxX, boundsParams.maxY, boundsParams.maxZ]
      delete cfg.bounds.center
      delete cfg.bounds.size
    }
    
    const interactionSystem = this.scene.userData.interactionSystem
    if (interactionSystem) {
      interactionSystem.exhibits = loadExhibits()
    }
    
    // 刷新展品线框显示
    const exhibitFolder = this.gui.children.find(f => f._title === '展品位置')
    if (exhibitFolder && this.debugObjects?.exhibitMeshes?.length > 0) {
      this.hideExhibitMeshes()
      this.showExhibitMeshes()
    }
  }
  
  updateModelExhibitCamera(exhibitId, cameraParams) {
    const cfg = modelExhibitsConfig.modelExhibits?.find(e => e.id === exhibitId)
    if (!cfg) return
    cfg.cameraPosition = [cameraParams.camPosX, cameraParams.camPosY, cameraParams.camPosZ]
    cfg.cameraLookAt = [cameraParams.camLookX, cameraParams.camLookY, cameraParams.camLookZ]
    const interactionSystem = this.scene.userData.interactionSystem
    if (interactionSystem) interactionSystem.exhibits = loadExhibits()
    // 实时更新相机位置和朝向
    this.applyCameraPreview(cameraParams.camPosX, cameraParams.camPosY, cameraParams.camPosZ, cameraParams.camLookX, cameraParams.camLookY, cameraParams.camLookZ)
  }
  
  /** 将相机移动到指定位置并朝向目标点（实时预览） */
  applyCameraPreview(camPosX, camPosY, camPosZ, camLookX, camLookY, camLookZ) {
    this.camera.position.set(camPosX, camPosY, camPosZ)
    this.camera.lookAt(camLookX, camLookY, camLookZ)
    if (this.controlsManager?.orbitControls) {
      this.controlsManager.orbitControls.target.set(camLookX, camLookY, camLookZ)
      this.controlsManager.orbitControls.update()
    }
  }
  
  updateModelExhibit(exhibitId, params) {
    const cfg = modelExhibitsConfig.modelExhibits?.find(e => e.id === exhibitId)
    if (!cfg) return
    
    // 更新配置
    cfg.position = [params.positionX, params.positionY, params.positionZ]
    cfg.rotation = [params.rotationX, params.rotationY, params.rotationZ]
    cfg.scale = [params.scaleX, params.scaleY, params.scaleZ]
    
    // 更新场景中的 3D 模型
    const scene3D = this.scene.userData.scene3D
    if (scene3D?.modelExhibitMeshes) {
      const mesh = scene3D.modelExhibitMeshes.find(
        m => m.userData?.modelExhibitConfig?.id === exhibitId
      )
      if (mesh) {
        mesh.position.set(params.positionX, params.positionY, params.positionZ)
        mesh.rotation.set(params.rotationX, params.rotationY, params.rotationZ)
        mesh.scale.set(params.scaleX, params.scaleY, params.scaleZ)
      }
    }
    
    // 更新交互系统
    const interactionSystem = this.scene.userData.interactionSystem
    if (interactionSystem) {
      interactionSystem.exhibits = loadExhibits()
    }
  }
  
  setupExhibitEditors() {
    // 移除旧的编辑器
    this.removeExhibitEditors()
    
    const exhibitFolder = this.gui.children.find(f => f._title === '展品位置')
    if (!exhibitFolder) return
    
    // 获取所有原始展品配置（去重，因为 loadExhibits 会展开多位置展品）
    const uniqueExhibitIds = new Set()
    const exhibits = loadExhibits()
    exhibits.forEach(exhibit => {
      if (exhibit.id && !uniqueExhibitIds.has(exhibit.id)) {
        uniqueExhibitIds.add(exhibit.id)
      }
    })
    
    // 为每个展品创建编辑器
    uniqueExhibitIds.forEach(exhibitId => {
      const originalExhibit = getExhibitById(exhibitId)
      if (!originalExhibit) return
      
      const exhibitName = originalExhibit.name || originalExhibit.id
      const exhibitEditorFolder = exhibitFolder.addFolder(`${exhibitName} (${originalExhibit.floor}层)`)
      
      if (originalExhibit.bounds) {
        // 包围盒编辑器
        this.setupBoundsEditor(exhibitEditorFolder, originalExhibit, exhibitId)
      } else if (originalExhibit.position) {
        // 位置+半径编辑器
        this.setupPositionEditor(exhibitEditorFolder, originalExhibit, exhibitId)
      }
      
      // 相机/导航配置
      this.setupExhibitCameraEditor(exhibitEditorFolder, originalExhibit, exhibitId)
      
      this.exhibitEditorFolders.push(exhibitEditorFolder)
    })
  }
  
  setupBoundsEditor(folder, exhibit, exhibitId) {
    let boundsParams = {}
    
    if (exhibit.bounds.center && exhibit.bounds.size) {
      // center + size 格式
      boundsParams = {
        centerX: exhibit.bounds.center[0],
        centerY: exhibit.bounds.center[1],
        centerZ: exhibit.bounds.center[2],
        sizeX: exhibit.bounds.size[0],
        sizeY: exhibit.bounds.size[1],
        sizeZ: exhibit.bounds.size[2]
      }
      
      folder
        .add(boundsParams, 'centerX', -50, 50, 0.01)
        .name('中心 X')
        .onChange(() => this.updateExhibit(exhibitId, boundsParams, 'bounds-center-size'))
      
      folder
        .add(boundsParams, 'centerY', -50, 50, 0.01)
        .name('中心 Y')
        .onChange(() => this.updateExhibit(exhibitId, boundsParams, 'bounds-center-size'))
      
      folder
        .add(boundsParams, 'centerZ', -50, 50, 0.01)
        .name('中心 Z')
        .onChange(() => this.updateExhibit(exhibitId, boundsParams, 'bounds-center-size'))
      
      folder
        .add(boundsParams, 'sizeX', 0.1, 50, 0.01)
        .name('宽度')
        .onChange(() => this.updateExhibit(exhibitId, boundsParams, 'bounds-center-size'))
      
      folder
        .add(boundsParams, 'sizeY', 0.1, 50, 0.01)
        .name('高度')
        .onChange(() => this.updateExhibit(exhibitId, boundsParams, 'bounds-center-size'))
      
      folder
        .add(boundsParams, 'sizeZ', 0.1, 50, 0.01)
        .name('深度')
        .onChange(() => this.updateExhibit(exhibitId, boundsParams, 'bounds-center-size'))
    } else if (exhibit.bounds.min && exhibit.bounds.max) {
      // min + max 格式
      boundsParams = {
        minX: exhibit.bounds.min[0],
        minY: exhibit.bounds.min[1],
        minZ: exhibit.bounds.min[2],
        maxX: exhibit.bounds.max[0],
        maxY: exhibit.bounds.max[1],
        maxZ: exhibit.bounds.max[2]
      }
      
      folder
        .add(boundsParams, 'minX', -50, 50, 0.01)
        .name('最小 X')
        .onChange(() => this.updateExhibit(exhibitId, boundsParams, 'bounds-min-max'))
      
      folder
        .add(boundsParams, 'minY', -50, 50, 0.01)
        .name('最小 Y')
        .onChange(() => this.updateExhibit(exhibitId, boundsParams, 'bounds-min-max'))
      
      folder
        .add(boundsParams, 'minZ', -50, 50, 0.01)
        .name('最小 Z')
        .onChange(() => this.updateExhibit(exhibitId, boundsParams, 'bounds-min-max'))
      
      folder
        .add(boundsParams, 'maxX', -50, 50, 0.01)
        .name('最大 X')
        .onChange(() => this.updateExhibit(exhibitId, boundsParams, 'bounds-min-max'))
      
      folder
        .add(boundsParams, 'maxY', -50, 50, 0.01)
        .name('最大 Y')
        .onChange(() => this.updateExhibit(exhibitId, boundsParams, 'bounds-min-max'))
      
      folder
        .add(boundsParams, 'maxZ', -50, 50, 0.01)
        .name('最大 Z')
        .onChange(() => this.updateExhibit(exhibitId, boundsParams, 'bounds-min-max'))
    }
  }
  
  setupExhibitCameraEditor(folder, exhibit, exhibitId) {
    const camPos = exhibit.cameraPosition || [0, 0, 0]
    const camLook = exhibit.cameraLookAt || [0, 0, 0]
    const cameraParams = {
      camPosX: camPos[0],
      camPosY: camPos[1],
      camPosZ: camPos[2],
      camLookX: camLook[0],
      camLookY: camLook[1],
      camLookZ: camLook[2]
    }
    const cameraFolder = folder.addFolder('导航相机')
    cameraFolder.add(cameraParams, 'camPosX', -50, 50, 0.01).name('相机位置 X').onChange(() => this.updateExhibit(exhibitId, cameraParams, 'camera'))
    cameraFolder.add(cameraParams, 'camPosY', -50, 50, 0.01).name('相机位置 Y').onChange(() => this.updateExhibit(exhibitId, cameraParams, 'camera'))
    cameraFolder.add(cameraParams, 'camPosZ', -50, 50, 0.01).name('相机位置 Z').onChange(() => this.updateExhibit(exhibitId, cameraParams, 'camera'))
    cameraFolder.add(cameraParams, 'camLookX', -50, 50, 0.01).name('朝向目标 X').onChange(() => this.updateExhibit(exhibitId, cameraParams, 'camera'))
    cameraFolder.add(cameraParams, 'camLookY', -50, 50, 0.01).name('朝向目标 Y').onChange(() => this.updateExhibit(exhibitId, cameraParams, 'camera'))
    cameraFolder.add(cameraParams, 'camLookZ', -50, 50, 0.01).name('朝向目标 Z').onChange(() => this.updateExhibit(exhibitId, cameraParams, 'camera'))
  }
  
  setupPositionEditor(folder, exhibit, exhibitId) {
    const positionParams = {
      positionX: exhibit.position[0],
      positionY: exhibit.position[1],
      positionZ: exhibit.position[2],
      interactionRadius: exhibit.interactionRadius || config.interactionDistance || 3.0
    }
    
    folder
      .add(positionParams, 'positionX', -50, 50, 0.01)
      .name('位置 X')
      .onChange(() => this.updateExhibit(exhibitId, positionParams, 'position'))
    
    folder
      .add(positionParams, 'positionY', -50, 50, 0.01)
      .name('位置 Y')
      .onChange(() => this.updateExhibit(exhibitId, positionParams, 'position'))
    
    folder
      .add(positionParams, 'positionZ', -50, 50, 0.01)
      .name('位置 Z')
      .onChange(() => this.updateExhibit(exhibitId, positionParams, 'position'))
    
    folder
      .add(positionParams, 'interactionRadius', 0.1, 10, 0.1)
      .name('交互半径')
      .onChange(() => this.updateExhibit(exhibitId, positionParams, 'position'))
  }
  
  updateExhibit(exhibitId, params, type) {
    // 找到原始展品配置
    const exhibitIndex = exhibitsConfig.exhibits.findIndex(e => e.id === exhibitId)
    if (exhibitIndex === -1) return
    
    const exhibit = exhibitsConfig.exhibits[exhibitIndex]
    
    if (type === 'bounds-center-size') {
      // 更新 center + size 格式
      if (!exhibit.bounds) exhibit.bounds = {}
      exhibit.bounds.center = [params.centerX, params.centerY, params.centerZ]
      exhibit.bounds.size = [params.sizeX, params.sizeY, params.sizeZ]
      // 移除 min/max（如果存在）
      delete exhibit.bounds.min
      delete exhibit.bounds.max
    } else if (type === 'bounds-min-max') {
      // 更新 min + max 格式
      if (!exhibit.bounds) exhibit.bounds = {}
      exhibit.bounds.min = [params.minX, params.minY, params.minZ]
      exhibit.bounds.max = [params.maxX, params.maxY, params.maxZ]
      // 移除 center/size（如果存在）
      delete exhibit.bounds.center
      delete exhibit.bounds.size
    } else if (type === 'position') {
      // 更新 position + interactionRadius
      exhibit.position = [params.positionX, params.positionY, params.positionZ]
      exhibit.interactionRadius = params.interactionRadius
    } else if (type === 'camera') {
      // 更新 cameraPosition + cameraLookAt
      exhibit.cameraPosition = [params.camPosX, params.camPosY, params.camPosZ]
      exhibit.cameraLookAt = [params.camLookX, params.camLookY, params.camLookZ]
      const interactionSystem = this.scene.userData.interactionSystem
      if (interactionSystem) interactionSystem.exhibits = loadExhibits()
      // 实时更新相机位置和朝向
      this.applyCameraPreview(params.camPosX, params.camPosY, params.camPosZ, params.camLookX, params.camLookY, params.camLookZ)
    }
    
    // 更新线框显示（camera 类型无需刷新线框）
    if (type !== 'camera') {
      this.hideExhibitMeshes()
      this.showExhibitMeshes()
    }
    
    // 如果 InteractionSystem 存在，需要重新加载展品
    const interactionSystem = this.scene.userData.interactionSystem
    if (interactionSystem) {
      // 重新加载展品配置
      interactionSystem.exhibits = loadExhibits()
    }
  }
  
  removeExhibitEditors() {
    if (this.exhibitEditorFolders) {
      this.exhibitEditorFolders.forEach(folder => {
        folder.destroy()
      })
      this.exhibitEditorFolders = []
    }
  }
  
  showExhibitMeshes() {
    // 先清除旧的线框
    this.hideExhibitMeshes()
    
    const exhibits = loadExhibits()
    
    exhibits.forEach((exhibit, index) => {
      let mesh = null
      
      if (exhibit.bounds) {
        // 使用包围盒创建线框
        let min, max
        if (exhibit.bounds.center && exhibit.bounds.size) {
          const halfSize = new THREE.Vector3(...exhibit.bounds.size).multiplyScalar(0.5)
          const center = new THREE.Vector3(...exhibit.bounds.center)
          min = center.clone().sub(halfSize)
          max = center.clone().add(halfSize)
        } else if (exhibit.bounds.min && exhibit.bounds.max) {
          min = new THREE.Vector3(...exhibit.bounds.min)
          max = new THREE.Vector3(...exhibit.bounds.max)
        } else {
          return // 无效的 bounds
        }
        
        // 创建包围盒线框
        const box = new THREE.Box3(min, max)
        const size = box.getSize(new THREE.Vector3())
        const center = box.getCenter(new THREE.Vector3())
        
        const boxGeometry = new THREE.BoxGeometry(size.x, size.y, size.z)
        const boxMaterial = new THREE.MeshBasicMaterial({
          color: 0x00ff00, // 绿色
          wireframe: true,
          transparent: true,
          opacity: 0.6
        })
        mesh = new THREE.Mesh(boxGeometry, boxMaterial)
        mesh.position.copy(center)
      } else if (exhibit.position) {
        // 使用位置和交互半径创建线框
        const position = new THREE.Vector3(...exhibit.position)
        const radius = exhibit.interactionRadius || config.interactionDistance || 3.0
        
        // 创建球体线框
        const sphereGeometry = new THREE.SphereGeometry(radius, 16, 16)
        const sphereMaterial = new THREE.MeshBasicMaterial({
          color: 0x00ff00, // 绿色
          wireframe: true,
          transparent: true,
          opacity: 0.6
        })
        mesh = new THREE.Mesh(sphereGeometry, sphereMaterial)
        mesh.position.copy(position)
      } else {
        return // 没有有效的位置信息
      }
      
      // 添加展品信息到 userData
      mesh.userData.exhibit = exhibit
      mesh.userData.exhibitIndex = index
      
      // 添加标签（显示展品名称）
      if (exhibit.name || exhibit.id) {
        const label = this.createExhibitLabel(exhibit.name || exhibit.id, exhibit.floor)
        mesh.add(label)
      }
      
      this.scene.add(mesh)
      this.debugObjects.exhibitMeshes.push(mesh)
    })
  }
  
  hideExhibitMeshes() {
    this.debugObjects.exhibitMeshes.forEach(mesh => {
      // 清理标签
      if (mesh.children) {
        mesh.children.forEach(child => {
          if (child.geometry) child.geometry.dispose()
          if (child.material) {
            if (child.material.map) child.material.map.dispose()
            child.material.dispose()
          }
        })
      }
      
      // 清理线框
      if (mesh.geometry) mesh.geometry.dispose()
      if (mesh.material) {
        if (mesh.material.map) mesh.material.map.dispose()
        mesh.material.dispose()
      }
      
      this.scene.remove(mesh)
    })
    this.debugObjects.exhibitMeshes = []
  }
  
  createExhibitLabel(text, floor) {
    const canvas = document.createElement('canvas')
    const context = canvas.getContext('2d')
    canvas.width = 256
    canvas.height = 64
    
    // 背景
    context.fillStyle = 'rgba(0, 0, 0, 0.7)'
    context.fillRect(0, 0, canvas.width, canvas.height)
    
    // 文字
    context.font = 'Bold 24px Arial'
    context.fillStyle = '#ffffff'
    context.textAlign = 'center'
    context.textBaseline = 'middle'
    context.fillText(text, canvas.width / 2, canvas.height / 2)
    
    // 楼层信息
    if (floor) {
      context.font = '16px Arial'
      context.fillStyle = '#00ff00'
      context.fillText(`${floor}层`, canvas.width / 2, canvas.height / 2 + 20)
    }
    
    const texture = new THREE.CanvasTexture(canvas)
    texture.needsUpdate = true
    
    const spriteMaterial = new THREE.SpriteMaterial({
      map: texture,
      transparent: true
    })
    
    const sprite = new THREE.Sprite(spriteMaterial)
    sprite.scale.set(2, 0.5, 1)
    sprite.position.set(0, 1, 0) // 在展品上方
    
    return sprite
  }
  
  setupCollisionEditors() {
    if (!this.collisionSystem) return
    
    // 移除旧的编辑器
    this.removeCollisionEditors()
    
    const collisionFolder = this.gui.children.find(f => f._title === '碰撞检测')
    if (!collisionFolder) return
    
    const configs = this.collisionSystem.getAllCollisionConfigs()
    
    configs.forEach((config, index) => {
      const configFolder = collisionFolder.addFolder(`${config.type === 'box' ? '盒子' : '球体'} ${index + 1} (${config.floor}层)`)
      const refresh = () => {
        this.collisionSystem.refreshFromConfigs()
        this.hideCollisionMeshes()
        this.showCollisionMeshes()
      }
      
      // 直接显示配置项，不转换
      if (config.bounds) {
        const b = config.bounds
        if (b.center && b.size) {
          // bounds: { center, size }
          configFolder.add(b.center, '0', -50, 50, 0.01).name('center X').onChange(refresh)
          configFolder.add(b.center, '1', -50, 50, 0.01).name('center Y').onChange(refresh)
          configFolder.add(b.center, '2', -50, 50, 0.01).name('center Z').onChange(refresh)
          configFolder.add(b.size, '0', 0.01, 50, 0.01).name('size 宽').onChange(refresh)
          configFolder.add(b.size, '1', 0.01, 50, 0.01).name('size 高').onChange(refresh)
          configFolder.add(b.size, '2', 0.01, 50, 0.01).name('size 深').onChange(refresh)
        } else if (b.min && b.max) {
          // bounds: { min, max }
          configFolder.add(b.min, '0', -50, 50, 0.01).name('min X').onChange(refresh)
          configFolder.add(b.min, '1', -50, 50, 0.01).name('min Y').onChange(refresh)
          configFolder.add(b.min, '2', -50, 50, 0.01).name('min Z').onChange(refresh)
          configFolder.add(b.max, '0', -50, 50, 0.01).name('max X').onChange(refresh)
          configFolder.add(b.max, '1', -50, 50, 0.01).name('max Y').onChange(refresh)
          configFolder.add(b.max, '2', -50, 50, 0.01).name('max Z').onChange(refresh)
        }
      } else if (config.position && config.size !== undefined) {
        // position + size
        configFolder.add(config.position, '0', -50, 50, 0.01).name('position X').onChange(refresh)
        configFolder.add(config.position, '1', -50, 50, 0.01).name('position Y').onChange(refresh)
        configFolder.add(config.position, '2', -50, 50, 0.01).name('position Z').onChange(refresh)
        if (config.type === 'sphere') {
          configFolder.add(config, 'size', 0.1, 50, 0.01).name('半径').onChange(refresh)
        } else {
          configFolder.add(config.size, '0', 0.01, 50, 0.01).name('size 宽').onChange(refresh)
          configFolder.add(config.size, '1', 0.01, 50, 0.01).name('size 高').onChange(refresh)
          configFolder.add(config.size, '2', 0.01, 50, 0.01).name('size 深').onChange(refresh)
        }
      }
      
      // 存储文件夹引用，以便后续移除
      if (!this.collisionEditorFolders) {
        this.collisionEditorFolders = []
      }
      this.collisionEditorFolders.push(configFolder)
    })
  }
  
  removeCollisionEditors() {
    if (this.collisionEditorFolders) {
      this.collisionEditorFolders.forEach(folder => {
        folder.destroy()
      })
      this.collisionEditorFolders = []
    }
  }
  
  updateCollision() {
    if (!this.collisionSystem) return
    this.collisionSystem.refreshFromConfigs()
    this.hideCollisionMeshes()
    this.showCollisionMeshes()
  }
  
  setupModelControls() {
    const modelFolder = this.gui.addFolder('模型坐标轴')
    
    // 获取场景中的模型
    const scene3D = this.scene.userData.scene3D
    if (!scene3D || !scene3D.model) {
      modelFolder.add({ note: '模型未加载' }, 'note').name('提示').disable()
      return
    }
    
    const modelParams = {
      positionX: scene3D.model.position.x,
      positionY: scene3D.model.position.y,
      positionZ: scene3D.model.position.z,
      // 实时显示信息
      centerX: 0,
      centerY: 0,
      centerZ: 0,
      sizeX: 0,
      sizeY: 0,
      sizeZ: 0,
      // 对齐选项
      alignX: true,
      alignZ: true,
      alignYBottom: true
    }
    
    // 模型位置控制
    modelFolder
      .add(modelParams, 'positionX', -50, 50, 0.01)
      .name('位置 X')
      .onChange((value) => {
        if (scene3D.model) {
          scene3D.model.position.x = value
          scene3D.model.updateMatrixWorld(true)
          // 重新计算边界框
          const box = new THREE.Box3().setFromObject(scene3D.model)
          scene3D.modelCenter = box.getCenter(new THREE.Vector3())
          scene3D.modelSize = box.getSize(new THREE.Vector3())
        }
      })
    
    modelFolder
      .add(modelParams, 'positionY', -50, 50, 0.01)
      .name('位置 Y')
      .onChange((value) => {
        if (scene3D.model) {
          scene3D.model.position.y = value
          scene3D.model.updateMatrixWorld(true)
          // 重新计算边界框
          const box = new THREE.Box3().setFromObject(scene3D.model)
          scene3D.modelCenter = box.getCenter(new THREE.Vector3())
          scene3D.modelSize = box.getSize(new THREE.Vector3())
        }
      })
    
    modelFolder
      .add(modelParams, 'positionZ', -50, 50, 0.01)
      .name('位置 Z')
      .onChange((value) => {
        if (scene3D.model) {
          scene3D.model.position.z = value
          scene3D.model.updateMatrixWorld(true)
          // 重新计算边界框
          const box = new THREE.Box3().setFromObject(scene3D.model)
          scene3D.modelCenter = box.getCenter(new THREE.Vector3())
          scene3D.modelSize = box.getSize(new THREE.Vector3())
        }
      })
    
    // 实时显示模型信息（只读）
    modelFolder
      .add(modelParams, 'centerX')
      .name('中心点 X')
      .listen()
      .disable()
    
    modelFolder
      .add(modelParams, 'centerY')
      .name('中心点 Y')
      .listen()
      .disable()
    
    modelFolder
      .add(modelParams, 'centerZ')
      .name('中心点 Z')
      .listen()
      .disable()
    
    modelFolder
      .add(modelParams, 'sizeX')
      .name('尺寸 X')
      .listen()
      .disable()
    
    modelFolder
      .add(modelParams, 'sizeY')
      .name('尺寸 Y')
      .listen()
      .disable()
    
    modelFolder
      .add(modelParams, 'sizeZ')
      .name('尺寸 Z')
      .listen()
      .disable()
    
    // 对齐选项
    const alignFolder = modelFolder.addFolder('对齐选项')
    
    alignFolder
      .add(modelParams, 'alignX')
      .name('X轴中心对齐')
    
    alignFolder
      .add(modelParams, 'alignZ')
      .name('Z轴中心对齐')
    
    alignFolder
      .add(modelParams, 'alignYBottom')
      .name('Y轴底部对齐')
    
    // 对齐按钮
    modelFolder.add({
      alignModel: () => {
        if (scene3D && scene3D.realignModel) {
          scene3D.realignModel(
            modelParams.alignX,
            modelParams.alignZ,
            modelParams.alignYBottom
          )
          // 更新位置参数
          if (scene3D.model) {
            modelParams.positionX = scene3D.model.position.x
            modelParams.positionY = scene3D.model.position.y
            modelParams.positionZ = scene3D.model.position.z
          }
        }
      }
    }, 'alignModel').name('执行对齐')
    
    // 重置按钮
    modelFolder.add({
      resetModel: () => {
        if (scene3D && scene3D.model) {
          scene3D.model.position.set(0, 0, 0)
          scene3D.model.updateMatrixWorld(true)
          // 重新计算边界框
          const box = new THREE.Box3().setFromObject(scene3D.model)
          scene3D.modelCenter = box.getCenter(new THREE.Vector3())
          scene3D.modelSize = box.getSize(new THREE.Vector3())
          // 更新位置参数
          modelParams.positionX = scene3D.model.position.x
          modelParams.positionY = scene3D.model.position.y
          modelParams.positionZ = scene3D.model.position.z
        }
      }
    }, 'resetModel').name('重置位置')
    
    // 实时更新模型信息
    const updateModelInfo = () => {
      if (!this.gui || !scene3D) return
      
      if (scene3D.model) {
        // 更新位置
        modelParams.positionX = scene3D.model.position.x
        modelParams.positionY = scene3D.model.position.y
        modelParams.positionZ = scene3D.model.position.z
        
        // 更新中心点和尺寸
        if (scene3D.modelCenter) {
          modelParams.centerX = scene3D.modelCenter.x.toFixed(3)
          modelParams.centerY = scene3D.modelCenter.y.toFixed(3)
          modelParams.centerZ = scene3D.modelCenter.z.toFixed(3)
        }
        
        if (scene3D.modelSize) {
          modelParams.sizeX = scene3D.modelSize.x.toFixed(3)
          modelParams.sizeY = scene3D.modelSize.y.toFixed(3)
          modelParams.sizeZ = scene3D.modelSize.z.toFixed(3)
        }
      }
      
      requestAnimationFrame(updateModelInfo)
    }
    
    updateModelInfo()
  }
  
  setupPerformanceControls() {
    const perfFolder = this.gui.addFolder('性能')
    
    const perfParams = {
      currentFPS: 0
    }
    
    let frameCount = 0
    let lastTime = performance.now()
    
    const updateFPS = () => {
      frameCount++
      const currentTime = performance.now()
      if (currentTime >= lastTime + 1000) {
        perfParams.currentFPS = frameCount
        frameCount = 0
        lastTime = currentTime
      }
      if (this.gui) {
        requestAnimationFrame(updateFPS)
      }
    }
    
    perfFolder
      .add(perfParams, 'currentFPS')
      .name('当前帧率 (FPS)')
      .listen()
      .disable()
    
    updateFPS()
  }
  
  // 创建带标签的坐标轴辅助器
  createAxesHelperWithLabels(size = 10) {
    const axesHelper = new THREE.AxesHelper(size)
    
    // 创建标签组
    const labels = []
    
    // 创建文本纹理的函数
    const createTextSprite = (text, color) => {
      const canvas = document.createElement('canvas')
      const context = canvas.getContext('2d')
      canvas.width = 64
      canvas.height = 64
      
      context.fillStyle = 'rgba(0, 0, 0, 0)'
      context.fillRect(0, 0, canvas.width, canvas.height)
      
      context.font = 'Bold 48px Arial'
      context.fillStyle = color
      context.textAlign = 'center'
      context.textBaseline = 'middle'
      context.fillText(text, canvas.width / 2, canvas.height / 2)
      
      const texture = new THREE.CanvasTexture(canvas)
      texture.needsUpdate = true
      
      const spriteMaterial = new THREE.SpriteMaterial({
        map: texture,
        transparent: true
      })
      
      const sprite = new THREE.Sprite(spriteMaterial)
      sprite.scale.set(2, 2, 1)
      
      return sprite
    }
    
    // X轴标签（红色）
    const xLabel = createTextSprite('X', '#ff0000')
    xLabel.position.set(size + 1, 0, 0)
    // 将标签添加到坐标轴辅助器的子对象中，使其跟随坐标轴移动
    axesHelper.add(xLabel)
    labels.push(xLabel)
    
    // Y轴标签（绿色）
    const yLabel = createTextSprite('Y', '#00ff00')
    yLabel.position.set(0, size + 1, 0)
    axesHelper.add(yLabel)
    labels.push(yLabel)
    
    // Z轴标签（蓝色）
    const zLabel = createTextSprite('Z', '#0000ff')
    zLabel.position.set(0, 0, size + 1)
    axesHelper.add(zLabel)
    labels.push(zLabel)
    
    // 标签已经添加到坐标轴辅助器中，不需要单独添加到场景
    // 存储标签引用
    this.debugObjects.axesLabels = labels
    
    return axesHelper
  }
  
  showCollisionMeshes() {
    if (!this.collisionSystem) return
    
    const meshes = this.collisionSystem.getDebugMeshes()
    meshes.forEach(mesh => {
      this.scene.add(mesh)
      this.debugObjects.collisionMeshes.push(mesh)
    })
  }
  
  hideCollisionMeshes() {
    this.debugObjects.collisionMeshes.forEach(mesh => {
      this.scene.remove(mesh)
      mesh.geometry.dispose()
      mesh.material.dispose()
    })
    this.debugObjects.collisionMeshes = []
  }
  
  // ─────────────────────────────────────────────────────────────────────────
  //  路线导航控制面板
  // ─────────────────────────────────────────────────────────────────────────

  setupPathControls() {
    const pn = this.pathNavigator
    if (!pn) return

    const pathFolder = this.gui.addFolder('路线导航')
    pathFolder.close()

    const globalState = {
      enabled:     pn.enabled,
      clickFollow: pn.clickFollow,
      exportConfig: () => {
        const out = { enabled: globalState.enabled, clickFollow: globalState.clickFollow, floors: {} }
        for (const floor of [1, 2]) {
          out.floors[floor] = {
            waypoints:   pn.getWaypoints(floor),
            parents:     pn.getParents(floor),
            loop:        pn.getLoop(floor),
            connections: pn.getConnections(floor)
          }
        }
        console.log(
          '%c[路线配置] 复制以下内容替换 src/config/paths.js 中的 export default 对象:',
          'color:#ffff00;background:#333;padding:2px 6px'
        )
        console.log(JSON.stringify(out, null, 2))
      }
    }

    pathFolder
      .add(globalState, 'enabled')
      .name('展品导航沿路线行进')
      .onChange(v => { pn.enabled = v })

    pathFolder
      .add(globalState, 'clickFollow')
      .name('点击移动按路线节点')
      .onChange(v => { pn.clickFollow = v })

    pathFolder
      .add(globalState, 'exportConfig')
      .name('📋 导出路线配置到控制台')

    for (const floor of [1, 2]) {
      this._setupFloorPathControls(pathFolder, floor)
    }
  }

  /**
   * 为单个楼层创建路线编辑子面板
   * @param {object} parentFolder  lil-gui Folder
   * @param {number} floor
   */
  _setupFloorPathControls(parentFolder, floor) {
    const pn = this.pathNavigator
    const floorName = floor === 1 ? '一层' : '二层'
    const floorFolder = parentFolder.addFolder(`${floorName}路线`)
    floorFolder.close()

    // 路点列表子文件夹（动态重建）
    const waypointListFolder = floorFolder.addFolder('路点列表')
    waypointListFolder.close()

    const floorState = {
      showPath: pn.isVisible(floor),

      addWaypoint: () => {
        const pos = this.camera.position
        pn.addWaypoint(floor, pos.x, pos.z)
        this._rebuildWaypointList(floor, waypointListFolder)
      },

      removeLastWaypoint: () => {
        const wps = pn.getWaypoints(floor)
        if (wps.length > 0) {
          pn.removeWaypoint(floor, wps.length - 1)
          this._rebuildWaypointList(floor, waypointListFolder)
        }
      },

      clearAll: () => {
        const wps = pn.getWaypoints(floor)
        for (let i = wps.length - 1; i >= 0; i--) {
          pn.removeWaypoint(floor, i)
        }
        this._rebuildWaypointList(floor, waypointListFolder)
      }
    }

    floorFolder
      .add(floorState, 'showPath')
      .name('显示路线（黄色）')
      .onChange(v => { pn.setVisible(floor, v) })

    // 环形路线开关
    const loopState = { loop: pn.getLoop(floor) }
    floorFolder
      .add(loopState, 'loop')
      .name('环形路线（首尾相连）')
      .onChange(v => { pn.setLoop(floor, v) })

    floorFolder
      .add(floorState, 'addWaypoint')
      .name('➕ 在当前位置追加路点')

    floorFolder
      .add(floorState, 'removeLastWaypoint')
      .name('➖ 删除最后一个路点')

    floorFolder
      .add(floorState, 'clearAll')
      .name('🗑 清空所有路点')

    // 清空树状父节点配置
    const parentsActions = {
      clearParents: () => {
        pn.clearParents(floor)
        this._rebuildWaypointList(floor, waypointListFolder)
      }
    }
    floorFolder
      .add(parentsActions, 'clearParents')
      .name('🔀 清空父节点（恢复线性/connections）')

    // 连接管理（connections）
    this._setupConnectionsControls(floorFolder, floor)

    // 初始构建路点列表
    this._rebuildWaypointList(floor, waypointListFolder)
  }

  /**
   * 清空并重建指定楼层的路点编辑列表
   * @param {number} floor
   * @param {object} listFolder  lil-gui Folder（路点列表容器）
   */
  _rebuildWaypointList(floor, listFolder) {
    const pn = this.pathNavigator

    // 销毁所有现有子项
    ;[...listFolder.children].forEach(c => c.destroy())

    const wps = pn.getWaypoints(floor)
    if (wps.length === 0) {
      const placeholder = { tip: '暂无路点，请先添加' }
      listFolder.add(placeholder, 'tip').name('').disable()
      return
    }

    const parents = pn.getParents(floor)

    for (let i = 0; i < wps.length; i++) {
      // 路点 XZ + 父节点编辑器（每个路点一个子文件夹）
      const wpFolder = listFolder.addFolder(`路点 ${i + 1}  [${wps[i][0].toFixed(2)}, ${wps[i][1].toFixed(2)}]`)
      wpFolder.close()

      const wpState = {
        x: wps[i][0],
        z: wps[i][1],
        // -1 = 根节点（无父）；0..n-1 = 父路点索引
        parentIdx: (Array.isArray(parents) && typeof parents[i] === 'number') ? parents[i] : -1
      }

      wpFolder
        .add(wpState, 'x', -50, 50, 0.01)
        .name('X')
        .onChange(v => {
          pn.updateWaypoint(floor, i, v, wpState.z)
          wpFolder.title(`路点 ${i + 1}  [${v.toFixed(2)}, ${wpState.z.toFixed(2)}]`)
        })

      wpFolder
        .add(wpState, 'z', -50, 50, 0.01)
        .name('Z')
        .onChange(v => {
          pn.updateWaypoint(floor, i, wpState.x, v)
          wpFolder.title(`路点 ${i + 1}  [${wpState.x.toFixed(2)}, ${v.toFixed(2)}]`)
        })

      // 父路点选择：-1 = 根节点；0..n-1 = 连向哪个路点（双向边）
      wpFolder
        .add(wpState, 'parentIdx', -1, wps.length - 1, 1)
        .name('父路点（-1=根节点）')
        .onChange(v => {
          pn.setParent(floor, i, Math.round(v) < 0 ? null : Math.round(v))
        })
    }
  }

  /**
   * 为单个楼层创建 connections（自定义连接关系）编辑面板。
   *
   * 当 connections 为 null / 空时，路网使用相邻路点自动连接（线性链）。
   * 当 connections 有内容时，路网仅按指定连接路由，顺序折线不再生效。
   *
   * 面板提供：
   *   - 当前连接列表（可逐条删除）
   *   - 添加新连接（输入两个路点索引）
   *   - 一键清空（恢复自动连接）
   *
   * @param {object} floorFolder  lil-gui Folder（楼层文件夹）
   * @param {number} floor
   */
  _setupConnectionsControls(floorFolder, floor) {
    const pn = this.pathNavigator

    const connFolder = floorFolder.addFolder('自定义连接（connections）')
    connFolder.close()

    // 说明：帮助用户理解 null 与自定义连接的区别
    const note = { desc: '空 = 相邻路点自动连接线性链；有内容 = 仅按指定边路由（替换线性链）' }
    connFolder.add(note, 'desc').name('说明').disable()

    // 已有连接列表（动态重建）
    const connListFolder = connFolder.addFolder('已有连接')
    connListFolder.close()
    this._rebuildConnectionsList(floor, connListFolder)

    // 添加连接：两个索引输入 + 按钮
    const addState = { fromIdx: 0, toIdx: 1 }
    connFolder.add(addState, 'fromIdx', 0, 99, 1).name('起点索引（0 起）')
    connFolder.add(addState, 'toIdx',   0, 99, 1).name('终点索引（0 起）')

    const actions = {
      add: () => {
        const wps = pn.getWaypoints(floor)
        const a = Math.round(addState.fromIdx)
        const b = Math.round(addState.toIdx)
        if (a === b || a < 0 || b < 0 || a >= wps.length || b >= wps.length) return
        pn.addConnection(floor, a, b)
        this._rebuildConnectionsList(floor, connListFolder)
      },
      clearAll: () => {
        pn.clearConnections(floor)
        this._rebuildConnectionsList(floor, connListFolder)
      }
    }

    connFolder.add(actions, 'add').name('➕ 添加上方连接')
    connFolder.add(actions, 'clearAll').name('🗑 清空所有（恢复自动连接）')
  }

  /**
   * 清空并重建指定楼层的连接列表 UI。
   * 每次 connections 数组变化后调用，确保 UI 与数据同步。
   *
   * @param {number} floor
   * @param {object} listFolder  lil-gui Folder（已有连接容器）
   */
  _rebuildConnectionsList(floor, listFolder) {
    const pn = this.pathNavigator
    ;[...listFolder.children].forEach(c => c.destroy())

    const conns = pn.getConnections(floor)
    if (!conns || conns.length === 0) {
      const ph = { tip: '无（使用相邻路点自动连接）' }
      listFolder.add(ph, 'tip').name('').disable()
      return
    }

    for (let i = 0; i < conns.length; i++) {
      const [a, b] = conns[i]
      const capturedIdx = i // 捕获当前索引，避免重建后闭包失效
      const rowFolder = listFolder.addFolder(`#${i + 1}  路点${a + 1} ↔ 路点${b + 1}`)
      rowFolder.close()
      const rowState = {
        remove: () => {
          pn.removeConnection(floor, capturedIdx)
          this._rebuildConnectionsList(floor, listFolder)
        }
      }
      rowFolder.add(rowState, 'remove').name('🗑 删除此连接')
    }
  }

  dispose() {
    // 清理调试对象
    if (this.debugObjects.gridHelper) {
      this.scene.remove(this.debugObjects.gridHelper)
      this.debugObjects.gridHelper = null
    }
    
    if (this.debugObjects.axesHelper) {
      this.scene.remove(this.debugObjects.axesHelper)
      this.debugObjects.axesHelper = null
    }
    
    // 清理坐标轴标签
    if (this.debugObjects.axesLabels) {
      this.debugObjects.axesLabels.forEach(label => {
        this.scene.remove(label)
        label.geometry.dispose()
        label.material.dispose()
        if (label.material.map) {
          label.material.map.dispose()
        }
      })
      this.debugObjects.axesLabels = []
    }
    
    this.hideCollisionMeshes()
    
    this.hideExhibitMeshes()
    
    this.removeExhibitEditors()
    
    // 销毁GUI
    if (this.gui) {
      this.gui.destroy()
      this.gui = null
    }
  }
}

