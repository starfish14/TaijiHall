/**
 * 模型展品配置文件
 * 定义场景中需要单独加载的 3D 模型展品（GLB/GLTF）
 *
 * 与 exhibits.js 的区别：
 * - exhibits.js：展馆场景内的交互区域（展板、展墙等），基于主场景模型的 bounds 定义
 * - modelExhibits.js：独立的 3D 模型对象，需要从外部文件加载并放置在场景中
 *
 * 配置字段说明：
 * - id: 唯一标识（必填）
 * - name: 展品名称（必填）
 * - floor: 所在楼层（必填）
 * - modelPath: 模型文件路径，如 "/models/exhibits/xxx.glb"（必填）
 *
 * 变换配置：
 * - position: [x, y, z] - 模型在场景中的位置（默认 [0, 0, 0]）
 * - rotation: [x, y, z] - 欧拉角旋转，单位：弧度（默认 [0, 0, 0]）
 * - scale: [x, y, z] 或 number - 缩放，数字表示统一缩放（默认 1）
 *
 * 交互配置（与 exhibits 一致）：
 * - bounds: 包围盒，定义交互区域
 *   - center + size: { center: [x,y,z], size: [w,h,d] }
 *   - min + max: { min: [x,y,z], max: [x,y,z] }
 * - interactionRadius: 点状交互时的半径（与 position 配合使用）
 * - position: 也可用于点状交互的中心点
 *
 * 相机/导航配置：
 * - cameraPosition: [x, y, z] - 导航时相机位置
 * - cameraLookAt: [x, y, z] - 相机朝向目标点
 * - cameraRotation: [x, y, z] - 相机旋转（欧拉角，优先级高于 cameraLookAt）
 * - hidden: true - 在导航列表中隐藏
 *
 * 展示内容（点击后弹窗）：
 * - type: 'modelExhibit'（默认）或 'exhibit' | 'pageLink' | 'richText'
 * - images: 图片数组
 * - videos: 视频数组
 * - audio: 音频数组
 * - url: 页面跳转地址（type 为 pageLink 时）
 * - text: 富文本内容（type 为 richText 时）
 *
 * 可选配置：
 * - castShadow: 是否投射阴影（默认 true）
 * - receiveShadow: 是否接收阴影（默认 true）
 * - visible: 是否可见（默认 true）
 */
export default {
  modelExhibits: [
    // {
    //   id: "model_001",
    //   name: "展品1",
    //   floor: 2,
    //   modelPath: "/models/duck.glb",
    //   // position 不填时自动使用 bounds 中心；填了则用指定位置
    //   position: [2.5, 0.65, -2.675],
    //   rotation: [0, 3, 0],
    //   scale: 1,  // duck 模型较小，适当放大
    //   bounds: {
    //     max: [2.73, 0.99, -2.46],
    //     min: [2.33, 0.62, -2.89]
    //   },
    //   // 相机位置配置（用于展品导航）
    //   cameraPosition: [2.4, 0.95, -3.8],  // 相机位置 [x, y, z]
    //   cameraLookAt: [2.4, 0.85, -3.1],  // 相机朝向目标点 [x, y, z]
    //   // images: ["/images/model_001/intro.jpg"],
    //   castShadow: true,
    //   receiveShadow: true,
    //   // hidden: true
    // },
    // {
    //   id: "model_002",
    //   name: "展品2",
    //   floor: 2,
    //   modelPath: "/models/duck.glb",
    //   // position 不填时自动使用 bounds 中心；填了则用指定位置
    //   position: [0.7, 0.65, -2.675],
    //   rotation: [0, 3, 0],
    //   scale: 1,  // duck 模型较小，适当放大
    //   bounds: {
    //     max: [0.9, 0.99, -2.46],
    //     min: [0.49, 0.62, -2.89]
    //   },
    //   // 相机位置配置（用于展品导航）
    //   cameraPosition: [0.7, 0.95, -3.8],  // 相机位置 [x, y, z]
    //   cameraLookAt: [0.7, 0.85, -3.1],  // 相机朝向目标点 [x, y, z]
    //   // images: ["/images/model_001/intro.jpg"],
    //   castShadow: true,
    //   receiveShadow: true,
    //   // hidden: true
    // },
    // {
    //   id: "model_003",
    //   name: "展品3",
    //   floor: 2,
    //   modelPath: "/models/duck.glb",
    //   // position 不填时自动使用 bounds 中心；填了则用指定位置
    //   position: [-1.26, 0.65, -2.675],
    //   rotation: [0, 3, 0],
    //   scale: 1,  // duck 模型较小，适当放大
    //   bounds: {
    //     max: [-1.04, 0.99, -2.57],
    //     min: [-1.45, 0.62, -3.01]
    //   },
    //   // 相机位置配置（用于展品导航）
    //   cameraPosition: [-1.1, 0.95, -3.8],  // 相机位置 [x, y, z]
    //   cameraLookAt: [-1.1, 0.85, -3.1],  // 相机朝向目标点 [x, y, z]
    //   // images: ["/images/model_001/intro.jpg"],
    //   castShadow: true,
    //   receiveShadow: true,
    //   // hidden: true
    // },
  ]
}
