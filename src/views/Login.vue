<template>
  <div class="login-page">
    <div class="login-overlay"></div>
    <el-card class="login-card" shadow="always">
      <template #header>
        <div class="login-title">请登录</div>
      </template>

      <el-form @submit.prevent="handleLogin">
        <el-form-item label="账号">
          <el-input
            v-model="username"
            placeholder="请输入账号"
            clearable
            @keyup.enter="handleLogin"
          />
        </el-form-item>

        <el-form-item label="密码">
          <el-input
            v-model="password"
            :type="passwordVisible ? 'text' : 'password'"
            placeholder="请输入密码"
            @keyup.enter="handleLogin"
          >
            <template #append>
              <el-button @click="togglePasswordVisible">
                {{ passwordVisible ? '隐藏' : '显示' }}
              </el-button>
            </template>
          </el-input>
        </el-form-item>

        <el-button type="primary" class="login-btn" @click="handleLogin">
          登录进入
        </el-button>
      </el-form>

      <!-- <p class="tips">模拟账号：admin | 模拟密码：tj12345678</p> -->
    </el-card>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'

const router = useRouter()
const username = ref('')
const password = ref('')
const passwordVisible = ref(false)

function togglePasswordVisible() {
  passwordVisible.value = !passwordVisible.value
}

function handleLogin() {
  const isValid = username.value === 'admin' && password.value === 'tj12345678'

  if (!isValid) {
    ElMessage.error('账号或密码错误')
    return
  }

  sessionStorage.setItem('isLoggedIn', 'true')
  ElMessage.success('登录成功，正在进入3D场景')
  router.push({ name: 'Home' })
}
</script>

<style scoped>
.login-page {
  width: 100vw;
  height: 100vh;
  height: 100dvh;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 24px;
  background: radial-gradient(circle at 0% 0%, #f2f7ff 0%, #dbeafe 40%, #c9e7ff 100%);
  position: relative;
}

.login-overlay {
  position: absolute;
  inset: 0;
  background: linear-gradient(120deg, rgba(255, 255, 255, 0.55), rgba(255, 255, 255, 0.15));
}

.login-card {
  width: 100%;
  max-width: 420px;
  z-index: 1;
  border-radius: 14px;
}

.login-title {
  font-size: 18px;
  font-weight: 600;
  color: #1f2937;
}

.login-btn {
  width: 100%;
}

.tips {
  margin-top: 14px;
  font-size: 12px;
  color: #6b7280;
}
</style>

