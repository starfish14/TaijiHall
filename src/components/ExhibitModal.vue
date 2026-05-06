<template>
  <!-- 仅图片时使用 el-image-viewer 全屏预览 -->
  <el-image-viewer
    v-if="visible && isImagesOnly"
    class="exhibit-modal"
    :url-list="exhibit.images"
    :initial-index="0"
    show-progress
    @close="handleClose"
  />

  <!-- 含视频/音频时使用与 el-image-viewer 一致样式的全屏查看器 -->
  <Teleport to="body">
    <Transition name="viewer-fade" appear>
      <div
        v-if="visible && hasMixedMedia"
        ref="viewerWrapperRef"
        class="exhibit-media-viewer"
        :style="{ zIndex: 2000 }"
        tabindex="-1"
      >
        <div class="exhibit-media-viewer__mask" @click.self="handleMaskClick" />
        <span class="exhibit-media-viewer__btn exhibit-media-viewer__close" @click="handleClose">
          <el-icon><Close /></el-icon>
        </span>
        <template v-if="mediaList.length > 1">
          <span
            :class="['exhibit-media-viewer__btn', 'exhibit-media-viewer__prev', { 'is-disabled': currentIndex === 0 }]"
            @click="prev"
          >
            <el-icon><ArrowLeft /></el-icon>
          </span>
          <span
            :class="['exhibit-media-viewer__btn', 'exhibit-media-viewer__next', { 'is-disabled': currentIndex === mediaList.length - 1 }]"
            @click="next"
          >
            <el-icon><ArrowRight /></el-icon>
          </span>
        </template>
        <div class="exhibit-media-viewer__btn exhibit-media-viewer__progress">
          {{ currentItem?.name || `${currentIndex + 1} / ${mediaList.length}` }}
        </div>
        <!-- 图片模式下的操作工具栏（与 el-image-viewer 一致） -->
        <div
          v-if="currentItem?.type === 'image'"
          class="exhibit-media-viewer__actions"
        >
          <div class="exhibit-media-viewer__actions__inner">
            <span class="action-icon" title="缩小" @click="imgZoomOut">
              <el-icon><ZoomOut /></el-icon>
            </span>
            <span class="action-icon" title="放大" @click="imgZoomIn">
              <el-icon><ZoomIn /></el-icon>
            </span>
            <i class="exhibit-media-viewer__actions__divider" />
            <span class="action-icon" :title="imgMode === 'contain' ? '原始大小' : '适应窗口'" @click="imgToggleMode">
              <el-icon><FullScreen v-if="imgMode === 'contain'" /><ScaleToOriginal v-else /></el-icon>
            </span>
            <i class="exhibit-media-viewer__actions__divider" />
            <span class="action-icon" title="逆时针旋转" @click="imgRotateLeft">
              <el-icon><RefreshLeft /></el-icon>
            </span>
            <span class="action-icon" title="顺时针旋转" @click="imgRotateRight">
              <el-icon><RefreshRight /></el-icon>
            </span>
          </div>
        </div>
        <div class="exhibit-media-viewer__canvas" :class="{ 'is-original': currentItem?.type === 'image' && imgMode === 'original' }">
          <template v-if="currentItem?.type === 'image'">
            <div
              v-if="imgLoading"
              class="exhibit-media-viewer__loading"
            >
              <div class="loading-spinner" />
            </div>
            <img
              v-show="!imgLoading"
              :key="`img-${currentItem?.url}`"
              :src="currentItem.url"
              :style="imgStyle"
              class="exhibit-media-viewer__img"
              alt=""
              draggable="false"
              @load="onImgLoad"
              @error="onImgError"
              @mousedown="onImgMouseDown"
              @touchstart.prevent="onImgTouchStart"
            />
          </template>
          <VideoPlayer
            v-else-if="currentItem?.type === 'video'"
            :key="`video-${currentItem?.url}`"
            :src="currentItem.url"
            :title="currentItem.name"
            :autoplay="true"
          />
          <AudioPlayer
            v-else-if="currentItem?.type === 'audio'"
            :key="`audio-${currentItem?.url}`"
            :src="currentItem.url"
            :title="currentItem.name"
            :autoplay="true"
          />
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { computed, ref, watch, onUnmounted, nextTick } from 'vue'
import { ZoomOut, ZoomIn, FullScreen, ScaleToOriginal, RefreshLeft, RefreshRight, ArrowLeft, ArrowRight, Close } from '@element-plus/icons-vue'
import AudioPlayer from './AudioPlayer.vue'
import VideoPlayer from './VideoPlayer.vue'

