/**
 * Three.js场景初始化
 */
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js'
import config from '@/config/config.js'
import { loadModelExhibits as getModelExhibitsConfig } from '@/utils/configLoader.js'
import { isMobileDevice } from '@/utils/threejs/mobile.js'

/** 创建已配置 DRACOLoader 的 GLTFLoader（支持 Draco 压缩模型） */
function createGLTFLoader() {
  const loader = new GLTFLoader()
  const dracoLoader = new DRACOLoader()
  // 使用本地 decoder，避免网络依赖（文件来自 node_modules/three/examples/jsm/libs/draco/）
  dracoLoader.setDecoderPath('/draco/')
  loader.setDRACOLoader(dracoLoader)
  return loader
}

export class Scene3D {
  constructor(container) {
    this.container = container
    this.scene = null
    this.camera = null
    this.renderer = null
    this.model = null
    this.loadingProgress = 0
    this.orbitControls = null
    this.modelCenter = null
    this.modelSize = null
    this.raycaster = new THREE.Raycaster()
    this.pointer = new THREE.Vector2()
    this.modelExhibitMeshes = [] // 已加载的模型展品对象
    
    this.init()
  }
  
  /**
   * 检查 WebGL 支持
   * @returns {boolean} 是否支持 WebGL
   */
  checkWebGLSupport() {
    try {
      // 检查浏览器是否支持 WebGL
      const canvas = document.createElement('canvas')
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl')
      
      if (!gl) {
        console.warn('浏览器不支持 WebGL')
        return false
      }
      
      // 检查 WebGL 上下文是否有效
      const debugInfo = gl.getExtension('WEBGL_debug_renderer_info')
      if (debugInfo) {
        const vendor = gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL)
        const renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL)
        console.log('WebGL 信息:', { vendor, renderer })
        
        // 检查是否被禁用
        if (vendor === 'Disabled' || renderer === 'Disabled') {
          console.warn('WebGL 已被禁用')
          return false
        }
      }
      
