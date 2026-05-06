<template>
  <div class="video-player-wrap">
    <div ref="fullscreenRef" class="video-player" :class="{ 'video-player--fullscreen': isFullscreen }">
      <div class="video-player__title">{{ title || '视频' }}</div>
      <div class="video-player__screen" @click="togglePlay">
        <div class="video-player__video-wrap">
          <video
            ref="videoRef"
            :src="src"
            class="video-player__video"
            playsinline
            @timeupdate="onTimeUpdate"
            @loadedmetadata="onLoaded"
            @play="playing = true"
            @pause="playing = false"
            @ended="playing = false"
          >
            您的浏览器不支持视频播放
          </video>
          <div v-if="!playing" class="video-player__play-overlay" @click.stop="togglePlay">
            <el-icon :size="64"><VideoPlay /></el-icon>
          </div>
        </div>
      </div>
      <div class="video-player__info">
        <div class="video-player__time">
          <span>{{ formatTime(currentTime) }}</span>
          <span class="video-player__time-sep">/</span>
          <span>{{ formatTime(duration) }}</span>
        </div>
        <div class="video-player__progress" @click="onProgressClick">
          <div class="video-player__progress-bar" :style="{ width: progressPercent + '%' }" />
        </div>
        <div class="video-player__controls">
          <button class="video-player__btn" @click="togglePlay">
            <el-icon v-if="playing" :size="24"><VideoPause /></el-icon>
            <el-icon v-else :size="24"><VideoPlay /></el-icon>
          </button>
          <button class="video-player__btn video-player__btn--volume" :title="muted ? '取消静音' : '静音'" @click="toggleMute">
            <el-icon :size="20"><Mute v-if="muted" /><Headset v-else /></el-icon>
          </button>
          <button class="video-player__btn" type="button" :title="isFullscreen ? '退出全屏' : '全屏播放'" @click.stop="toggleFullscreen">
            <el-icon :size="20"><FullScreen v-if="!isFullscreen" /><ScaleToOriginal v-else /></el-icon>
          </button>
          <input
            :value="volume"
            type="range"
            class="video-player__volume"
            min="0"
            max="100"
            @input="onVolumeChange"
          >
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, watch, nextTick, onMounted, onUnmounted } from 'vue'
import { VideoPlay, VideoPause, Mute, Headset, FullScreen, ScaleToOriginal } from '@element-plus/icons-vue'

const props = defineProps({
  src: {
    type: String,
    default: ''
  },
  title: {
    type: String,
    default: ''
  },
  autoplay: {
    type: Boolean,
    default: false
  }
})

const videoRef = ref(null)
const fullscreenRef = ref(null)
const isFullscreen = ref(false)
const currentTime = ref(0)
const duration = ref(0)
const playing = ref(false)
const muted = ref(false)
const volume = ref(80)

const progressPercent = computed(() => {
  if (duration.value <= 0) return 0
  return (currentTime.value / duration.value) * 100
})

function formatTime(seconds) {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00'
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

function onTimeUpdate() {
  const el = videoRef.value
  if (el) currentTime.value = el.currentTime
}

function onLoaded() {
  const el = videoRef.value
  if (el) {
    duration.value = el.duration
    el.volume = volume.value / 100
    el.muted = muted.value
  }
}

function togglePlay() {
  const el = videoRef.value
  if (!el) return
  if (playing.value) {
    el.pause()
  } else {
    el.play()
  }
}

function toggleMute() {
  const el = videoRef.value
  if (!el) return
  muted.value = !muted.value
  el.muted = muted.value
}

function onVolumeChange(e) {
  const val = Number(e.target.value)
  volume.value = val
  const el = videoRef.value
  if (!el) return
  el.volume = val / 100
  if (val === 0) {
    muted.value = true
    el.muted = true
  } else if (muted.value) {
    muted.value = false
    el.muted = false
  }
}

function onProgressClick(e) {
  const el = videoRef.value
  if (!el || !duration.value) return
  const rect = e.currentTarget.getBoundingClientRect()
  const percent = (e.clientX - rect.left) / rect.width
  el.currentTime = percent * duration.value
}

async function toggleFullscreen() {
  const el = fullscreenRef.value
  if (!el) return
  try {
    if (isFullscreen.value) {
      if (document.exitFullscreen) {
        await document.exitFullscreen()
      } else if (document.webkitExitFullscreen) {
        document.webkitExitFullscreen()
      } else if (document.msExitFullscreen) {
        document.msExitFullscreen()
      }
    } else {
      const reqFs = el.requestFullscreen || el.webkitRequestFullscreen || el.msRequestFullscreen
      if (reqFs) {
        const p = reqFs.call(el)
        if (p && typeof p.then === 'function') {
          await p
        }
      }
    }
  } catch (err) {
    console.warn('Fullscreen failed:', err)
  }
}

function onFullscreenChange() {
  const el = document.fullscreenElement || document.webkitFullscreenElement || document.msFullscreenElement
  isFullscreen.value = el === fullscreenRef.value
}

onMounted(() => {
  document.addEventListener('fullscreenchange', onFullscreenChange)
  document.addEventListener('webkitfullscreenchange', onFullscreenChange)
  document.addEventListener('MSFullscreenChange', onFullscreenChange)
})

onUnmounted(() => {
  document.removeEventListener('fullscreenchange', onFullscreenChange)
  document.removeEventListener('webkitfullscreenchange', onFullscreenChange)
  document.removeEventListener('MSFullscreenChange', onFullscreenChange)
  if (isFullscreen.value && document.exitFullscreen) {
    document.exitFullscreen()
  }
})

watch(
  () => props.src,
  (newSrc) => {
    if (!newSrc) return
    currentTime.value = 0
    duration.value = 0
    playing.value = false
    nextTick(() => {
      const el = videoRef.value
      if (el) {
        el.volume = volume.value / 100
        el.muted = muted.value
        if (props.autoplay) {
          el.play().catch(() => {})
        }
      }
    })
  },
  { immediate: true }
)
</script>

<style scoped>
.video-player-wrap {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 48px;
}

.video-player {
  display: flex;
  flex-direction: column;
  gap: 16px;
  min-width: 420px;
  max-width: 720px;
  background: linear-gradient(135deg, rgba(30, 30, 40, 0.95) 0%, rgba(0, 0, 0, 0.9) 100%);
  border-radius: 20px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.06);
  overflow: hidden;
}

