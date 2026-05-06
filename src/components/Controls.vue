<template>
  <div 
    class="controls-container" 
    :class="{ 
      'mobile': isMobile,
      'small-screen': isSmallScreen,
      'medium-screen': isMediumScreen,
      'large-screen': isLargeScreen,
      'tablet': isTablet,
      'collapsed': !isExpanded
    }"
  >
    <!-- 展开/收缩切换按钮（侧边定位） -->
    <button
      class="toggle-btn"
      @click="toggleExpand"
      :title="isExpanded ? '收起' : '展开'"
    >
      <svg 
        class="toggle-icon" 
        :class="{ 'expanded': isExpanded }"
        viewBox="0 0 24 24" 
        fill="none" 
        stroke="currentColor" 
        stroke-width="2" 
        stroke-linecap="round" 
        stroke-linejoin="round"
      >
        <polyline v-if="isExpanded" points="9 18 15 12 9 6"></polyline>
        <polyline v-else points="15 18 9 12 15 6"></polyline>
      </svg>
    </button>
    
    <!-- 视角切换按钮 -->
    <Transition name="slide-fade" appear>
      <div v-show="isExpanded" class="control-group" :style="{ '--delay': '0ms' }">
        <button
          class="control-btn"
          :class="{ 'active': viewMode === 'external' }"
          @click="switchToExternal"
        >
          <span class="btn-text">外部观察</span>
        </button>
        <button
          class="control-btn"
          :class="{ 'active': viewMode === 'internal' && currentFloor === 1 }"
          @click="switchFloor(1)"
        >
          <span class="btn-icon">1F</span>
          <span class="btn-text">一层</span>
        </button>
        <button
          class="control-btn"
          :class="{ 'active': viewMode === 'internal' && currentFloor === 2 }"
          @click="switchFloor(2)"
        >
          <span class="btn-icon">2F</span>
          <span class="btn-text">二层</span>
        </button>
      </div>
    </Transition>
    
    <!-- 导航（仅内部模式） -->
    <Transition name="slide-fade" appear>
      <div v-if="viewMode === 'internal' && currentFloorItems.length > 0" v-show="isExpanded" class="control-group navigation" :style="{ '--delay': '50ms' }">
        <div class="group-title">导航</div>
        <div class="exhibit-buttons-container">
          <button
            v-for="item in currentFloorItems"
            :key="item.id"
            class="control-btn exhibit-btn"
            @click="moveToExhibit(item)"
          >
            <span class="btn-text">{{ item.name || item.id }}</span>
          </button>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup>
import { computed, ref, onMounted, onUnmounted } from 'vue'
import { getExhibitsByFloor } from '@/utils/configLoader.js'

const props = defineProps({
  viewMode: {
    type: String,
    default: 'external'
  },
  currentFloor: {
    type: Number,
    default: 1
  }
})

const emit = defineEmits(['switch-view', 'switch-floor', 'move-to-exhibit'])

const isExpanded = ref(true) // 默认展开状态

const windowWidth = ref(window.innerWidth)
const windowHeight = ref(window.innerHeight)

const updateWindowSize = () => {
  windowWidth.value = window.innerWidth
  windowHeight.value = window.innerHeight
}

onMounted(() => {
  window.addEventListener('resize', updateWindowSize)
  updateWindowSize()
})

onUnmounted(() => {
  window.removeEventListener('resize', updateWindowSize)
})

const isMobile = computed(() => {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
})

const isSmallScreen = computed(() => {
  return windowWidth.value <= 480
})

const isMediumScreen = computed(() => {
  return windowWidth.value > 480 && windowWidth.value <= 768
})

const isLargeScreen = computed(() => {
  return windowWidth.value > 768 && windowWidth.value <= 1024
})

// 平板：iPad/Android 平板 userAgent，或宽度 769-1024（含 iPad 竖屏等）
const isTablet = computed(() => {
  const ua = navigator.userAgent
  const isTabletUA = /iPad|Android(?!.*Mobile)|Tablet|Silk/i.test(ua) ||
    (navigator.maxTouchPoints > 2 && /Mac|Windows/.test(ua))
  const isTabletWidth = windowWidth.value > 768 && windowWidth.value <= 1024
  return isTabletUA || isTabletWidth
})

