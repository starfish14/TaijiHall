<template>
  <el-dialog
    :model-value="visible"
    @update:model-value="handleUpdateVisible"
    :title="title"
    width="85%"
    :fullscreen="isFullscreen"
    :show-close="false"
    :before-close="handleClose"
    class="rich-text-modal"
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
    <div ref="contentContainerRef" class="content-container" :style="{ height: containerHeight }">
      <div 
        v-if="content" 
        class="rich-text-content" 
        v-html="content"
      ></div>
      <div v-else class="content-error">
        <p>内容未配置</p>
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
  return props.item?.title || props.item?.name || '富文本内容'
})

const content = computed(() => {
  return props.item?.text || props.item?.content || null
})

const isFullscreen = ref(false)
const contentContainerRef = ref(null)
const containerHeight = ref('70vh')

// 计算容器高度
function calculateContainerHeight() {
  if (!props.visible) return
  
  nextTick(() => {
    if (!contentContainerRef.value) {
      setTimeout(calculateContainerHeight, 50)
      return
    }
    
    const dialogElement = contentContainerRef.value.closest('.el-dialog')
    if (!dialogElement) {
      setTimeout(calculateContainerHeight, 50)
      return
    }
    
    const dialogHeader = dialogElement.querySelector('.el-dialog__header')
    const headerHeight = dialogHeader ? dialogHeader.offsetHeight : 0
    
    const dialogBody = dialogElement.querySelector('.el-dialog__body')
    const bodyStyle = dialogBody ? window.getComputedStyle(dialogBody) : null
    const bodyPaddingTop = bodyStyle ? parseFloat(bodyStyle.paddingTop) || 20 : 20
    const bodyPaddingBottom = bodyStyle ? parseFloat(bodyStyle.paddingBottom) || 20 : 20
    
    if (isFullscreen.value) {
      const viewportHeight = window.innerHeight
      const availableHeight = viewportHeight - headerHeight - bodyPaddingTop - bodyPaddingBottom
      containerHeight.value = `${Math.max(availableHeight, 400)}px`
    } else {
      const dialogHeight = dialogElement.offsetHeight
      const availableHeight = dialogHeight - headerHeight - bodyPaddingTop - bodyPaddingBottom
      
      if (availableHeight > 0) {
        containerHeight.value = `${Math.max(availableHeight, 400)}px`
      } else {
        containerHeight.value = '70vh'
      }
    }
  })
}

// 切换全屏
function toggleFullscreen() {
  isFullscreen.value = !isFullscreen.value
  setTimeout(() => {
    calculateContainerHeight()
  }, 100)
}

// 监听弹框显示/隐藏
watch(() => props.visible, (newVal) => {
  if (newVal) {
    calculateContainerHeight()
    window.addEventListener('resize', calculateContainerHeight)
  } else {
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
.rich-text-modal {
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

.content-container {
  width: 100%;
  position: relative;
  transition: height 0.3s ease;
  overflow-y: auto;
}

.rich-text-content {
  width: 100%;
  padding: 20px;
  line-height: 1.6;
  color: #333;
}

.rich-text-content :deep(h1),
.rich-text-content :deep(h2),
.rich-text-content :deep(h3),
.rich-text-content :deep(h4),
.rich-text-content :deep(h5),
.rich-text-content :deep(h6) {
  margin-top: 1em;
  margin-bottom: 0.5em;
  font-weight: 600;
}

.rich-text-content :deep(p) {
  margin: 0.5em 0;
}

.rich-text-content :deep(ul),
.rich-text-content :deep(ol) {
  margin: 0.5em 0;
  padding-left: 2em;
}

.rich-text-content :deep(li) {
  margin: 0.25em 0;
}

.rich-text-content :deep(img) {
  max-width: 100%;
  height: auto;
  display: block;
  margin: 1em 0;
}

.rich-text-content :deep(a) {
  color: #409eff;
  text-decoration: none;
}

.rich-text-content :deep(a:hover) {
  text-decoration: underline;
}

.rich-text-content :deep(table) {
  width: 100%;
  border-collapse: collapse;
  margin: 1em 0;
}

.rich-text-content :deep(th),
.rich-text-content :deep(td) {
  border: 1px solid #ddd;
  padding: 8px;
  text-align: left;
}

.rich-text-content :deep(th) {
  background-color: #f5f5f5;
  font-weight: 600;
}

.content-error {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: #999;
  font-size: 14px;
}

/* 移动端适配 */
@media (max-width: 768px) {
  .rich-text-content {
    padding: 15px;
    font-size: 14px;
  }
}
</style>