const MIN_SCALE = 0.2
const MAX_SCALE = 7
const ZOOM_RATE = 1.2
const ROTATE_DEG = 90

const props = defineProps({
  visible: {
    type: Boolean,
    default: false
  },
  exhibit: {
    type: Object,
    default: null
  }
})

const emit = defineEmits(['close'])

// 从 URL 提取文件名（不含路径，可含扩展名）
function getFileName(url) {
  if (!url || typeof url !== 'string') return ''
  const parts = url.split('/')
  const last = parts[parts.length - 1]
  return last || url
}

// 统一媒体列表：{ type, url, name }
const mediaList = computed(() => {
  const list = []
  const e = props.exhibit
  if (!e) return list

  const addItems = (arr, type) => {
    if (!arr?.length) return
    arr.forEach(item => {
      const url = typeof item === 'string' ? item : item.url
      const title = typeof item === 'object' && item?.title ? item.title : ''
      const name = title || getFileName(url) || url
      list.push({ type, url, name })
    })
  }

  addItems(e.images, 'image')
  addItems(e.videos, 'video')
  addItems(e.audio, 'audio')
  return list
})

// 是否有任意媒体内容
const hasMedia = computed(() => mediaList.value.length > 0)

// 仅图片（无视频、无音频）时用 el-image-viewer
const isImagesOnly = computed(() => {
  const e = props.exhibit
  if (!e) return false
  const hasImages = e.images?.length > 0
  const hasVideos = e.videos?.length > 0
  const hasAudio = e.audio?.length > 0
  return hasImages && !hasVideos && !hasAudio
})

// 含视频或音频，需用自定义查看器
const hasMixedMedia = computed(() => hasMedia.value && !isImagesOnly.value)

const currentIndex = ref(0)
const currentItem = computed(() => mediaList.value[currentIndex.value] || null)

// 图片查看器状态（与 el-image-viewer 一致）
const imgTransform = ref({
  scale: 1,
  deg: 0,
  offsetX: 0,
  offsetY: 0,
  enableTransition: false
})
const imgMode = ref('contain') // contain | original
const imgLoading = ref(true)
const imgLoadError = ref(false)
const viewerWrapperRef = ref(null)

// 图片样式（与 el-image-viewer 一致）
const imgStyle = computed(() => {
  const { scale, deg, offsetX, offsetY, enableTransition } = imgTransform.value
  let translateX = offsetX / scale
  let translateY = offsetY / scale
  const radian = (deg * Math.PI) / 180
  const cosRadian = Math.cos(radian)
  const sinRadian = Math.sin(radian)
  translateX = translateX * cosRadian + translateY * sinRadian
  translateY = translateY * cosRadian - (offsetX / scale) * sinRadian
  const style = {
    transform: `scale(${scale}) rotate(${deg}deg) translate(${translateX}px, ${translateY}px)`,
    transition: enableTransition ? 'transform .3s' : ''
  }
  if (imgMode.value === 'contain') {
    style.maxWidth = style.maxHeight = '100%'
  } else {
    // original：覆盖 CSS 的 max-width/max-height，显示原始尺寸
    style.maxWidth = style.maxHeight = 'none'
  }
  return style
})

function clamp(val, min, max) {
  return Math.min(Math.max(val, min), max)
}

function resetImgTransform() {
  imgTransform.value = {
    scale: 1,
    deg: 0,
    offsetX: 0,
    offsetY: 0,
    enableTransition: false
  }
}

function imgZoomIn() {
  if (imgLoadError.value) return
  const { scale } = imgTransform.value
  if (scale < MAX_SCALE) {
    imgTransform.value = {
      ...imgTransform.value,
      scale: clamp(scale * ZOOM_RATE, MIN_SCALE, MAX_SCALE),
      enableTransition: true
    }
  }
}

function imgZoomOut() {
  if (imgLoadError.value) return
  const { scale } = imgTransform.value
  if (scale > MIN_SCALE) {
    imgTransform.value = {
      ...imgTransform.value,
      scale: clamp(scale / ZOOM_RATE, MIN_SCALE, MAX_SCALE),
      enableTransition: true
    }
  }
}

