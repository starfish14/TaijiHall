/**
 * 展品配置文件
 * 定义所有展品的位置、信息等
 * 
 * 支持多种配置方式：
 * 1. 单个位置 + 交互半径：使用 position + interactionRadius（适用于点状展品）
 * 2. 包围盒（Bounding Box）：使用 bounds 定义矩形区域（适用于平面展品）
 * 3. 多个位置：使用 positions 数组，每个位置可以有自己的 id（可选）
 * 
 * 包围盒格式：bounds: { min: [x, y, z], max: [x, y, z] }
 * 或者使用中心点和尺寸：bounds: { center: [x, y, z], size: [width, height, depth] }
 * 
 * 相机位置配置（用于展品导航）：
 * - cameraPosition: [x, y, z] - 点击展品导航按钮时，相机移动到的位置
 * - cameraLookAt: [x, y, z] - 相机朝向的目标点（通常是展品中心）
 * - cameraRotation: [x, y, z] - 相机的旋转角度（欧拉角，单位：弧度）
 *   如果同时配置了 cameraRotation 和 cameraLookAt，优先使用 cameraRotation
 * 
 * 交互类型（type）：
 * - 'exhibit': 展品（默认），点击后显示展品详情弹窗
 * - 'pageLink': 页面跳转，点击后在弹框中加载外部页面（使用 iframe，不做路由跳转）
 * - 'richText': 富文本，点击后在弹框中显示富文本内容（支持 HTML）
 * - 其他类型可根据需要扩展
 * 
 * 注意：所有交互类型（包括展品和游戏区域）都支持以下配置：
 * - bounds: 包围盒配置（支持 center+size 或 min+max 格式）
 * - cameraPosition: 相机位置（用于导航功能）
 * - cameraLookAt: 相机朝向目标点（用于导航功能）
 * - cameraRotation: 相机旋转角度（用于导航功能，优先级高于 cameraLookAt）
 * - hidden: 是否在导航中隐藏（true: 隐藏，false 或不设置: 显示）
 * 
 * 页面跳转类型（pageLink）额外配置：
 * - url 或 pageUrl: 要加载的页面地址（必填）
 * - title: 弹框标题（可选，默认使用 name）
 * 
 * 富文本类型（richText）额外配置：
 * - text: 富文本内容（必填，支持 HTML 格式）
 * - title: 弹框标题（可选，默认使用 name）
 *
 * 展品多媒体配置（exhibit 类型）：
 * - images: 图片数组，如 ["/images/xxx.jpg", ...]
 * - videos: 视频数组，支持格式：
 *   1. 字符串数组：["/videos/xxx.mp4", ...]
 *   2. 对象数组：[{ url: "/videos/xxx.mp4", title: "视频标题" }, ...]
 * - audio: 音频数组，支持格式同 videos：
 *   1. 字符串数组：["/audio/xxx.mp3", ...]
 *   2. 对象数组：[{ url: "/audio/xxx.mp3", title: "音频标题" }, ...]
 * 当展品同时包含视频或音频时，弹窗会以标签页形式展示：图片 | 视频 | 音频
 *
 * 示例（在展品中增加视频和音频）：
 *   images: ["/images/xxx.jpg"],
 *   videos: ["/videos/intro.mp4", { url: "/videos/demo.mp4", title: "演示视频" }],
 *   audio: [{ url: "/audio/narration.mp3", title: "解说" }]
 */
