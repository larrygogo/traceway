<template>
  <div style="padding: 20px">
    <h1>Traceway Logger - Vue Example</h1>
    
    <div v-if="user">
      <p>当前用户: {{ user.name }} ({{ user.id }})</p>
    </div>

    <div style="margin-top: 20px">
      <button @click="handleInfo" style="margin-right: 10px">记录 Info</button>
      <button @click="handleError" style="margin-right: 10px">触发错误</button>
      <button @click="handleFetch">测试 HTTP 请求</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { logger } from './logger';

const user = ref<{ id: string; name: string } | null>(null);

onMounted(() => {
  const mockUser = { id: '123', name: 'John Doe', email: 'john@example.com' };
  logger.setUser(mockUser);
  user.value = mockUser;

  logger.setContext({
    env: 'production',
    release: '1.0.0',
  });

  logger.info('app_mount', 'App mounted');
});

const handleInfo = () => {
  logger.info('button_click', 'Info button clicked', { button: 'info' });
};

const handleError = () => {
  logger.error('button_click', 'Error button clicked', { button: 'error' });
  throw new Error('Test error from button');
};

const handleFetch = async () => {
  try {
    const response = await fetch('https://api.github.com/users/octocat');
    const data = await response.json();
    logger.info('api_success', 'GitHub API success', { login: data.login });
  } catch (error) {
    logger.error('api_error', 'GitHub API error', { error: String(error) });
  }
};
</script>