function imgToggleMode() {
  if (imgLoadError.value) return
  imgMode.value = imgMode.value === 'contain' ? 'original' : 'contain'
  resetImgTransform()
}

function imgRotateLeft() {
  if (imgLoadError.value) return
  imgTransform.value = {
    ...imgTransform.value,
    deg: imgTransform.value.deg - ROTATE_DEG,
    enableTransition: true
  }
}

function imgRotateRight() {
  if (imgLoadError.value) return
  imgTransform.value = {
    ...imgTransform.value,
    deg: imgTransform.value.deg + ROTATE_DEG,
    enableTransition: true
  }
}

function onImgLoad() {
  imgLoading.value = false
  imgLoadError.value = false
}

function onImgError() {
  imgLoading.value = false
  imgLoadError.value = true
}

function onImgMouseDown(e) {
  if (imgLoading.value || imgLoadError.value || e.button !== 0) return
  imgTransform.value.enableTransition = false
  const { offsetX, offsetY } = imgTransform.value
  const startX = e.pageX
  const startY = e.pageY

  const onMove = (ev) => {
    imgTransform.value = {
      ...imgTransform.value,
      offsetX: offsetX + ev.pageX - startX,
      offsetY: offsetY + ev.pageY - startY
    }
  }
  const onUp = () => {
    document.removeEventListener('mousemove', onMove)
    document.removeEventListener('mouseup', onUp)
  }
  document.addEventListener('mousemove', onMove)
  document.addEventListener('mouseup', onUp)
  e.preventDefault()
}

function onImgTouchStart(e) {
  if (imgLoading.value || imgLoadError.value || e.touches.length !== 1) return
  imgTransform.value.enableTransition = false
  const { offsetX, offsetY } = imgTransform.value
  const startX = e.touches[0].pageX
  const startY = e.touches[0].pageY

  const onMove = (ev) => {
    if (ev.touches.length !== 1) return
    imgTransform.value = {
      ...imgTransform.value,
      offsetX: offsetX + ev.touches[0].pageX - startX,
      offsetY: offsetY + ev.touches[0].pageY - startY
    }
  }
  const onEnd = () => {
    document.removeEventListener('touchmove', onMove)
    document.removeEventListener('touchend', onEnd)
  }
  document.addEventListener('touchmove', onMove, { passive: true })
  document.addEventListener('touchend', onEnd)
}

watch(
  () => [props.visible, props.exhibit],
  () => {
    if (!props.visible || !props.exhibit) return
    currentIndex.value = 0
    resetImgTransform()
    imgMode.value = 'contain'
    imgLoading.value = true
    imgLoadError.value = false
  },
  { immediate: true }
)

// 切换媒体项时重置图片状态
watch(currentItem, (item) => {
  if (item?.type === 'image') {
    imgLoading.value = true
    imgLoadError.value = false
    resetImgTransform()
    imgMode.value = 'contain'
  }
})

function onKeydown(e) {
  if (!props.visible || !hasMixedMedia.value) return
  if (e.code === 'Escape') {
    handleClose()
    return
  }
  const isImage = currentItem.value?.type === 'image'
  if (isImage) {
    if (e.code === 'ArrowUp') {
      e.preventDefault()
      imgZoomIn()
      return
    }
    if (e.code === 'ArrowDown') {
      e.preventDefault()
      imgZoomOut()
      return
    }
    if (e.code === 'Space') {
      e.preventDefault()
      imgToggleMode()
      return
    }
  }
  if (e.code === 'ArrowLeft') {
    prev()
  } else if (e.code === 'ArrowRight') {
    next()
  }
}

function onWheel(e) {
  if (currentItem.value?.type !== 'image' || imgLoading.value || imgLoadError.value) return
  const delta = e.deltaY || e.deltaX
  if (delta < 0) {
    imgZoomIn()
  } else {
    imgZoomOut()
  }
  e.preventDefault()
}

let wheelBoundEl = null

function bindWheelListener() {
  const el = viewerWrapperRef.value
  if (el && el !== wheelBoundEl) {
    el.addEventListener('wheel', onWheel, { passive: false })
    wheelBoundEl = el
  }
}

function unbindWheelListener() {
  if (wheelBoundEl) {
    wheelBoundEl.removeEventListener('wheel', onWheel)
    wheelBoundEl = null
  }
}

