<template>
  <div class="audio-player-wrap">
    <audio
      ref="audioRef"
      :src="src"
      class="audio-player__el"
      @timeupdate="onTimeUpdate"
      @loadedmetadata="onLoaded"
      @play="playing = true"
      @pause="playing = false"
      @ended="playing = false"
    >
      您的浏览器不支持音频播放
    </audio>
    <div class="audio-player">
      <div class="audio-player__disc" :class="{ 'is-playing': playing }" @click="togglePlay">
        <div class="audio-player__disc-inner">
          <div class="audio-player__disc-hole" />
        </div>
      </div>
      <div class="audio-player__info">
        <div class="audio-player__title">{{ title || '音频' }}</div>
        <div class="audio-player__time">
          <span>{{ formatTime(currentTime) }}</span>
          <span class="audio-player__time-sep">/</span>
          <span>{{ formatTime(duration) }}</span>
        </div>
        <div class="audio-player__progress" @click="onProgressClick">
          <div class="audio-player__progress-bar" :style="{ width: progressPercent + '%' }" />
        </div>
        <div class="audio-player__controls">
          <button class="audio-player__btn" @click="togglePlay">
            <el-icon v-if="playing" :size="28"><VideoPause /></el-icon>
            <el-icon v-else :size="28"><VideoPlay /></el-icon>
          </button>
          <button class="audio-player__btn audio-player__btn--volume" :title="muted ? '取消静音' : '静音'" @click="toggleMute">
            <el-icon :size="22"><Mute v-if="muted" /><Headset v-else /></el-icon>
          </button>
          <input
            :value="volume"
            type="range"
            class="audio-player__volume"
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
import { computed, ref, watch, nextTick } from 'vue'
import { VideoPlay, VideoPause, Mute, Headset } from '@element-plus/icons-vue'

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

const audioRef = ref(null)
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
  const el = audioRef.value
  if (el) currentTime.value = el.currentTime
}

function onLoaded() {
  const el = audioRef.value
  if (el) {
    duration.value = el.duration
    el.volume = volume.value / 100
    el.muted = muted.value
  }
}

function togglePlay() {
  const el = audioRef.value
  if (!el) return
  if (playing.value) {
    el.pause()
  } else {
    el.play()
  }
}

function toggleMute() {
  const el = audioRef.value
  if (!el) return
  muted.value = !muted.value
  el.muted = muted.value
}

function onVolumeChange(e) {
  const val = Number(e.target.value)
  volume.value = val
  const el = audioRef.value
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
  const el = audioRef.value
  if (!el || !duration.value) return
  const rect = e.currentTarget.getBoundingClientRect()
  const percent = (e.clientX - rect.left) / rect.width
  el.currentTime = percent * duration.value
}

watch(
  () => props.src,
  (newSrc) => {
    if (!newSrc) return
    currentTime.value = 0
    duration.value = 0
    playing.value = false
    nextTick(() => {
      const el = audioRef.value
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
.audio-player__el {
  position: absolute;
  width: 0;
  height: 0;
  opacity: 0;
  pointer-events: none;
}

.audio-player-wrap {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 48px;
}

.audio-player {
  display: flex;
  align-items: center;
  gap: 40px;
  padding: 0 48px;
  min-width: 420px;
  max-width: 560px;
  background: linear-gradient(135deg, rgba(30, 30, 40, 0.95) 0%, rgba(0, 0, 0, 0.9) 100%);
  border-radius: 20px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.06);
}

.audio-player__disc {
  flex-shrink: 0;
  width: 140px;
  height: 140px;
  border-radius: 50%;
  background: linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 50%, #1a1a1a 100%);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5), inset 0 0 0 2px rgba(255, 255, 255, 0.5), inset 0 0 0 4px #333;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: transform 0.3s ease;
}

.audio-player__disc.is-playing {
  animation: disc-spin 3s linear infinite;
}

@keyframes disc-spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.audio-player__disc-inner {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  background: radial-gradient(
    circle at 50% 50%,
    #2a2a2a 0%,
    #1a1a1a 15%,
    #0d0d0d 50%,
    #1a1a1a 85%,
    #2a2a2a 100%
  );
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: inset 0 0 30px rgba(0, 0, 0, 0.5);
}

.audio-player__disc-hole {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: #fff;
  box-shadow: inset 0 0 4px rgba(0, 0, 0, 0.3);
}

.audio-player__info {
  flex: 1;
  min-width: 0;
}

.audio-player__title {
  font-size: 16px;
  font-weight: 600;
  color: #fff;
  margin-bottom: 8px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.audio-player__time {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.5);
  margin-bottom: 12px;
}

.audio-player__time-sep {
  margin: 0 4px;
}

.audio-player__progress {
  height: 6px;
  background: rgba(255, 255, 255, 0.15);
  border-radius: 3px;
  cursor: pointer;
  margin-bottom: 16px;
  overflow: hidden;
}

.audio-player__progress-bar {
  height: 100%;
  background: linear-gradient(90deg, #409eff, #66b1ff);
  border-radius: 3px;
  transition: width 0.1s linear;
}

.audio-player__controls {
  display: flex;
  align-items: center;
  gap: 8px;
}

.audio-player__btn {
  width: 48px;
  height: 48px;
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

.audio-player__btn:hover {
  background: rgba(255, 255, 255, 0.2);
}

.audio-player__btn:active {
  transform: scale(0.95);
}

.audio-player__btn--volume {
  width: 40px;
  height: 40px;
}

.audio-player__volume {
  width: 80px;
  height: 6px;
  -webkit-appearance: none;
  appearance: none;
  background: rgba(255, 255, 255, 0.15);
  border-radius: 3px;
  outline: none;
}

.audio-player__volume::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: #fff;
  cursor: pointer;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
}

.audio-player__volume::-moz-range-thumb {
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: #fff;
  cursor: pointer;
  border: none;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
}

@media (max-width: 768px) {
  .audio-player-wrap {
    padding: 24px;
  }

  .audio-player {
    flex-direction: column;
    min-width: 300px;
    padding: 32px 24px;
    gap: 24px;
  }

  .audio-player__disc {
    width: 120px;
    height: 120px;
  }

  .audio-player__disc-hole {
    width: 20px;
    height: 20px;
  }

  .audio-player__title {
    font-size: 14px;
    text-align: center;
  }

  .audio-player__time {
    text-align: center;
  }
}
</style>