      return true
    } catch (error) {
      console.error('WebGL 支持检查失败:', error)
      return false
    }
  }
  
  init() {
    // 检查 WebGL 支持
    if (!this.checkWebGLSupport()) {
      throw new Error('WebGL 不可用。请检查浏览器设置，确保 WebGL 已启用且硬件加速已开启。')
    }
    
    // 创建场景
    this.scene = new THREE.Scene()
    this.scene.background = new THREE.Color(config.scene.backgroundColor)
    
    // 添加雾效（如果启用）
    if (config.scene.fog.enabled) {
      this.scene.fog = new THREE.Fog(
        config.scene.fog.color,
        config.scene.fog.near,
        config.scene.fog.far
      )
    }
    
    // 创建相机
    const aspect = this.container.clientWidth / this.container.clientHeight
    this.camera = new THREE.PerspectiveCamera(
      config.camera.fov,
      aspect,
      config.camera.near,
      config.camera.far
    )
    this.camera.position.set(...config.camera.externalPosition)
    
    // 移动端性能模式：降低画质以提升帧率
    const isMobile = isMobileDevice()
    const usePerformanceMode = config.mobile?.enabled && isMobile && (config.mobile.performanceMode ?? true)

    // 创建渲染器（添加错误处理）
    try {
      this.renderer = new THREE.WebGLRenderer({
        antialias: !usePerformanceMode,
        alpha: true,
        powerPreference: 'high-performance', // 优先使用高性能 GPU
        failIfMajorPerformanceCaveat: false // 即使性能较差也尝试创建
      })

      // 检查渲染器是否成功创建
      if (!this.renderer || !this.renderer.domElement) {
        throw new Error('WebGL 渲染器创建失败')
      }

      // 检查 WebGL 上下文是否有效
      const gl = this.renderer.getContext()
      if (!gl) {
        throw new Error('无法获取 WebGL 上下文')
      }

      this.renderer.setSize(this.container.clientWidth, this.container.clientHeight)
      const pixelRatioLimit = isMobile ? 1.5 : 2
      this.renderer.setPixelRatio(usePerformanceMode ? 1 : Math.min(window.devicePixelRatio, pixelRatioLimit))
      this.renderer.shadowMap.enabled = !usePerformanceMode
      this.renderer.shadowMap.type = usePerformanceMode ? THREE.BasicShadowMap : THREE.PCFSoftShadowMap
      this.renderer.outputColorSpace = THREE.SRGBColorSpace
      
      this.container.appendChild(this.renderer.domElement)
    } catch (error) {
      console.error('WebGL 渲染器初始化失败:', error)
      throw new Error(`WebGL 初始化失败: ${error.message}。请检查：1) 浏览器是否支持 WebGL；2) 硬件加速是否已启用；3) 显卡驱动是否正常。`)
    }
    
    // 添加地面
    this.setupGround()
    
    // 添加光源
    this.setupLights()
    
    // 处理窗口大小变化（保存引用以便 dispose 时移除）
    this._resizeHandler = () => this.onWindowResize()
    window.addEventListener('resize', this._resizeHandler)
  }
  
  setupGround() {
    if (!config.scene.ground.enabled) return
    
    const groundConfig = config.scene.ground
    
    // 创建无限大的地面平面
    const groundGeometry = new THREE.PlaneGeometry(
      groundConfig.size,
      groundConfig.size
    )
    
    // 创建水泥质感材质
    const groundMaterial = new THREE.MeshStandardMaterial({
      color: groundConfig.color,
      roughness: groundConfig.roughness,
      metalness: groundConfig.metalness,
      // 添加一些细节纹理效果（程序化生成）
      flatShading: false
    })
    
    // 创建地面网格
    const ground = new THREE.Mesh(groundGeometry, groundMaterial)
    
    // 旋转地面使其水平（PlaneGeometry默认是垂直的）
    ground.rotation.x = -Math.PI / 2
    
    // 设置地面位置
    ground.position.y = groundConfig.position
    
    // 地面接收阴影
    ground.receiveShadow = true
    
    // 添加到场景
    this.scene.add(ground)
    
    // 存储地面引用（供调试面板使用）
    this.ground = ground
  }
  
  setupLights() {
    this.lights = {}
    const lightingConfig = config.scene.lighting
    
    // 半球光（模拟天空和地面的自然反射，这是自然光照的关键）
    if (lightingConfig.hemisphere.enabled) {
      const hemisphereLight = new THREE.HemisphereLight(
        lightingConfig.hemisphere.skyColor,
        lightingConfig.hemisphere.groundColor,
        lightingConfig.hemisphere.intensity
      )
      hemisphereLight.position.set(0, 10, 0)
      this.scene.add(hemisphereLight)
      this.lights.hemisphere = hemisphereLight
    }
    
    // 环境光（提供基础照明，避免完全黑暗的区域）
    if (lightingConfig.ambient.enabled) {
      const ambientLight = new THREE.AmbientLight(
        lightingConfig.ambient.color,
        lightingConfig.ambient.intensity
      )
      this.scene.add(ambientLight)
      this.lights.ambient = ambientLight
    }
    
    // 方向光（模拟太阳光，产生阴影）
    if (lightingConfig.directional.enabled) {
      const directionalLight = new THREE.DirectionalLight(
        lightingConfig.directional.color,
        lightingConfig.directional.intensity
      )
      directionalLight.position.set(...lightingConfig.directional.position)
      
      if (lightingConfig.directional.castShadow) {
        directionalLight.castShadow = true
        const shadowConfig = lightingConfig.directional.shadow
        directionalLight.shadow.mapSize.width = shadowConfig.mapSize
        directionalLight.shadow.mapSize.height = shadowConfig.mapSize
        directionalLight.shadow.camera.near = shadowConfig.camera.near
        directionalLight.shadow.camera.far = shadowConfig.camera.far
        directionalLight.shadow.camera.left = shadowConfig.camera.left
        directionalLight.shadow.camera.right = shadowConfig.camera.right
        directionalLight.shadow.camera.top = shadowConfig.camera.top
        directionalLight.shadow.camera.bottom = shadowConfig.camera.bottom
        // 优化阴影质量
        directionalLight.shadow.bias = -0.0001
        directionalLight.shadow.normalBias = 0.02
      }
      
      this.scene.add(directionalLight)
      this.lights.directional = directionalLight
    }
  }
  
  // 获取光照对象（供调试面板使用）
  getLights() {
    return this.lights
  }
  
  async loadModel(modelPath) {
    return new Promise((resolve, reject) => {
      const loader = createGLTFLoader()
      
      // 进度阶段划分：
      // 0-70%: 文件下载
      // 70-85%: 纹理加载
      // 85-95%: 模型处理
      // 95-100%: 渲染准备
      let fileDownloadProgress = 0
      let textureLoadProgress = 0
      let modelProcessProgress = 0
      
      // 更新总进度
      const updateTotalProgress = () => {
        const totalProgress = 
          fileDownloadProgress * 0.70 +      // 文件下载占70%
          textureLoadProgress * 0.15 +       // 纹理加载占15%
          modelProcessProgress * 0.10 +      // 模型处理占10%
          0.05                                // 渲染准备占5%
        this.loadingProgress = Math.min(100, totalProgress * 100)
      }
      
      loader.load(
        modelPath,
        (gltf) => {
          // 文件下载完成，进入模型处理阶段
          fileDownloadProgress = 1
          modelProcessProgress = 0.3
          updateTotalProgress()
          
          this.model = gltf.scene
          
          // 统计纹理数量
          const textures = new Set()
          const images = new Set()
          this.model.traverse((child) => {
            if (child.isMesh) {
              child.castShadow = true
              child.receiveShadow = true
              
              // 收集纹理
              if (child.material) {
                const materials = Array.isArray(child.material) ? child.material : [child.material]
                materials.forEach(mat => {
                  Object.values(mat).forEach(value => {
                    if (value && value.isTexture) {
                      textures.add(value)
                      if (value.image) {
                        images.add(value.image)
                      }
                    }
                  })
                })
              }
            }
          })
          
          // 监听纹理加载进度
          const totalTextures = textures.size
          let loadedTextures = 0
          
          if (totalTextures > 0) {
            textures.forEach(texture => {
              if (texture.image) {
                if (texture.image.complete) {
                  loadedTextures++
                } else {
                  texture.image.onload = () => {
                    loadedTextures++
                    textureLoadProgress = loadedTextures / totalTextures
                    updateTotalProgress()
                  }
                  texture.image.onerror = () => {
                    loadedTextures++
                    textureLoadProgress = loadedTextures / totalTextures
                    updateTotalProgress()
                  }
                }
              } else {
                loadedTextures++
              }
            })
            
            // 如果所有纹理都已加载完成
            if (loadedTextures === totalTextures) {
              textureLoadProgress = 1
            } else {
              textureLoadProgress = loadedTextures / totalTextures
            }
          } else {
            textureLoadProgress = 1
          }
          
          modelProcessProgress = 0.6
          updateTotalProgress()
          
          // 先将模型添加到场景，以便正确计算世界坐标
          this.scene.add(this.model)

          modelProcessProgress = 0.8
          updateTotalProgress()

          // 更新矩阵并计算模型边界信息（使用世界坐标）
          this.model.updateMatrixWorld(true)
          const box = new THREE.Box3().setFromObject(this.model)
          
          modelProcessProgress = 0.9
          updateTotalProgress()
          
          // 更新模型中心点和尺寸
          this.modelCenter = box.getCenter(new THREE.Vector3())
          this.modelSize = box.getSize(new THREE.Vector3())
          
          modelProcessProgress = 1
          updateTotalProgress()
          
          // 根据模型最低点调整地面位置，确保模型在地面上方
          if (this.ground) {
            const groundOffset = config.scene.ground.offset || -0.1
            const modelBottom = box.min.y
            this.ground.position.y = modelBottom + groundOffset
          }
          
          // 可选：添加坐标轴辅助器来可视化坐标轴（如果启用调试）
          if (config.debug?.showAxes) {
            const axesHelper = new THREE.AxesHelper(Math.max(...this.modelSize.toArray()) * 0.5)
            // 坐标轴应该显示在模型的实际中心点位置
            // 使用计算后的模型中心点，而不是配置位置
            if (this.modelCenter) {
              axesHelper.position.set(this.modelCenter.x, this.modelCenter.y, this.modelCenter.z)
            } else {
              axesHelper.position.set(0, 0, 0) // 如果没有中心点，显示在原点
            }
            this.scene.add(axesHelper)
            this.axesHelper = axesHelper
            
            // 输出调试信息
            console.log('坐标轴辅助器位置:', {
              '模型中心点': this.modelCenter,
              '坐标轴位置': axesHelper.position
            })
          }

          // 调试模式下支持点击模型物件获取位置与尺寸
          this.setupDebugObjectPick()
          
          // 模型加载完成后，设置外部观察的精确视角
          this.setExternalView()
          
          // 等待一帧，确保渲染完成
          requestAnimationFrame(() => {
            this.loadingProgress = 100
            resolve(this.model)
          })
        },
        (progress) => {
          // 文件下载进度（0-70%）
          if (progress.total > 0) {
            fileDownloadProgress = progress.loaded / progress.total
            updateTotalProgress()
          }
        },
        (error) => {
          console.error('模型加载失败:', error)
          reject(error)
        }
      )
    })
  }
  
  /**
   * 加载并放置模型展品（从 modelExhibits 配置）
   * 在主场景模型加载完成后调用
   */
  async loadModelExhibits() {
    const configs = getModelExhibitsConfig()
    if (!configs || configs.length === 0) return
    
    const loader = createGLTFLoader()
    
    for (const cfg of configs) {
      if (!cfg.modelPath) continue
      
      try {
        const gltf = await new Promise((resolve, reject) => {
          loader.load(cfg.modelPath, resolve, undefined, reject)
        })
        
        const mesh = gltf.scene
        
        // 应用变换：优先使用 position，若无则从 bounds 计算中心
        let pos = cfg.position
        if (!pos && cfg.bounds) {
          if (cfg.bounds.center) {
            pos = cfg.bounds.center
          } else if (cfg.bounds.min && cfg.bounds.max) {
            pos = [
              (cfg.bounds.min[0] + cfg.bounds.max[0]) / 2,
              (cfg.bounds.min[1] + cfg.bounds.max[1]) / 2,
              (cfg.bounds.min[2] + cfg.bounds.max[2]) / 2
            ]
          }
        }
        pos = pos || [0, 0, 0]
        mesh.position.set(pos[0], pos[1], pos[2])
        
        const rot = cfg.rotation || [0, 0, 0]
        mesh.rotation.set(rot[0], rot[1], rot[2])
        
        const scale = cfg.scale
        if (scale !== undefined) {
          if (typeof scale === 'number') {
            mesh.scale.setScalar(scale)
          } else if (Array.isArray(scale)) {
            mesh.scale.set(scale[0], scale[1], scale[2])
          }
        }
        
        // 阴影
        const castShadow = cfg.castShadow !== false
        const receiveShadow = cfg.receiveShadow !== false
        mesh.traverse((child) => {
          if (child.isMesh) {
            child.castShadow = castShadow
            child.receiveShadow = receiveShadow
          }
        })
        
        // 可见性
        if (cfg.visible === false) mesh.visible = false
        
        mesh.userData.modelExhibitConfig = cfg
        this.scene.add(mesh)
        this.modelExhibitMeshes.push(mesh)
      } catch (err) {
        console.warn(`模型展品加载失败 [${cfg.id}]: ${cfg.modelPath}`, err)
      }
    }
  }
  
  // 设置外部观察的精确视角
  setExternalView() {
    if (!this.camera) return
    
    const cameraConfig = config.camera
    
    // 设置相机位置
    this.camera.position.set(...cameraConfig.externalPosition)
    
    // 设置相机旋转（欧拉角转四元数）
    const euler = new THREE.Euler(
      THREE.MathUtils.degToRad(cameraConfig.externalRotation.x),
      THREE.MathUtils.degToRad(cameraConfig.externalRotation.y),
      THREE.MathUtils.degToRad(cameraConfig.externalRotation.z),
      'XYZ'
    )
    this.camera.setRotationFromEuler(euler)
    
    // 设置缩放级别
    this.camera.zoom = cameraConfig.externalZoom
    this.camera.updateProjectionMatrix()
    
    // 计算目标点（根据相机位置、旋转和距离）
    // 相机的前方向向量（Three.js相机默认看向-Z方向）
    const forward = new THREE.Vector3(0, 0, -1)
    forward.applyQuaternion(this.camera.quaternion)
    
    // 目标点 = 相机位置 + 前方向 * 距离
    // 因为前方向是(0,0,-1)，所以目标点在相机前方
    const target = this.camera.position.clone().add(
      forward.multiplyScalar(cameraConfig.externalDistance)
    )
    
    // 存储目标点供 OrbitControls 使用
    this.externalTarget = target
    
    // 如果有 OrbitControls，更新其目标
    if (this.orbitControls) {
      this.orbitControls.target.copy(target)
      this.orbitControls.update()
    }
  }

  // 调试：点击模型物件输出位置和尺寸信息
  setupDebugObjectPick() {
    const debugEnabled = Boolean(
      config.debug?.showGUI ||
      config.debug?.showAxes ||
      config.debug?.showCollisions ||
      config.debug?.showGrid
    )
    if (!debugEnabled || !this.model || !this.renderer || this._debugPickReady) return

    this._debugPickReady = true

    this.renderer.domElement.addEventListener('click', (event) => {
      const rect = this.renderer.domElement.getBoundingClientRect()
      this.pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
      this.pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1

      this.raycaster.setFromCamera(this.pointer, this.camera)
      const intersects = this.raycaster.intersectObjects(this.model.children, true)

      if (intersects.length === 0) return

      const hit = intersects[0].object
      const box = new THREE.Box3().setFromObject(hit)
      const center = box.getCenter(new THREE.Vector3())
      const size = box.getSize(new THREE.Vector3())

      const format = (value) => Number(value.toFixed(3))
      const toArray = (v) => [format(v.x), format(v.y), format(v.z)]

      const path = []
      let current = hit
      while (current) {
        if (current.name) path.unshift(current.name)
        current = current.parent
      }

      // 获取物件的本地位置、旋转、缩放
      const localPosition = hit.position ? toArray(hit.position) : null
      const localRotation = hit.rotation ? {
        x: format(hit.rotation.x),
        y: format(hit.rotation.y),
        z: format(hit.rotation.z)
      } : null
      const localScale = hit.scale ? toArray(hit.scale) : null

      // 获取世界位置
      hit.updateMatrixWorld(true)
      const worldPosition = new THREE.Vector3()
      hit.getWorldPosition(worldPosition)
      const worldPos = toArray(worldPosition)

      // 获取包围盒的 min/max
      const min = toArray(box.min)
      const max = toArray(box.max)

      // 获取材质信息
      let materialInfo = null
      if (hit.material) {
        if (Array.isArray(hit.material)) {
          materialInfo = hit.material.map((mat, idx) => ({
            index: idx,
            type: mat.type,
            color: mat.color ? `#${mat.color.getHexString()}` : null,
            transparent: mat.transparent,
            opacity: mat.opacity
          }))
        } else {
          materialInfo = {
            type: hit.material.type,
            color: hit.material.color ? `#${hit.material.color.getHexString()}` : null,
            transparent: hit.material.transparent,
            opacity: hit.material.opacity
          }
        }
      }

      // 检查是否有相关的展品信息（如果场景中有 InteractionSystem）
      let nearbyExhibits = []
      const interactionSystem = this.scene.userData.interactionSystem
      if (interactionSystem && interactionSystem.exhibits) {
        const exhibits = interactionSystem.exhibits
        
        for (const exhibit of exhibits) {
          let distance = Infinity
          if (exhibit.bounds) {
            // 使用包围盒计算距离
            if (exhibit.bounds.center && exhibit.bounds.size) {
              const exhibitCenter = new THREE.Vector3(...exhibit.bounds.center)
              distance = worldPosition.distanceTo(exhibitCenter)
            } else if (exhibit.bounds.min && exhibit.bounds.max) {
              const exhibitCenter = new THREE.Vector3(
                (exhibit.bounds.min[0] + exhibit.bounds.max[0]) / 2,
                (exhibit.bounds.min[1] + exhibit.bounds.max[1]) / 2,
                (exhibit.bounds.min[2] + exhibit.bounds.max[2]) / 2
              )
              distance = worldPosition.distanceTo(exhibitCenter)
            }
          } else if (exhibit.position) {
            const exhibitPos = new THREE.Vector3(...exhibit.position)
            distance = worldPosition.distanceTo(exhibitPos)
          }
          
          if (distance < 5) { // 5米范围内的展品
            nearbyExhibits.push({
              id: exhibit.id,
              name: exhibit.name || exhibit.id,
              floor: exhibit.floor,
              distance: format(distance)
            })
          }
        }
      }

      console.log('调试-物件信息:', {
        // 基本信息
        name: hit.name || '(unnamed)',
        type: hit.type,
        uuid: hit.uuid,
        path: path.join('/'),
        
        // 位置信息
        position: {
          center: toArray(center),
          world: worldPos,
          local: localPosition
        },
        
        // 尺寸信息
        size: toArray(size),
        bounds: {
          min: min,
          max: max
        },
        
        // 变换信息
        transform: {
          rotation: localRotation,
          scale: localScale
        },
        
        // 材质信息
        material: materialInfo,
        
        // 几何信息
        geometry: hit.geometry ? {
          type: hit.geometry.type,
          vertices: hit.geometry.attributes?.position?.count || 0,
          faces: hit.geometry.attributes?.position?.count ? 
            Math.floor(hit.geometry.attributes.position.count / 3) : 0
        } : null,
        
        // 相关展品（5米范围内）
        nearbyExhibits: nearbyExhibits.length > 0 ? nearbyExhibits : null,
        
        // 其他信息
        visible: hit.visible,
        castShadow: hit.castShadow,
        receiveShadow: hit.receiveShadow,
        layers: hit.layers.mask
      })
    })
  }
  
  // 设置 OrbitControls 引用（供外部调用）
  setOrbitControls(orbitControls) {
    this.orbitControls = orbitControls
  }
  
  // 获取模型边界信息
  getModelBounds() {
    if (!this.model) return null
    return {
      center: this.modelCenter,
      size: this.modelSize
    }
  }
  
  // 重新对齐模型（供调试面板使用）
  realignModel(alignX = true, alignZ = true, alignYBottom = true) {
    if (!this.model) return false
    
    // 更新矩阵，确保边界框计算使用世界坐标
    this.model.updateMatrixWorld(true)
    
    // 计算模型边界信息（使用世界坐标）
    let box = new THREE.Box3().setFromObject(this.model)
    
    // 使用边界框的 min 和 max 直接计算中心点和偏移量
    const centerX = (box.min.x + box.max.x) / 2
    const centerZ = (box.min.z + box.max.z) / 2
    const modelBottom = box.min.y
    
    // 计算新的位置
    const newX = alignX ? -centerX : this.model.position.x
    const newY = alignYBottom ? -modelBottom : this.model.position.y
    const newZ = alignZ ? -centerZ : this.model.position.z
    
    // 设置模型位置
    this.model.position.set(newX, newY, newZ)
    
    // 迭代调整，确保精确对齐（最多迭代5次）
    let maxIterations = 5
    let iteration = 0
    let tolerance = 0.001 // 容差：1毫米
    
    while (iteration < maxIterations && (alignX || alignZ)) {
      // 更新矩阵，确保后续计算使用新的位置
      this.model.updateMatrixWorld(true)
      
      // 重新计算边界框（因为模型位置已改变）
      box.setFromObject(this.model)
      
      // 计算当前中心点
      const currentCenterX = (box.min.x + box.max.x) / 2
      const currentCenterZ = (box.min.z + box.max.z) / 2
      
      // 检查是否已经对齐（在容差范围内）
      const xError = alignX ? Math.abs(currentCenterX) : 0
      const zError = alignZ ? Math.abs(currentCenterZ) : 0
      
      if (xError < tolerance && zError < tolerance) {
        // 已经对齐，退出循环
        break
      }
      
      // 计算需要调整的偏移量
      const adjustX = alignX ? -currentCenterX : 0
      const adjustZ = alignZ ? -currentCenterZ : 0
      
      // 应用调整
      this.model.position.x += adjustX
      this.model.position.z += adjustZ
      
      iteration++
    }
    
    // 最终更新矩阵和边界框
    this.model.updateMatrixWorld(true)
    box.setFromObject(this.model)
    
    // 更新模型中心点和尺寸
    this.modelCenter = box.getCenter(new THREE.Vector3())
    this.modelSize = box.getSize(new THREE.Vector3())
    
    // 更新地面位置
    if (this.ground && alignYBottom) {
      const groundOffset = config.scene.ground.offset || -0.1
      this.ground.position.y = groundOffset
    }
    
    return true
  }
  
  onWindowResize() {
    const width = this.container.clientWidth || window.innerWidth
    const height = this.container.clientHeight || window.innerHeight

    this.camera.aspect = width / height
    this.camera.updateProjectionMatrix()

    this.renderer.setSize(width, height)
    // 设备旋转时更新像素比（移动端横竖屏切换）
    const isMobile = isMobileDevice()
    const usePerformanceMode = config.mobile?.enabled && isMobile && (config.mobile.performanceMode ?? true)
    const pixelRatioLimit = isMobile ? 1.5 : 2
    this.renderer.setPixelRatio(usePerformanceMode ? 1 : Math.min(window.devicePixelRatio, pixelRatioLimit))
  }
  
  render() {
    this.renderer.render(this.scene, this.camera)
  }
  
  dispose() {
    // 移除窗口大小变化监听器
    if (this._resizeHandler) {
      window.removeEventListener('resize', this._resizeHandler)
      this._resizeHandler = null
    }

    // 清理模型展品
    this.modelExhibitMeshes.forEach((mesh) => {
      mesh.traverse((child) => {
        if (child.isMesh) {
          child.geometry?.dispose()
          if (child.material) {
            if (Array.isArray(child.material)) {
              child.material.forEach((m) => m.dispose())
            } else {
              child.material.dispose()
            }
          }
        }
      })
      this.scene.remove(mesh)
    })
    this.modelExhibitMeshes = []
    
    if (this.model) {
      this.model.traverse((child) => {
        if (child.isMesh) {
          child.geometry.dispose()
          if (child.material) {
            if (Array.isArray(child.material)) {
              child.material.forEach(material => material.dispose())
            } else {
              child.material.dispose()
            }
          }
        }
      })
    }
    
    // 清理地面
    if (this.ground) {
      this.ground.geometry.dispose()
      this.ground.material.dispose()
      this.scene.remove(this.ground)
      this.ground = null
    }
    
    // 清理坐标轴辅助器
    if (this.axesHelper) {
      this.scene.remove(this.axesHelper)
      this.axesHelper.dispose()
      this.axesHelper = null
    }
    
    // 移除 resize 事件监听（需与 init 中的注册方式一致）
    if (this._resizeHandler) {
      window.removeEventListener('resize', this._resizeHandler)
      this._resizeHandler = null
    }

    this.renderer.dispose()
  }
}

