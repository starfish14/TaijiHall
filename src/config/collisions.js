/**
 * 碰撞检测配置文件
 * 定义所有碰撞体的位置和尺寸，用于防止角色穿墙
 *
 * 配置格式与 exhibits.js 的 bounds 一致，支持：
 * 1. bounds: { center: [x,y,z], size: [w,h,d] }  // 中心点 + 尺寸
 * 2. bounds: { min: [x,y,z], max: [x,y,z] }    // 最小/最大角点
 * 3. position + size（传统格式，仍支持）
 */
export default {
  collisions: [
    // 一层碰撞体 - 外墙
    // {
    //   type: "box",
    //   collisionType: "wall",
    //   boundaryRole: "wall",
    //   floor: 1,
    //   rotation: [0, 0, 0],
    //   // 使用 bounds 格式（与 exhibits 一致）
    //   bounds: {
    //     center: [0.41, -0.88, 0.185],
    //     size: [15.534, 2.4785, 11.445]  // [width, height, depth]
    //   }
    // },
    // 一层碰撞体 - 外墙
    {
      type: "box",
      collisionType: "wall",
      boundaryRole: "wall",
      floor: 1,
      rotation: [0, 0, 0],
      // 使用 bounds 格式（与 exhibits 一致）
      bounds: {
        max: [7.45, 2.363, 4.4],
        min: [-6.86, -2.264, -5.01]
      }
    },
    {
      type: "box",
      collisionType: "floor",
      boundaryRole: "floor",
      floor: 1,
      rotation: [0, 0, 0],
      // 使用 bounds 格式（与 exhibits 一致）
      bounds: {
        max: [8.247, -2.186, 5.766],
        min: [-7.413, -2.264, -5.769]
      }
    },
    {
      type: "box",
      collisionType: "ceiling",
      boundaryRole: "ceiling",
      floor: 1,
      rotation: [0, 0, 0],
      // 使用 bounds 格式（与 exhibits 一致）
      bounds: {
        max: [7.685, 0.205, 4.651],
        min: [-7.057, 0.131, -5.264]
      }
    },
    // 二层碰撞体 - 外墙
    // {
    //   type: "box",
    //   collisionType: "wall",
    //   boundaryRole: "wall",
    //   floor: 2,
    //   rotation: [0, 0, 0],
    //   bounds: {
    //     center: [0.41, 1.6, 0.185],
    //     size: [15.534, 2.1, 11.445]
    //   }
    // },
    // 二层碰撞体 - 外墙
    {
      type: "box",
      collisionType: "wall",
      boundaryRole: "wall",
      floor: 2,
      rotation: [0, 0, 0],
      // 使用 bounds 格式（与 exhibits 一致）
      bounds: {
        max: [7.45, 2.363, 4.4],
        min: [-6.86, -2.264, -5.01]
      }
    },
    {
      type: "box",
      collisionType: "floor",
      boundaryRole: "floor",
      floor: 2,
      rotation: [0, 0, 0],
      // 使用 bounds 格式（与 exhibits 一致）
      bounds: {
        max: [7.563, 0.22, 4.62],
        min: [-7.141, 0.052, -3.379]
      }
    },
  ]
}

