<template>
  <div ref="helpRef">
    <!-- 帮助图标 -->
    <div 
      class="help-icon-container"
      @mouseenter="showTooltip = true"
      @mouseleave="showTooltip = false"
      @click.stop="showTooltip = !showTooltip"
    >
      <svg 
        class="help-icon" 
        viewBox="0 0 24 24" 
        fill="none" 
        stroke="#ffffff" 
        stroke-width="2" 
        stroke-linecap="round" 
        stroke-linejoin="round"
      >
        <circle cx="12" cy="12" r="10"></circle>
        <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path>
        <line x1="12" y1="17" x2="12.01" y2="17"></line>
      </svg>
    </div>
    
    <!-- 操作说明 Tooltip -->
    <Transition name="fade">
      <div 
        v-if="showTooltip" 
        class="help-tooltip"
        @mouseenter="showTooltip = true"
        @mouseleave="showTooltip = false"
        @click.stop
      >
        <div class="help-tooltip-content">
          <h3 class="help-title">操作说明</h3>
          <div class="help-section">
            <h4 class="help-section-title">外部观察模式</h4>
            <ul class="help-list">
              <li>• 鼠标拖拽：旋转视角</li>
              <li>• 鼠标滚轮：缩放视角</li>
              <li>• 点击"一层"或"二层"：进入内部参观</li>
            </ul>
          </div>
          <div class="help-section">
            <h4 class="help-section-title">内部参观模式</h4>
            <ul class="help-list">
              <li>• 点击地面：移动到目标位置</li>
              <li>• 鼠标拖拽：旋转视角</li>
              <li>• 右键/ESC键：停止移动</li>
              <li>• 点击展品：查看展品详情</li>
              <li>• 点击导航按钮：快速移动到展品位置</li>
            </ul>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup>
import { ref, watch, onUnmounted } from 'vue'

const showTooltip = ref(false)
const helpRef = ref(null)

function handleClickOutside(e) {
  if (!helpRef.value?.contains(e.target)) {
    showTooltip.value = false
  }
}

watch(showTooltip, (visible) => {
  if (visible) {
    setTimeout(() => document.addEventListener('click', handleClickOutside), 0)
  } else {
    document.removeEventListener('click', handleClickOutside)
  }
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
})
</script>

<style scoped>
/* CSS 变量定义 - 与 Controls.vue 保持一致 */
.help-tooltip {
  --bg-primary: rgba(0, 0, 0, 0.65);
  --bg-secondary: rgba(30, 30, 30, 0.9);
  --bg-hover: rgba(60, 60, 60, 0.95);
  --text-primary: #ffffff;
  --text-secondary: rgba(255, 255, 255, 0.9);
  --text-muted: rgba(255, 255, 255, 0.6);
  --border-color: rgba(255, 255, 255, 0.1);
  --shadow-sm: 0 1px 3px rgba(0, 0, 0, 0.3);
  --shadow-md: 0 2px 10px rgba(0, 0, 0, 0.4);
  --shadow-lg: 0 2px 8px rgba(0, 0, 0, 0.5);
  --border-radius: 8px;
}

/* 帮助图标 */
.help-icon-container {
  position: fixed;
  top: 20px;
  left: 20px;
  width: 36px;
  height: 36px;
  min-width: 36px;
  min-height: 36px;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg-primary);
  backdrop-filter: blur(10px);
  border: 1px solid var(--border-color);
  border-radius: 50%;
  box-shadow: var(--shadow-md);
  cursor: pointer;
  z-index: 1000;
  transition: all 0.3s ease;
  -webkit-tap-highlight-color: transparent;
  user-select: none;
  touch-action: manipulation;
}

.help-icon-container:hover:not(:active) {
  background: var(--bg-hover);
  border-color: rgba(255, 255, 255, 0.2);
  transform: scale(1.05);
  box-shadow: var(--shadow-lg);
}

.help-icon-container:active {
  transform: scale(0.95);
  box-shadow: var(--shadow-sm);
}

.help-icon {
  width: 20px;
  height: 20px;
  color: var(--text-primary);
  transition: opacity 0.3s ease;
}

/* 帮助提示 Tooltip */
.help-tooltip {
  position: fixed;
  top: 70px;
  left: 20px;
  z-index: 1001;
  pointer-events: auto;
  max-width: 320px;
}

.help-tooltip-content {
  background: var(--bg-primary);
  backdrop-filter: blur(10px);
  border-radius: var(--border-radius);
  padding: 16px;
  box-shadow: var(--shadow-md);
  border: 1px solid var(--border-color);
}

.help-title {
  margin: 0 0 12px 0;
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
  border-bottom: 1px solid var(--border-color);
  padding-bottom: 8px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.help-section {
  margin-bottom: 16px;
}

.help-section:last-child {
  margin-bottom: 0;
}

.help-section-title {
  margin: 0 0 8px 0;
  font-size: 11px;
  font-weight: 600;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  padding: 0 4px;
}

.help-list {
  margin: 0;
  padding-left: 20px;
  list-style: none;
}

.help-list li {
  margin-bottom: 6px;
  font-size: 13px;
  line-height: 1.6;
  color: var(--text-secondary);
}

.help-list li:last-child {
  margin-bottom: 0;
}

/* 过渡动画 */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease, transform 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: translateX(-10px) scale(0.95);
}

/* 移动端适配 */
@media (max-width: 768px) {
  .help-icon-container {
    width: 36px;
    height: 36px;
    min-width: 36px;
    min-height: 36px;
    top: 15px;
    left: 15px;
  }

  .help-icon {
    width: 18px;
    height: 18px;
  }

  .help-tooltip {
    top: 60px;
    left: 15px;
    right: 15px;
    max-width: none;
  }

  .help-tooltip-content {
    padding: 12px;
  }

  .help-title {
    font-size: 14px;
  }

  .help-section-title {
    font-size: 10px;
  }

  .help-list li {
    font-size: 12px;
  }
}

/* 小屏手机 (≤480px) */
@media (max-width: 480px) {
  .help-icon-container {
    top: 8px;
    left: 8px;
  }

  .help-tooltip {
    top: 50px;
    left: 8px;
    right: 8px;
  }

  .help-tooltip-content {
    padding: 10px;
  }
}

/* 触摸设备优化 */
@media (hover: none) and (pointer: coarse) {
  .help-icon-container {
    width: 44px;
    height: 44px;
    min-width: 44px;
    min-height: 44px;
  }

  .help-icon {
    width: 22px;
    height: 22px;
  }

  .help-icon-container:active {
    transform: scale(0.95);
  }
}
</style>