// 获取当前楼层的所有导航项（合并所有类型，排除 hidden: true 的项）
const currentFloorItems = computed(() => {
  const exhibits = getExhibitsByFloor(props.currentFloor)
  // 过滤：排除 hidden: true 的项，显示所有其他类型
  const visibleItems = exhibits.filter(item => {
    return !item.hidden // 如果 hidden 为 true，则不显示
  })
  // 根据 id 去重，只保留第一个
  const uniqueItems = []
  const seenIds = new Set()
  for (const item of visibleItems) {
    if (!seenIds.has(item.id)) {
      seenIds.add(item.id)
      uniqueItems.push(item)
    }
  }
  return uniqueItems
})

function switchToExternal() {
  emit('switch-view', 'external')
}

function switchFloor(floor) {
  emit('switch-floor', floor)
}

function moveToExhibit(exhibit) {
  emit('move-to-exhibit', exhibit)
}

function toggleExpand() {
  isExpanded.value = !isExpanded.value
}
</script>

<style scoped>
/* CSS 变量定义 - 电脑端默认 */
.controls-container {
  --btn-padding-x: 15px;
  --btn-padding-y: 10px;
  --btn-font-size: 14px;
  --btn-min-width: 120px;
  --btn-min-height: 40px;
  --btn-gap: 8px;
  --group-padding: 10px;
  --group-gap: 10px;
  --container-top: 20px;
  --container-right: 10px;
  --safe-top: env(safe-area-inset-top, 0px);
  --safe-right: env(safe-area-inset-right, 0px);
  --group-border-radius: 8px;
  --btn-border-radius: 6px;
  --shadow-sm: 0 1px 3px rgba(0, 0, 0, 0.3);
  --shadow-md: 0 2px 10px rgba(0, 0, 0, 0.4);
  --shadow-lg: 0 2px 8px rgba(0, 0, 0, 0.5);
  --bg-primary: rgba(0, 0, 0, 0.65);
  --bg-secondary: rgba(30, 30, 30, 0.9);
  --bg-hover: rgba(60, 60, 60, 0.95);
  --bg-active: rgba(76, 175, 80, 0.9);
  --text-primary: #ffffff;
  --text-secondary: rgba(255, 255, 255, 0.9);
  --text-muted: rgba(255, 255, 255, 0.6);
  --border-color: rgba(255, 255, 255, 0.1);
}

.controls-container {
  position: fixed;
  top: var(--container-top);
  right: var(--container-right);
  z-index: 1000;
  display: flex;
  flex-direction: column;
  gap: var(--group-gap);
  max-width: calc(100vw - 40px);
  max-height: calc(100vh - 40px);
  max-height: calc(100dvh - 40px);
  overflow-y: auto;
  overflow-x: hidden;
  /* 自定义滚动条样式 */
  scrollbar-width: thin;
  scrollbar-color: rgba(255, 255, 255, 0.3) transparent;
  transition: opacity 0.3s ease, transform 0.3s ease;
}

.controls-container.collapsed {
  overflow: visible;
  opacity: 0.95;
}

.controls-container::-webkit-scrollbar {
  width: 6px;
}

.controls-container::-webkit-scrollbar-track {
  background: transparent;
}

.controls-container::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.3);
  border-radius: 3px;
}

.controls-container::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.5);
}

.control-group {
  display: flex;
  flex-direction: column;
  gap: var(--btn-gap);
  background: var(--bg-primary);
  backdrop-filter: blur(10px);
  padding: var(--group-padding);
  border-radius: var(--group-border-radius);
  box-shadow: var(--shadow-md);
  border: 1px solid var(--border-color);
  min-width: 0;
  flex-shrink: 0;
}

/* 展开/收缩动画 */
.slide-fade-enter-active {
  transition: all 0.35s cubic-bezier(0.4, 0, 0.2, 1);
  transition-property: opacity, transform, margin;
  transition-delay: var(--delay, 0ms);
}

