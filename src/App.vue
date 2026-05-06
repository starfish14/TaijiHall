<template>
  <router-view />
</template>

<script setup>
</script>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  overflow: hidden;
}

#app {
  width: 100vw;
  height: 100vh;
  height: 100dvh;
}

.el-image-viewer__btn.el-image-viewer__progress {
  background-color: var(--el-text-color-regular);
  border-radius: 20px;
  padding-left: 4px;
  padding-right: 4px;
}
</style>