.video-player__title {
  padding: 16px 24px 0;
  font-size: 16px;
  font-weight: 600;
  color: #fff;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.video-player__screen {
  padding: 0 24px;
  cursor: pointer;
}

.video-player__video-wrap {
  position: relative;
  width: 100%;
  aspect-ratio: 16 / 9;
  max-height: 50vh;
  background: #000;
  border-radius: 12px;
  overflow: hidden;
}

.video-player__video {
  width: 100%;
  height: 100%;
  object-fit: contain;
  display: block;
}

.video-player__play-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.4);
  color: #fff;
  transition: background 0.2s;
}

.video-player__play-overlay:hover {
  background: rgba(0, 0, 0, 0.5);
}

.video-player__play-overlay .el-icon {
  opacity: 0.9;
}

.video-player__info {
  padding: 0 24px 24px;
}

.video-player__time {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.5);
  margin-bottom: 12px;
}

.video-player__time-sep {
  margin: 0 4px;
}

.video-player__progress {
  height: 6px;
  background: rgba(255, 255, 255, 0.15);
  border-radius: 3px;
  cursor: pointer;
  margin-bottom: 16px;
  overflow: hidden;
}

.video-player__progress-bar {
  height: 100%;
  background: linear-gradient(90deg, #409eff, #66b1ff);
  border-radius: 3px;
  transition: width 0.1s linear;
}

.video-player__controls {
  display: flex;
  align-items: center;
  gap: 8px;
}

.video-player__btn {
  width: 44px;
  height: 44px;
  border: none;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.1);
  color: #fff;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.2s, transform 0.2s;
}

.video-player__btn:hover {
  background: rgba(255, 255, 255, 0.2);
}

.video-player__btn:active {
  transform: scale(0.95);
}

.video-player__btn--volume {
  width: 36px;
  height: 36px;
}

.video-player__volume {
  width: 80px;
  height: 6px;
  -webkit-appearance: none;
  appearance: none;
  background: rgba(255, 255, 255, 0.15);
  border-radius: 3px;
  outline: none;
}

.video-player__volume::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: #fff;
  cursor: pointer;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
}

.video-player__volume::-moz-range-thumb {
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: #fff;
  cursor: pointer;
  border: none;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
}

/* 全屏：通过类名控制，便于维护且兼容 scoped */
.video-player--fullscreen {
  max-width: none;
  min-width: 0;
  width: 100vw;
  height: 100vh;
  height: 100dvh;
  border-radius: 0;
  gap: 0;
}

.video-player--fullscreen .video-player__title {
  flex-shrink: 0;
}

.video-player--fullscreen .video-player__screen {
  flex: 1 1 0;
  min-height: 0;
  display: flex;
  align-items: stretch;
  justify-content: center;
  padding: 0;
}

.video-player--fullscreen .video-player__video-wrap {
  flex: 1;
  width: 100%;
  min-height: 0;
  max-height: none;
  aspect-ratio: auto;
  border-radius: 0;
}

.video-player--fullscreen .video-player__info {
  flex-shrink: 0;
  padding: 16px 24px 24px;
  background: rgba(0, 0, 0, 0.75);
}

@media (max-width: 768px) {
  .video-player-wrap {
    padding: 24px;
  }

  .video-player {
    min-width: 300px;
  }

  .video-player__title {
    padding: 12px 16px 0;
    font-size: 14px;
  }

  .video-player__screen {
    padding: 0 16px;
  }

  .video-player__info {
    padding: 0 16px 16px;
  }
}
</style>