.slide-fade-leave-active {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  transition-property: opacity, transform, margin;
}

.slide-fade-enter-from {
  opacity: 0;
  transform: translateX(30px) scale(0.9);
  margin-top: -10px;
  margin-bottom: -10px;
}

.slide-fade-leave-to {
  opacity: 0;
  transform: translateX(30px) scale(0.9);
  margin-top: -10px;
  margin-bottom: -10px;
}

.slide-fade-enter-to,
.slide-fade-leave-from {
  opacity: 1;
  transform: translateX(0) scale(1);
  margin-top: 0;
  margin-bottom: 0;
}

.group-title {
  font-size: 11px;
  color: var(--text-muted);
  font-weight: 600;
  text-transform: uppercase;
  margin-bottom: 2px;
  padding: 0 4px;
  letter-spacing: 0.5px;
}

.exhibit-buttons-container {
  display: flex;
  flex-direction: column;
  gap: var(--btn-gap);
  max-height: 60vh;
  max-height: 60dvh;
  overflow-y: auto;
  overflow-x: hidden;
}

.exhibit-buttons-container::-webkit-scrollbar {
  width: 4px;
}

.exhibit-buttons-container::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.3);
  border-radius: 2px;
}

.exhibit-buttons-container::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.5);
}

.control-btn {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  gap: 8px;
  padding: var(--btn-padding-y) var(--btn-padding-x);
  border: 1px solid var(--border-color);
  background: var(--bg-secondary);
  border-radius: var(--btn-border-radius);
  cursor: pointer;
  font-size: var(--btn-font-size);
  color: var(--text-primary);
  transition: all 0.2s ease;
  min-width: var(--btn-min-width);
  min-height: var(--btn-min-height);
  box-shadow: var(--shadow-sm);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  -webkit-tap-highlight-color: transparent;
  user-select: none;
  touch-action: manipulation;
}

.control-btn:hover:not(:active) {
  background: var(--bg-hover);
  border-color: rgba(255, 255, 255, 0.2);
  transform: translateY(-1px);
  box-shadow: var(--shadow-lg);
}

.control-btn:active {
  transform: translateY(0);
  box-shadow: var(--shadow-sm);
  background: rgba(50, 50, 50, 0.95);
}

.control-btn.active {
  background: var(--bg-active);
  color: var(--text-primary);
  border-color: rgba(76, 175, 80, 0.5);
}

.control-btn.active:hover:not(:active) {
  background: rgba(69, 160, 73, 0.95);
  border-color: rgba(76, 175, 80, 0.7);
}

.exhibit-btn {
  font-size: calc(var(--btn-font-size) - 1px);
  border: none;
  border-bottom: 1px solid var(--border-color);
  background: transparent;
  padding: calc(var(--btn-padding-y) - 1px) calc(var(--btn-padding-x) - 1px);
  box-shadow: none;
  border-radius: 0;
}

.exhibit-btn:last-child {
  border-bottom: none;
}

.exhibit-btn:hover:not(:active) {
  background: transparent;
  border-bottom: 1px solid var(--border-color);
  transform: none;
  box-shadow: none;
  opacity: 0.8;
}

.exhibit-btn:last-child:hover:not(:active) {
  border-bottom: none;
}

.exhibit-btn:active {
  background: transparent;
  border-bottom: 1px solid var(--border-color);
  box-shadow: none;
  transform: none;
  opacity: 0.6;
}

.exhibit-btn:last-child:active {
  border-bottom: none;
}

.btn-icon {
  font-size: 16px;
  font-weight: 600;
  flex-shrink: 0;
}

.btn-text {
  flex: 1;
  text-align: left;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.toggle-btn {
  position: fixed;
  right: 0;
  top: calc(var(--container-top));
  z-index: 1001;
  width: 20px;
  height: 36px;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.65);
  backdrop-filter: blur(10px);
  border: 1px solid var(--border-color);
  border-radius: 2px;
  box-shadow: var(--shadow-md);
  cursor: pointer;
  transition: all 0.3s ease;
  -webkit-tap-highlight-color: transparent;
  user-select: none;
  touch-action: manipulation;
}

