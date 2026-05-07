<template>
  <div class="home-container">
    <Scene3D
      ref="sceneRef"
      :model-path="modelPath"
      :view-mode="viewMode"
      :current-floor="currentFloor"
      @item-click="handleItemClick"
      @exhibit-click="handleExhibitClick"
      @loading-complete="handleLoadingComplete"
    />
    
    <Controls
      v-if="isModelLoaded"
      :view-mode="viewMode"
      :current-floor="currentFloor"
      @switch-view="handleSwitchView"
      @switch-floor="handleSwitchFloor"
      @switch-fixed-view="handleSwitchFixedView"
      @switch-orbit="handleSwitchOrbit"
      @move-to-exhibit="handleMoveToExhibit"
    />
    
    <HelpTooltip />
    
    <ExhibitModal
      :visible="showExhibitModal"
      :exhibit="selectedExhibit"
      @close="closeExhibitModal"
    />
    
    <PageModal
      :visible="showPageModal"
      :item="selectedPageItem"
      @close="closePageModal"
    />
    
    <RichTextModal
      :visible="showRichTextModal"
      :item="selectedRichTextItem"
      @close="closeRichTextModal"
    />
  </div>
</template>

<script setup>
import { ref } from 'vue'
import Scene3D from '@/components/Scene3D.vue'
import Controls from '@/components/Controls.vue'
import HelpTooltip from '@/components/HelpTooltip.vue'
import ExhibitModal from '@/components/ExhibitModal.vue'
import PageModal from '@/components/PageModal.vue'
import RichTextModal from '@/components/RichTextModal.vue'

const sceneRef = ref(null)
const modelBaseUrl = import.meta.env.VITE_MODEL_BASE_URL?.replace(/\/+$/, '')
const modelPath = ref(
  modelBaseUrl ? `${modelBaseUrl}/exhibit.glb` : '/models/exhibit.glb'
)
const viewMode = ref('external') // external, internal
const currentFloor = ref(1)
const showExhibitModal = ref(false)
const selectedExhibit = ref(null)
const showPageModal = ref(false)
const selectedPageItem = ref(null)
const showRichTextModal = ref(false)
const selectedRichTextItem = ref(null)
const isModelLoaded = ref(false)

if (modelBaseUrl) {
  console.log('[Model] 使用云端模型地址:', modelPath.value)
} else {
  console.log('[Model] 未配置 VITE_MODEL_BASE_URL，回退本地模型地址:', modelPath.value)
}

/**
 * 通用弹窗打开逻辑：
 * - 同一展品重复点击不重新打开
 * - 切换不同展品时先关闭再重新打开，避免内容残留
 */
function openModal(showRef, selectedRef, item) {
  if (showRef.value && selectedRef.value?.id === item.id) return
  if (showRef.value) {
    showRef.value = false
    selectedRef.value = null
    setTimeout(() => {
      selectedRef.value = { ...item }
      showRef.value = true
    }, 150)
  } else {
    selectedRef.value = { ...item }
    showRef.value = true
  }
}

function handleSwitchView(mode) {
  viewMode.value = mode
  if (sceneRef.value) {
    if (mode === 'external') {
      sceneRef.value.switchToExternal()
    } else {
      sceneRef.value.switchToInternal()
    }
  }
}

function handleSwitchFloor(floor) {
  currentFloor.value = floor
  // 切换楼层时自动切换到内部模式
  if (viewMode.value !== 'internal') {
    viewMode.value = 'internal'
    if (sceneRef.value) {
      sceneRef.value.switchToInternal()
    }
  }
}

function handleSwitchFixedView(index) {
  if (sceneRef.value) {
    sceneRef.value.switchToFixedView(index)
  }
}

function handleSwitchOrbit() {
  if (sceneRef.value) {
    sceneRef.value.switchToOrbitMode()
  }
}

function handleMoveToExhibit(exhibit) {
  if (sceneRef.value) {
    sceneRef.value.moveToExhibit(exhibit)
  }
}

// 统一的交互项点击处理
function handleItemClick(item) {
  const itemType = item.type || 'exhibit'
  
  if (itemType === 'pageLink') {
    // 页面跳转：在弹框中加载页面
    handlePageLinkClick(item)
  } else if (itemType === 'richText') {
    // 富文本：在弹框中显示富文本内容
    handleRichTextClick(item)
  } else {
    // 展品：显示展品详情
    handleExhibitClick(item)
  }
}

function handleExhibitClick(exhibit) {
  openModal(showExhibitModal, selectedExhibit, exhibit)
}

function closeExhibitModal() {
  showExhibitModal.value = false
  selectedExhibit.value = null
}

function handlePageLinkClick(item) {
  openModal(showPageModal, selectedPageItem, item)
}

function closePageModal() {
  showPageModal.value = false
  selectedPageItem.value = null
}

function handleRichTextClick(item) {
  openModal(showRichTextModal, selectedRichTextItem, item)
}

function closeRichTextModal() {
  showRichTextModal.value = false
  selectedRichTextItem.value = null
}

function handleLoadingComplete() {
  isModelLoaded.value = true
}
</script>

<style scoped>
.home-container {
  width: 100vw;
  height: 100vh;
  height: 100dvh;
  position: relative;
  overflow: hidden;
}
</style>