watch(
  () => props.visible && hasMixedMedia.value,
  async (show) => {
    if (show) {
      document.addEventListener('keydown', onKeydown)
      await nextTick()
      bindWheelListener()
    } else {
      document.removeEventListener('keydown', onKeydown)
      unbindWheelListener()
    }
  }
)

onUnmounted(() => {
  document.removeEventListener('keydown', onKeydown)
  unbindWheelListener()
})

function prev() {
  if (currentIndex.value > 0) {
    currentIndex.value--
  }
}

function next() {
  if (currentIndex.value < mediaList.value.length - 1) {
    currentIndex.value++
  }
}

function handleMaskClick() {
  emit('close')
}

function handleClose() {
  emit('close')
}
</script>

<style scoped>
.exhibit-media-viewer {
  position: fixed;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.exhibit-media-viewer__mask {
  position: absolute;
  inset: 0;
  background-color: rgba(0, 0, 0, 0.5);
}

.exhibit-media-viewer__btn {
  position: absolute;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  color: #fff;
  cursor: pointer;
  background-color: var(--el-text-color-regular);
  border-radius: 50%;
  opacity: 0.8;
  transition: background-color 0.2s;
  z-index: 1;
}

.exhibit-media-viewer__btn:hover:not(.is-disabled) {
  background-color: var(--el-text-color-primary);
}

.exhibit-media-viewer__btn.is-disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.exhibit-media-viewer__close {
  top: 40px;
  right: 40px;
}

.exhibit-media-viewer__prev {
  left: 40px;
  top: 50%;
  transform: translateY(-50%);
}

.exhibit-media-viewer__close :deep(.el-icon),
.exhibit-media-viewer__prev :deep(.el-icon),
.exhibit-media-viewer__next :deep(.el-icon) {
  font-size: 24px;
}

.exhibit-media-viewer__next {
  right: 40px;
  top: 50%;
  transform: translateY(-50%);
}

.exhibit-media-viewer__progress {
  bottom: 90px;
  left: 50%;
  transform: translateX(-50%);
  width: auto;
  min-width: 60px;
  padding: 0 12px;
  font-size: 14px;
  border-radius: 20px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 60vw;
}

/* 操作工具栏（与 el-image-viewer 一致） */
.exhibit-media-viewer__actions {
  position: absolute;
  bottom: 30px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  justify-content: center;
  height: 44px;
  padding: 0 23px;
  background-color: var(--el-text-color-regular);
  border-radius: 22px;
  z-index: 1;
}

.exhibit-media-viewer__actions__inner {
  display: flex;
  align-items: center;
  justify-content: space-around;
  gap: 22px;
  color: #fff;
  font-size: 23px;
}

.exhibit-media-viewer__actions__divider {
  width: 1px;
  height: 16px;
  margin: 0 -6px;
  background-color: rgba(255, 255, 255, 0.5);
}

.action-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: opacity 0.2s;
}

.action-icon:hover {
  opacity: 0.8;
}

.action-icon :deep(.el-icon) {
  font-size: 20px;
}

.viewer-icon {
  width: 24px;
  height: 24px;
}

.exhibit-media-viewer__canvas {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  user-select: none;
  z-index: 0;
}

.exhibit-media-viewer__canvas.is-original {
  overflow: auto;
}

.exhibit-media-viewer__img {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
  cursor: grab;
}

.exhibit-media-viewer__img:active {
  cursor: grabbing;
}

.exhibit-media-viewer__loading {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 3px solid rgba(255, 255, 255, 0.3);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* 与 el-image-viewer 一致的过渡动画 */
.viewer-fade-enter-active,
.viewer-fade-leave-active {
  transition: opacity 0.3s;
}

.viewer-fade-enter-from,
.viewer-fade-leave-to {
  opacity: 0;
}

@media (max-width: 768px) {
  .exhibit-media-viewer__close {
    top: 16px;
    right: 16px;
  }

  .exhibit-media-viewer__prev {
    left: 16px;
  }

  .exhibit-media-viewer__next {
    right: 16px;
  }

  .exhibit-media-viewer__progress {
    bottom: 80px;
    font-size: 12px;
  }

  .exhibit-media-viewer__actions {
    bottom: 16px;
    padding: 0 16px;
    height: 40px;
  }

  .exhibit-media-viewer__actions__inner {
    gap: 16px;
    font-size: 18px;
  }
}
</style>