export default {
  exhibits: [
    // {
    //   id: "1-0", // 服务台
    //   name: "服务台",
    //   floor: 1,  // 所在楼层
    //   interactionRadius: 3.0,  // 交互半径（米）
    //   // 方式2：包围盒（更精确，适用于平面展品）
    //   bounds: {
    //     max: [6.304, -1.495, 0.687],
    //     min: [5.551, -1.93, -0.799]
    //   },
    //   // 相机位置配置（用于展品导航）
    //   // cameraPosition: [7.85, -1.04, -3],  // 相机位置 [x, y, z]
    //   // cameraLookAt: [5.93, -1.04, -0.056],  // 相机朝向服务台中心（bounds 中心），原 [-7.85,-1.04,-3] 指向远处墙壁导致定位不准
    //   cameraPosition: [7.07, -1.04, 0.56],  // 相机位置 [x, y, z]
    //   cameraLookAt: [-7.07, -1.04, 0.56],  // 相机朝向目标点 [x, y, z]
    //   images: [
    //     "/images/总览/陈.jpg",
    //     "/images/总览/杨氏太极拳.jpg",
    //     "/images/总览/吴氏太极拳.jpg",
    //     "/images/总览/李氏太极拳.jpg",
    //     "/images/总览/武式太极拳.jpg",
    //     "/images/总览/王其和式太极拳.jpg",
    //     "/images/总览/孙氏太极拳.jpg",
    //     "/images/总览/和氏太极拳.jpg",
    //   ],
    // },
    {
      id: "1-1", // 总览
      name: "总览",
      floor: 1,  // 所在楼层
      interactionRadius: 5.0,  // 交互半径（米）
      // 方式2：包围盒（更精确，适用于平面展品）
      bounds: {
        center: [5.15, -1.276, -0.241],
        size: [0.1, 0.941, 6.534]  // 宽度、高度、深度（米）
      },
      // 相机位置配置（用于展品导航）
      cameraPosition: [7.07, -1.04, 0.56],  // 相机位置 [x, y, z]
      cameraLookAt: [-7.07, -1.04, 0.56],  // 相机朝向目标点 [x, y, z]
      images: [
        "/images/总览/陈.jpg",
        "/images/总览/杨氏太极拳.jpg",
        "/images/总览/吴氏太极拳.jpg",
        "/images/总览/李氏太极拳.jpg",
        "/images/总览/武式太极拳.jpg",
        "/images/总览/王其和式太极拳.jpg",
        "/images/总览/孙氏太极拳.jpg",
        "/images/总览/和氏太极拳.jpg",
      ],
      // videos: [{ url: "/videos/太极馆1.mp4", title: "演示视频" }],
      // audio: [{ url: "/audios/bg.mp3", title: "解说" }]
    },
    {
      id: "1-3",
      name: "陈式太极拳",
      floor: 1,  // 所在楼层
      interactionRadius: 3.0,  // 交互半径（米）
      // 方式2：包围盒（推荐用于平面展品）
      bounds: {
        max: [3.17, -0.858, 3.26],
        min: [3.07, -1.673, 1.1]
      },
      // 相机位置配置（用于展品导航）
      cameraPosition: [4.85, -1.1, 2.2],  // 相机位置 [x, y, z]
      cameraLookAt: [-4.85, -1.1, 2.2],  // 相机朝向目标点 [x, y, z]
      images: [
        "/images/陈式太极拳/陈氏太极拳陈家沟介绍.jpg",
        "/images/陈式太极拳/陈氏太极拳的历史渊源.jpg",
        "/images/陈式太极拳/陈氏太极拳拳谱.jpg",
        "/images/陈式太极拳/陈氏太极拳拳理.jpg",
        "/images/陈式太极拳/陈氏太极拳近代发展.jpg",
        "/images/陈式太极拳/陈氏太极拳的近代发展.jpg",
      ],
    },
    {
      id: "1-4",
      name: "陈式太极拳-发展脉络",
      floor: 1,  // 所在楼层
      interactionRadius: 3.0,  // 交互半径（米）
      // 方式2：包围盒（推荐用于平面展品）
      bounds: {
        max: [3.17, -0.822, -1.143],
        min: [3.11, -1.702, -3.8]
      },
      // 相机位置配置（用于展品导航）
      cameraPosition: [4.54, -1.14, -2.05],  // 相机位置 [x, y, z]
      cameraLookAt: [-4.54, -1.14, -2.05],  // 相机朝向目标点 [x, y, z]
      images: [
        "/images/陈式太极拳/陈氏太极拳文脉源流.jpg",
        "/images/陈式太极拳/陈氏太极拳历史脉络.jpg",
        "/images/陈式太极拳/陈氏太极拳拳史.jpg",
      ],
    },
    {
      id: "1-5",
      name: "陈式太极拳-传承谱系图",
      floor: 1,  // 所在楼层
      interactionRadius: 3.0,  // 交互半径（米）
      // 方式2：包围盒（推荐用于平面展品）
      bounds: {
        max: [4.88, -0.85, -3.7],
        min: [3.34, -1.7, -3.7]
      },
      // 相机位置配置（用于展品导航）
      cameraPosition: [3.86, -1.01, -2.45],  // 相机位置 [x, y, z]
      cameraLookAt: [3.86, -1.01, -2.45],  // 相机朝向目标点 [x, y, z]
      images: [
        "/images/陈式太极拳/陈氏太极拳传承谱系图.jpg",
        "/images/陈式太极拳/陈氏太极拳代表性传承人.jpg",
      ],
    },
    {
      id: "1-6",
      name: "杨氏太极拳",
      floor: 1,  // 所在楼层
      interactionRadius: 3.0,  // 交互半径（米）
      // 方式2：包围盒（推荐用于平面展品）
      bounds: {
        max: [2.65, -0.86, -3.72],
        min: [-1.46, -1.9, -3.8]
      },
      // 相机位置配置（用于展品导航）
      cameraPosition: [0.52, -0.95, -1.8],  // 相机位置 [x, y, z]
      cameraLookAt: [0.52, -0.95, -1.8],  // 相机朝向目标点 [x, y, z]
      images: [
        "/images/杨氏太极拳/杨氏太极拳拳史.jpg",
        "/images/杨氏太极拳/杨氏太极拳代表性传承人.jpg",
        "/images/杨氏太极拳/杨氏太极拳拳理.jpg",
        "/images/杨氏太极拳/杨氏太极拳历史发展大事记.jpg",
        "/images/杨氏太极拳/杨氏太极拳文化内涵.jpg",
        "/images/杨氏太极拳/杨氏太极拳拳谱.jpg",
        "/images/杨氏太极拳/杨氏太极拳国际传播.jpg",
      ],
    },
    {
      id: "1-12",
      name: "吴氏太极拳",
      floor: 1,  // 所在楼层
      interactionRadius: 3.0,  // 交互半径（米）
      // 方式2：包围盒（推荐用于平面展品）
      bounds: {
        max: [-2.3, -0.86, -4.33],
        min: [-5.52, -1.79, -4.36]
      },
      // 相机位置配置（用于展品导航）
      cameraPosition: [-4.3, -0.95, -2.53],  // 相机位置 [x, y, z]
      cameraLookAt: [-4.3, -0.95, -3.2],  // 相机朝向目标点 [x, y, z]
      images: [
        "/images/吴氏太极拳/吴氏太极拳拳史.jpg",
        "/images/吴氏太极拳/吴氏太极拳源起.jpg",
        "/images/吴氏太极拳/吴氏太极拳拳理.jpg",
        "/images/吴氏太极拳/吴氏太极拳传承谱系图.jpg",
        "/images/吴氏太极拳/吴氏太极拳代表性传承人.jpg",
        "/images/吴氏太极拳/吴氏太极拳发展脉络（上）.jpg",
        "/images/吴氏太极拳/吴氏太极拳发展脉络（下）.jpg",
      ],
    },
    {
      id: "1-11",
      name: "武式太极拳",
      floor: 1,  // 所在楼层
      interactionRadius: 3.0,  // 交互半径（米）
      // 方式2：包围盒（推荐用于平面展品）
      bounds: {
        max: [-5.46, -0.87, -2.7],
        min: [-5.46, -1.86, -4.19]
      },
      // 相机位置配置（用于展品导航）
      cameraPosition: [-3.9, -1.1, -3.15],  // 相机位置 [x, y, z]
      cameraLookAt: [-4, -1.1, -3.15],  // 相机朝向目标点 [x, y, z]
      images: [
        "/images/武式太极拳/武式太极拳拳史.jpg",
        "/images/武式太极拳/武式太极拳代表性传承人.jpg",
        "/images/武式太极拳/武式太极拳拳理.jpg",
        "/images/武式太极拳/武式太极拳历史发展大事记.jpg",
        "/images/武式太极拳/武式太极拳拳谱摘录.jpg",
      ],
    },
    {
      id: "1-10",
      name: "孙氏太极拳",
      floor: 1,  // 所在楼层
      interactionRadius: 3.0,  // 交互半径（米）
      // 方式2：包围盒（推荐用于平面展品）
      bounds: {
        max: [-5.50, -0.87, -0.22],
        min: [-5.52, -1.86, -2.66]
      },
      // 相机位置配置（用于展品导航）
      cameraPosition: [-3.9, -1.1, -1.15],  // 相机位置 [x, y, z]
      cameraLookAt: [-4, -1.1, -1.15],  // 相机朝向目标点 [x, y, z]
      images: [
        "/images/孙氏太极拳/孙氏太极拳拳史.jpg",
        "/images/孙氏太极拳/孙氏太极拳拳谱摘录.jpg",
        "/images/孙氏太极拳/孙氏太极拳代表性传承人与拳理.jpg",
        "/images/孙氏太极拳/孙氏太极拳发展.jpg",
      ],
    },
    {
      id: "1-9",
      name: "王其和太极拳",
      floor: 1,  // 所在楼层
      interactionRadius: 3.0,  // 交互半径（米）
      // 方式2：包围盒（推荐用于平面展品）
      bounds: {
        max: [-5.50, -0.85, 3.44],
        min: [-5.52, -1.85, -0.1]
      },
      // 相机位置配置（用于展品导航）
      cameraPosition: [-3.9, -1.1, 2.2],  // 相机位置 [x, y, z]
      cameraLookAt: [-4, -1.1, 2.2],  // 相机朝向目标点 [x, y, z]
      images: [
        "/images/王其和式太极拳/王其和氏太极拳拳史.jpg",
        "/images/王其和式太极拳/王其和太极拳代表性传承人.jpg",
        "/images/王其和式太极拳/王其和氏太极拳拳理与发展大事记.jpg",
        "/images/王其和式太极拳/王其和氏太极拳经典拳谱摘录（1）.jpg",
        "/images/王其和式太极拳/王其和氏太极拳经典拳谱摘录（2）.jpg",
        "/images/王其和式太极拳/王其和氏太极拳赛事影响.jpg",
        "/images/王其和式太极拳/王其和氏太极拳文化内涵.jpg",
      ],
    },
    {
      id: "1-8",
      name: "和氏太极拳",
      floor: 1,  // 所在楼层
      interactionRadius: 3.0,  // 交互半径（米）
      // 方式2：包围盒（推荐用于平面展品）
      bounds: {
        max: [-2.38, -0.98, 3.59],
        min: [-5.49, -1.9, 3.59]
      },
      // 相机位置配置（用于展品导航）
      cameraPosition: [-4.3, -0.95, 1.6],  // 相机位置 [x, y, z]
      cameraLookAt: [-4.3, -0.95, 1.7],  // 相机朝向目标点 [x, y, z]
      images: [
        "/images/和式太极拳/和氏太极拳前言.jpg",
        "/images/和式太极拳/和氏太极拳介绍（一）.jpg",
        "/images/和式太极拳/和氏太极拳介绍（二）.jpg",
      ],
    },
    {
      id: "1-7",
      name: "李氏太极拳",
      floor: 1,  // 所在楼层
      interactionRadius: 3.0,  // 交互半径（米）
      // 方式2：包围盒（推荐用于平面展品）
      bounds: {
        max: [1.4, -0.88, 3.13],
        min: [-1.9, -1.85, 3.13]
      },
      // 相机位置配置（用于展品导航）
      cameraPosition: [0, -0.95, 1.1],  // 相机位置 [x, y, z]
      cameraLookAt: [0, -0.95, 1.2],  // 相机朝向目标点 [x, y, z]
      images: [
        "/images/李氏太极拳/李氏太极拳传承谱系图.jpg",
        "/images/李氏太极拳/李氏太极拳代表性传承人.jpg",
        "/images/李氏太极拳/李氏太极拳的拳理与传承.jpg",
        "/images/李氏太极拳/李氏太极拳的发展.jpg",
      ],
    },

    // 二层展品==========================================================================================
    // 游戏区域配置（二层）
    {
      id: "goods_001",
      name: "文创选购",
      floor: 2,
      type: "pageLink",
      interactionRadius: 3.0,  // 交互半径
      url: "https://www.baidu.com/",  // 要加载的页面地址（必填，也支持 pageUrl）
      // 或者使用 min/max 格式：
      bounds: {
        min: [-1.39, 0.25, -2.05],
        max: [3.19, 2, 0.34]
      },
      // 相机位置配置（用于导航到游戏区域）
      cameraPosition: [0.9, 1.2, 1.5],  // 相机位置 [x, y, z]
      cameraLookAt: [0.5, 1.2, 0],  // 相机朝向目标点 [x, y, z]
    },
    {
      id: "game_area_001",
      name: "趣味答题系统",
      floor: 2,
      type: "pageLink",  // 游戏区域类型
      interactionRadius: 3.0,  // 交互半径
      url: "https://starfish14.github.io/TaijiQuiz/",  // 要加载的页面地址（必填，也支持 pageUrl）
      // 或者使用 min/max 格式：
      bounds: {
        min: [4.2, 0.29, -4.57],
        max: [5.99, 1.38, -3.51]
      },
      // 相机位置配置（用于导航到游戏区域）
      cameraPosition: [4.7, 1.11, -2.07],  // 相机位置 [x, y, z]
      cameraLookAt: [4.7, 1.11, -2.07]  // 相机朝向目标点 [x, y, z]（通常是游戏区中心）
    },
    {
      id: "2-1",
      name: "答题闯关区操作流程",
      floor: 2,  // 所在楼层
      interactionRadius: 3.0,  // 交互半径（米）
      type: "exhibit",
      // 方式2：包围盒（推荐用于平面展品）
      bounds: {
        max: [3.54, 0.98, -4.13],
        min: [3.12, 0.75, -4.35]
      },
      // 相机位置配置（用于展品导航）
      cameraPosition: [3.8, 1.11, -2.87],  // 相机位置 [x, y, z]
      cameraLookAt: [3.8, 1.11, -2.87],  // 相机朝向目标点 [x, y, z]
      images: [
        "/images/二楼/答题闯关区操作流程.png",
      ],
    },
    {
      id: "2-2",
      name: "太极场馆功能区总览",
      floor: 2,  // 所在楼层
      interactionRadius: 3.0,  // 交互半径（米）
      type: "exhibit",  // 富文本类型
      // 方式2：包围盒（推荐用于平面展品）
      bounds: {
        max: [2.9, 1.455, -4.55],
        min: [-1.477, 0.473, -4.6]
      },
      // 相机位置配置（用于展品导航）
      cameraPosition: [1.2, 0.79, -2.9],  // 相机位置 [x, y, z]
      cameraLookAt: [1.2, 0.79, -2.9],  // 相机朝向目标点 [x, y, z]
      images: [
        "/images/二楼/太极场馆功能区总览01.png",
        "/images/二楼/太极场馆功能区总览02.png",
        "/images/二楼/太极场馆功能区总览03.png",
        "/images/二楼/太极场馆功能区总览04.png",
      ],
    },
    {
      id: "2-4",
      name: "服务台",
      floor: 2,  // 所在楼层
      interactionRadius: 4.0,  // 交互半径（米）
      type: "exhibit",
      // 方式2：包围盒（推荐用于平面展品）
      bounds: {
        max: [-1.8, 1.929, 0.8],
        min: [-1.8, 0.518, -2.25]
      },
      // 相机位置配置（用于展品导航）
      cameraPosition: [-4.9, 1.22, -0.5],  // 相机位置 [x, y, z]
      cameraLookAt: [4.9, 1.22, -0.5],  // 相机朝向目标点 [x, y, z]
      images: [
        "/images/二楼/服务台-知趣解码.png",
        "/images/二楼/服务台-数字观拳.png",
        "/images/二楼/服务台-易有太极，是生两仪.png",
        "/images/二楼/服务台-智体养生.png",
        "/images/二楼/服务台-文创承运.png",
      ],
    },
    {
      id: "2-3",
      name: "太极动作捕捉体验区",
      floor: 2,  // 所在楼层
      interactionRadius: 3.0,  // 交互半径（米）
      type: "pageLink",  // 类型
      // 方式2：包围盒（推荐用于平面展品）
      bounds: {
        max: [-2.703, 1.817, -4.678],
        min: [-4.17, 0.328, -4.678]
      },
      // 相机位置配置（用于展品导航）
      cameraPosition: [-4, 1.2, -3.1],  // 相机位置 [x, y, z]
      cameraLookAt: [-4, 1.2, -3.1],  // 相机朝向目标点 [x, y, z]
      url: "https://starfish14.github.io/TaijiMotion/",
    },
    // {
    //   id: "2-6",
    //   name: "动作捕捉体验区操作流程",
    //   floor: 2,  // 所在楼层
    //   interactionRadius: 3.0,  // 交互半径（米）
    //   type: "exhibit",  // 富文本类型
    //   // 方式2：包围盒（推荐用于平面展品）
    //   bounds: {
    //       max: [-6.072, 0.913, -3.765],
    //       min: [-6.504, 0.688, -4.279]
    //   },
    //   // 相机位置配置（用于展品导航）
    //   cameraPosition: [-3.9, 1.22, -3.35],  // 相机位置 [x, y, z]
    //   cameraLookAt: [-4, 1.22, -3.35],  // 相机朝向目标点 [x, y, z]
    //   images: [
    //     "/images/二楼/动作捕捉体验区操作流程.png",
    //   ],
    // },
    {
      id: "2-5",
      name: "二十四式太极拳",
      floor: 2,  // 所在楼层
      interactionRadius: 3.0,  // 交互半径（米）
      type: "exhibit",  // 富文本类型
      // 方式2：包围盒（推荐用于平面展品）
      bounds: {
        max: [-6.8, 1.537, -2.76],
        min: [-6.8, 0.326, -5.1]
      },
      // 相机位置配置（用于展品导航）
      cameraPosition: [-3.9, 1.22, -3.35],  // 相机位置 [x, y, z]
      cameraLookAt: [-4, 1.22, -3.35],  // 相机朝向目标点 [x, y, z]
      images: [
        "/images/二楼/动作捕捉体验区操作流程.png",
        "/images/二楼/二十四式太极拳(节选).png",
      ],
    },
    {
      id: "2-7",
      name: "AI太极处方体验区",
      floor: 2,  // 所在楼层
      interactionRadius: 3.0,  // 交互半径（米）
      type: "pageLink",  // 类型
      // 方式2：包围盒（推荐用于平面展品）
      bounds: {
        max: [-5.9, 1.368, 1.65],
        min: [-6.84, 0.275, -0.88]
      },
      // 相机位置配置（用于展品导航）
      cameraPosition: [-4.2, 1.22, 1],  // 相机位置 [x, y, z]
      cameraLookAt: [-4.5, 1.22, 1],  // 相机朝向目标点 [x, y, z]
      url: "https://starfish14.github.io/TaijiPrescription/",  // 要加载的页面地址（必填，也支持 pageUrl）
    },
    {
      id: "2-8",
      name: "多媒体互动体验区",
      floor: 2,  // 所在楼层
      interactionRadius: 3.0,  // 交互半径（米）
      // type: "pageLink",  // 类型
      // 方式2：包围盒（推荐用于平面展品）
      bounds: {
        max: [-2.05, 1.33, 1.74],
        min: [-2.76, 0.8, 0.58]
      },
      // 相机位置配置（用于展品导航）
      cameraPosition: [-4.2, 1.22, 1],  // 相机位置 [x, y, z]
      cameraLookAt: [4.2, 1.22, 1],  // 相机朝向目标点 [x, y, z]
      // url: "https://www.baidu.com/",  // 要加载的页面地址（必填，也支持 pageUrl）
      images: [
        "/images/二楼/服务台-多媒体互动体验区.jpg",
      ],
      hidden: true,
    },
    // {
    //   id: "2-9",
    //   name: "展品1",
    //   floor: 2,  // 所在楼层
    //   interactionRadius: 3.0,  // 交互半径（米）
    //   // 方式2：包围盒（推荐用于平面展品）
    //   bounds: {
    //     max: [2.73, 0.99, -2.46],
    //     min: [2.33, 0.62, -2.89]
    //   },
    //   // 相机位置配置（用于展品导航）
    //   cameraPosition: [2.4, 0.95, -3.8],  // 相机位置 [x, y, z]
    //   cameraLookAt: [2.4, 0.85, -3.1],  // 相机朝向目标点 [x, y, z]
    //   // images: [
    //   //   "/images/二楼/服务台-多媒体互动体验区.jpg",
    //   // ],
    //   hidden: true,
    // },
    // {
    //   id: "2-10",
    //   name: "展品2",
    //   floor: 2,  // 所在楼层
    //   interactionRadius: 3.0,  // 交互半径（米）
    //   // 方式2：包围盒（推荐用于平面展品）
    //   bounds: {
    //     max: [0.9, 0.99, -2.46],
    //     min: [0.49, 0.62, -2.89]
    //   },
    //   // 相机位置配置（用于展品导航）
    //   cameraPosition: [0.7, 0.95, -3.8],  // 相机位置 [x, y, z]
    //   cameraLookAt: [0.7, 0.85, -3.1],  // 相机朝向目标点 [x, y, z]
    //   // images: [
    //   //   "/images/二楼/服务台-多媒体互动体验区.jpg",
    //   // ],
    //   hidden: true,
    // },
    // {
    //   id: "2-11",
    //   name: "展品3",
    //   floor: 2,  // 所在楼层
    //   interactionRadius: 3.0,  // 交互半径（米）
    //   // 方式2：包围盒（推荐用于平面展品）
    //   bounds: {
    //     max: [-1.04, 0.99, -2.57],
    //     min: [-1.45, 0.62, -3.01]
    //   },
    //   // 相机位置配置（用于展品导航）
    //   cameraPosition: [-1.1, 0.95, -3.8],  // 相机位置 [x, y, z]
    //   cameraLookAt: [-1.1, 0.85, -3.1],  // 相机朝向目标点 [x, y, z]
    //   // images: [
    //   //   "/images/二楼/服务台-多媒体互动体验区.jpg",
    //   // ],
    //   hidden: true,
    // },

    // 页面跳转配置示例（可根据需要添加）
    // {
    //   id: "page_link_001",
    //   name: "相关链接",
    //   title: "外部页面",  // 弹框标题（可选，默认使用 name）
    //   floor: 1,
    //   type: "pageLink",  // 页面跳转类型
    //   position: [x, y, z],  // 或使用 bounds
    //   interactionRadius: 2.0,  // 交互半径
    //   url: "https://example.com/page",  // 要加载的页面地址（必填，也支持 pageUrl）
    //   // 相机位置配置（用于导航）
    //   cameraPosition: [x, y, z],
    //   cameraLookAt: [x, y, z]
    // }
  ]
}
