<template>
  <el-dialog
    :model-value="visible"
    @update:model-value="handleUpdateVisible"
    :title="title"
    width="90%"
    :fullscreen="isFullscreen"
    :show-close="false"
    :before-close="handleClose"
    align-center
    class="page-modal"
    destroy-on-close
  >
    <template #header>
      <div class="dialog-header">
        <span>{{ title }}</span>
        <div class="header-buttons">
          <div
            @click="toggleFullscreen"
            class="action-btn fullscreen-btn"
            title="全屏"
          >
            <svg
              v-if="!isFullscreen"
              class="action-icon"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"></path>
            </svg>
            <svg
              v-else
              class="action-icon"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3"></path>
            </svg>
          </div>
          <div
            @click="handleClose"
            class="action-btn close-btn"
            title="关闭"
          >
            <svg
              class="action-icon"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </div>
        </div>
      </div>
    </template>
    <div ref="pageContainerRef" class="page-container" :style="{ height: containerHeight }">
      <div v-if="url && iframeLoading" class="page-loading">
        <div class="loading-spinner"></div>
        <p class="loading-text">页面加载中...</p>
      </div>
      <iframe
        v-if="url"
        :src="url"
        :class="['page-iframe', { 'iframe-hidden': iframeLoading }]"
        frameborder="0"
        allowfullscreen
        @load="onIframeLoad"
      ></iframe>
      <div v-else class="page-error">
        <p>页面地址未配置</p>
      </div>
    </div>
  </el-dialog>
</template>

<script setup>
import { computed, ref, watch, nextTick, onMounted, onUnmounted } from 'vue'

const props = defineProps({
  visible: {
    type: Boolean,
    default: false
  },
  item: {
    type: Object,
    default: null
  }
})

const emit = defineEmits(['close'])

const title = computed(() => {
  return props.item?.name || props.item?.title || '页面'
})

const url = computed(() => {
  return props.item?.url || props.item?.pageUrl || null
})

const isFullscreen = ref(false)
const pageContainerRef = ref(null)
const containerHeight = ref('70vh')
const iframeLoading = ref(true)

function onIframeLoad() {
  iframeLoading.value = false
}

// 计算容器高度
function calculateContainerHeight() {
  if (!props.visible) return
  
  nextTick(() => {
    if (!pageContainerRef.value) {
      // 如果元素还未渲染，延迟重试
      setTimeout(calculateContainerHeight, 50)
      return
    }
    
    // 获取弹框元素
    const dialogElement = pageContainerRef.value.closest('.el-dialog')
    if (!dialogElement) {
      // 如果弹框还未渲染，延迟重试
      setTimeout(calculateContainerHeight, 50)
      return
    }
    
    // 获取 header 高度
    const dialogHeader = dialogElement.querySelector('.el-dialog__header')
    const headerHeight = dialogHeader ? dialogHeader.offsetHeight : 0
    
    // 获取 body 的 padding
    const dialogBody = dialogElement.querySelector('.el-dialog__body')
    const bodyStyle = dialogBody ? window.getComputedStyle(dialogBody) : null
    const bodyPaddingTop = bodyStyle ? parseFloat(bodyStyle.paddingTop) || 20 : 20
    const bodyPaddingBottom = bodyStyle ? parseFloat(bodyStyle.paddingBottom) || 20 : 20
    
    if (isFullscreen.value) {
      // 全屏模式：使用视口高度减去 header 和 padding
      const viewportHeight = window.innerHeight
      const availableHeight = viewportHeight - headerHeight - bodyPaddingTop - bodyPaddingBottom
      containerHeight.value = `${Math.max(availableHeight, 400)}px`
    } else {
      // 非全屏模式：使用弹框高度减去 header 和 padding
      const dialogHeight = dialogElement.offsetHeight
      const availableHeight = dialogHeight - headerHeight - bodyPaddingTop - bodyPaddingBottom
      
      if (availableHeight > 0) {
        containerHeight.value = `${Math.max(availableHeight, 400)}px`
      } else {
        // 如果计算失败，使用默认值
        containerHeight.value = '70vh'
      }
    }
  })
}

// 切换全屏
function toggleFullscreen() {
  isFullscreen.value = !isFullscreen.value
  // 全屏状态变化后重新计算高度
  setTimeout(() => {
    calculateContainerHeight()
  }, 100) // 延迟一下确保 el-dialog 的动画完成
}

// 监听弹框显示/隐藏
watch(() => props.visible, (newVal) => {
  if (newVal) {
    // 弹框显示时重置 iframe 加载状态
    iframeLoading.value = true
    // 弹框显示时计算高度
    calculateContainerHeight()
    // 监听窗口大小变化
    window.addEventListener('resize', calculateContainerHeight)
  } else {
    // 弹框关闭时清理
    window.removeEventListener('resize', calculateContainerHeight)
    if (isFullscreen.value) {
      isFullscreen.value = false
    }
  }
})

// 监听全屏状态变化
watch(() => isFullscreen.value, () => {
  calculateContainerHeight()
})

onMounted(() => {
  if (props.visible) {
    calculateContainerHeight()
    window.addEventListener('resize', calculateContainerHeight)
  }
})

onUnmounted(() => {
  window.removeEventListener('resize', calculateContainerHeight)
})

function handleClose() {
  emit('close')
}

function handleUpdateVisible(value) {
  if (!value) {
    emit('close')
  }
}
</script>

<style scoped>
.page-modal {
  z-index: 2000;
}

.dialog-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
}

.header-buttons {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-left: auto;
}

.action-btn {
  padding: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  border-radius: 50%;
  transition: background-color 0.2s;
  width: 32px;
  height: 32px;
}

.action-btn:hover {
  background-color: rgba(0, 0, 0, 0.06);
}

.action-btn:active {
  background-color: rgba(0, 0, 0, 0.12);
}

.close-btn:hover {
  background-color: rgba(245, 101, 101, 0.1);
}

.close-btn:active {
  background-color: rgba(245, 101, 101, 0.2);
}

.action-icon {
  width: 16px;
  height: 16px;
  color: currentColor;
}

.page-container {
  width: 100%;
  position: relative;
  transition: height 0.3s ease;
}

.page-loading {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: #fff;
  z-index: 1;
  border-radius: 4px;
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 3px solid #e5e7eb;
  border-top-color: #409eff;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.loading-text {
  margin-top: 12px;
  color: #999;
  font-size: 14px;
}

.page-iframe {
  width: 100%;
  height: 100%;
  overflow-y: auto;
  border: none;
  border-radius: 4px;
  opacity: 1;
  transition: opacity 0.3s ease;
}

.iframe-hidden {
  opacity: 0;
}

.page-error {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: #999;
  font-size: 14px;
}

/* 移动端适配 */
@media (max-width: 768px) {
  .page-container {
    height: 60vh;
    min-height: 300px;
  }
}
</style>