.toggle-btn:hover:not(:active) {
  background: var(--bg-hover);
  border-color: rgba(255, 255, 255, 0.2);
  transform: scale(1.05);
  box-shadow: var(--shadow-lg);
}

.toggle-btn:active {
  transform: scale(0.95);
  box-shadow: var(--shadow-sm);
}

.toggle-icon {
  width: 20px;
  height: 20px;
  color: #ffffff;
  transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.3s ease;
  display: block;
}

.toggle-icon.expanded {
  transform: rotate(0deg);
}

/* ========== 手机端：小屏 (≤480px) ========== */
@media (max-width: 480px) {
  .controls-container {
    --btn-padding-x: 4px;
    --btn-padding-y: 3px;
    --btn-font-size: 12px;
    --btn-min-width: 60px;
    --btn-min-height: 30px;
    --btn-gap: 4px;
    --group-padding: 8px;
    --group-gap: 8px;
    --container-top: 8px;
    --container-right: 8px;
    max-width: calc(100vw - 16px);
    max-height: calc(100dvh - 16px);
  }

  .group-title {
    font-size: 10px;
  }

  .btn-icon {
    font-size: 14px;
  }

  .exhibit-buttons-container {
    max-height: 50vh;
    max-height: 50dvh;
  }

  .toggle-icon {
    width: 18px;
    height: 18px;
  }
}

/* ========== 手机端：中等屏 (481px - 768px) ========== */
@media (min-width: 481px) and (max-width: 768px) {
  .controls-container {
    --btn-padding-x: 4px;
    --btn-padding-y: 3px;
    --btn-font-size: 12px;
    --btn-min-width: 60px;
    --btn-min-height: 30px;
    --btn-gap: 4px;
    --group-padding: 8px;
    --group-gap: 8px;
    --container-top: 12px;
    --container-right: 12px;
    max-width: calc(100vw - 24px);
    max-height: calc(100dvh - 24px);
  }

  .group-title {
    font-size: 11px;
  }

  .btn-icon {
    font-size: 15px;
  }

  .toggle-icon {
    width: 19px;
    height: 19px;
  }
}

/* ========== 平板端 (769px - 1024px) ========== */
@media (min-width: 769px) and (max-width: 1024px) {
  .controls-container {
    --btn-padding-x: 4px;
    --btn-padding-y: 3px;
    --btn-font-size: 12px;
    --btn-min-width: 60px;
    --btn-min-height: 30px;
    --btn-gap: 4px;
    --group-padding: 8px;
    --group-gap: 8px;
    --container-top: 15px;
    --container-right: 15px;
  }

  .exhibit-buttons-container {
    max-height: 55vh;
    max-height: 55dvh;
  }
}

/* ========== 电脑端 (>1024px) ========== */
@media (min-width: 1025px) {
  .controls-container {
    --btn-padding-x: 8px;
    --btn-padding-y: 6px;
    --btn-font-size: 14px;
    --btn-min-width: 80px;
    --btn-min-height: 36px;
  }
}

/* 触摸设备优化 */
@media (hover: none) and (pointer: coarse) {
  .control-btn {
    min-height: 44px;
    padding: 12px 15px;
  }

  .control-btn:hover {
    transform: none;
  }

  .control-btn:active {
    background: rgba(50, 50, 50, 0.95);
    transform: scale(0.98);
  }

  .control-btn.active:active {
    background: rgba(61, 139, 64, 0.95);
  }

  .toggle-btn:active {
    transform: scale(0.95);
  }
}

/* 高DPI屏幕优化 */
@media (-webkit-min-device-pixel-ratio: 2), (min-resolution: 192dpi) {
  .control-group {
    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.5);
  }

  .control-btn {
    box-shadow: 0 1px 4px rgba(0, 0, 0, 0.4);
  }

  .exhibit-btn {
    box-shadow: none;
  }
}
</style>

