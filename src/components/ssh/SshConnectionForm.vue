<script setup lang="ts">
/**
 * SshConnectionForm - Form for creating/editing SSH connections
 */
import { ref, computed, watch } from 'vue';
import { testSshConnection, saveSshConfig } from '@/services/ssh.service';
import type { SshConnectionConfig, SshAuthType } from '@/types';

const props = defineProps<{
  /** Existing config to edit (null for new) */
  config?: SshConnectionConfig | null;
}>();

const emit = defineEmits<{
  (e: 'save', config: SshConnectionConfig): void;
  (e: 'cancel'): void;
}>();

// Form state
const name = ref('');
const host = ref('');
const port = ref(22);
const username = ref('');
const authType = ref<SshAuthType>('password');
const password = ref('');
const privateKeyPath = ref('');
const passphrase = ref('');
const cwd = ref('');
const isFavorite = ref(false);

// UI state
const testing = ref(false);
const saving = ref(false);
const testResult = ref<{ success: boolean; message: string } | null>(null);
const error = ref<string | null>(null);

// Computed
const isNew = computed(() => !props.config);

const authTypeOptions = [
  { label: 'Password', value: 'password' },
  { label: 'Private Key', value: 'key' },
  { label: 'SSH Agent', value: 'agent' },
];

const canTest = computed(() => {
  return host.value && port.value && username.value && (
    authType.value === 'agent' ||
    (authType.value === 'password' && password.value) ||
    (authType.value === 'key' && privateKeyPath.value)
  );
});

// Initialize form from config
watch(() => props.config, (config) => {
  if (config) {
    name.value = config.name;
    host.value = config.host;
    port.value = config.port;
    username.value = config.username;
    authType.value = config.authType;
    password.value = config.password || '';
    privateKeyPath.value = config.privateKeyPath || '';
    passphrase.value = config.passphrase || '';
    cwd.value = config.cwd || '';
    isFavorite.value = config.isFavorite;
  } else {
    resetForm();
  }
}, { immediate: true });

function resetForm() {
  name.value = '';
  host.value = '';
  port.value = 22;
  username.value = '';
  authType.value = 'password';
  password.value = '';
  privateKeyPath.value = '';
  passphrase.value = '';
  cwd.value = '';
  isFavorite.value = false;
  testResult.value = null;
  error.value = null;
}

async function handleTest() {
  if (!canTest.value) return;

  testing.value = true;
  testResult.value = null;
  error.value = null;

  try {
    const result = await testSshConnection({
      name: name.value || host.value,
      host: host.value,
      port: port.value,
      username: username.value,
      authType: authType.value,
      password: password.value || undefined,
      privateKeyPath: privateKeyPath.value || undefined,
      passphrase: passphrase.value || undefined,
      cwd: cwd.value || undefined,
    });

    if (result.success) {
      testResult.value = {
        success: true,
        message: result.serverVersion
          ? `Connected! Server: ${result.serverVersion}`
          : 'Connected successfully!',
      };
    } else {
      testResult.value = {
        success: false,
        message: result.error || 'Connection failed',
      };
    }
  } catch (e) {
    testResult.value = {
      success: false,
      message: e instanceof Error ? e.message : 'Connection test failed',
    };
  } finally {
    testing.value = false;
  }
}

async function handleSave() {
  if (!host.value || !username.value) {
    error.value = 'Host and username are required';
    return;
  }

  saving.value = true;
  error.value = null;

  try {
    const config: SshConnectionConfig = {
      id: props.config?.id || '',
      type: 'ssh',
      name: name.value || `${username.value}@${host.value}`,
      host: host.value,
      port: port.value,
      username: username.value,
      authType: authType.value,
      password: password.value || undefined,
      privateKeyPath: privateKeyPath.value || undefined,
      passphrase: passphrase.value || undefined,
      cwd: cwd.value || undefined,
      isFavorite: isFavorite.value,
      lastConnectedAt: props.config?.lastConnectedAt,
      createdAt: props.config?.createdAt || Date.now(),
    };

    const saved = await saveSshConfig(config);
    emit('save', saved);
    resetForm();
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Failed to save connection';
  } finally {
    saving.value = false;
  }
}

function handleCancel() {
  emit('cancel');
  resetForm();
}
</script>

<template>
  <div class="ssh-form">
    <div class="form-header">
      <h3>{{ isNew ? 'New SSH Connection' : 'Edit SSH Connection' }}</h3>
    </div>

    <div class="form-body">
      <!-- Connection name -->
      <div class="form-group">
        <label for="name">Name</label>
        <input
          id="name"
          v-model="name"
          type="text"
          placeholder="My Server"
        />
        <span class="hint">Optional display name</span>
      </div>

      <!-- Host and Port -->
      <div class="form-row">
        <div class="form-group flex-1">
          <label for="host">Host *</label>
          <input
            id="host"
            v-model="host"
            type="text"
            placeholder="192.168.1.100 or server.example.com"
          />
        </div>
        <div class="form-group port">
          <label for="port">Port</label>
          <input
            id="port"
            v-model.number="port"
            type="number"
            min="1"
            max="65535"
          />
        </div>
      </div>

      <!-- Username -->
      <div class="form-group">
        <label for="username">Username *</label>
        <input
          id="username"
          v-model="username"
          type="text"
          placeholder="root"
        />
      </div>

      <!-- Authentication type -->
      <div class="form-group">
        <label for="authType">Authentication</label>
        <select id="authType" v-model="authType">
          <option v-for="opt in authTypeOptions" :key="opt.value" :value="opt.value">
            {{ opt.label }}
          </option>
        </select>
      </div>

      <!-- Password -->
      <div v-if="authType === 'password'" class="form-group">
        <label for="password">Password *</label>
        <input
          id="password"
          v-model="password"
          type="password"
          placeholder="Enter password"
        />
        <span class="hint">Password will be stored locally</span>
      </div>

      <!-- Private key -->
      <template v-if="authType === 'key'">
        <div class="form-group">
          <label for="privateKey">Private Key Path *</label>
          <input
            id="privateKey"
            v-model="privateKeyPath"
            type="text"
            placeholder="/home/user/.ssh/id_rsa"
          />
        </div>
        <div class="form-group">
          <label for="passphrase">Passphrase</label>
          <input
            id="passphrase"
            v-model="passphrase"
            type="password"
            placeholder="Key passphrase (if any)"
          />
        </div>
      </template>

      <!-- Working directory -->
      <div class="form-group">
        <label for="cwd">Working Directory</label>
        <input
          id="cwd"
          v-model="cwd"
          type="text"
          placeholder="/home/user"
        />
        <span class="hint">Initial directory after connection</span>
      </div>

      <!-- Favorite toggle -->
      <div class="form-group checkbox">
        <label>
          <input v-model="isFavorite" type="checkbox" />
          <span>Add to favorites</span>
        </label>
      </div>

      <!-- Test result -->
      <div v-if="testResult" class="test-result" :class="{ success: testResult.success, error: !testResult.success }">
        <svg v-if="testResult.success" viewBox="0 0 24 24" width="16" height="16">
          <path fill="currentColor" d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/>
        </svg>
        <svg v-else viewBox="0 0 24 24" width="16" height="16">
          <path fill="currentColor" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
        </svg>
        <span>{{ testResult.message }}</span>
      </div>

      <!-- Error message -->
      <div v-if="error" class="error-message">
        {{ error }}
      </div>
    </div>

    <div class="form-footer">
      <button class="test-btn" type="button" @click="handleTest" :disabled="!canTest || testing">
        <svg v-if="testing" class="spinner" viewBox="0 0 24 24" width="16" height="16">
          <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" stroke-width="2" stroke-dasharray="31.4" stroke-dashoffset="10"/>
        </svg>
        <template v-else>Test Connection</template>
      </button>
      <div class="spacer"></div>
      <button class="cancel-btn" type="button" @click="handleCancel">Cancel</button>
      <button class="save-btn" type="button" @click="handleSave" :disabled="saving">
        {{ isNew ? 'Create' : 'Save' }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.ssh-form {
  display: flex;
  flex-direction: column;
  height: 100%;
  background-color: var(--color-body, #1e1e1e);
}

.form-header {
  padding: 16px 20px;
  border-bottom: 1px solid var(--color-border, #3c3c3c);
}

.form-header h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 500;
  color: var(--color-text-1, #ffffff);
}

.form-body {
  flex: 1;
  overflow-y: auto;
  padding: 16px 20px;
}

.form-row {
  display: flex;
  gap: 12px;
}

.form-group {
  margin-bottom: 16px;
}

.form-group.flex-1 {
  flex: 1;
}

.form-group.port {
  width: 100px;
}

.form-group label {
  display: block;
  margin-bottom: 6px;
  font-size: 12px;
  font-weight: 500;
  color: var(--color-text-2, #cccccc);
}

.form-group input[type="text"],
.form-group input[type="password"],
.form-group input[type="number"],
.form-group select {
  width: 100%;
  padding: 8px 12px;
  font-size: 13px;
  color: var(--color-text-1, #ffffff);
  background-color: var(--color-input-bg, #2d2d2d);
  border: 1px solid var(--color-border, #3c3c3c);
  border-radius: 4px;
  outline: none;
  transition: border-color 0.15s ease;
}

.form-group input:focus,
.form-group select:focus {
  border-color: var(--color-primary, #007acc);
  box-shadow: 0 0 0 2px rgba(0, 122, 204, 0.2);
  background-color: var(--color-input-bg-focus, #323236);
}

.form-group input::placeholder {
  color: var(--color-text-4, #666666);
}

.form-group select {
  cursor: pointer;
}

.form-group .hint {
  display: block;
  margin-top: 4px;
  font-size: 11px;
  color: var(--color-text-4, #666666);
}

.form-group.checkbox label {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
}

.form-group.checkbox input[type="checkbox"] {
  width: 16px;
  height: 16px;
  cursor: pointer;
}

.test-result {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  border-radius: 4px;
  font-size: 13px;
}

.test-result.success {
  color: #4caf50;
  background-color: rgba(76, 175, 80, 0.1);
}

.test-result.error {
  color: #f44336;
  background-color: rgba(244, 67, 54, 0.1);
}

.error-message {
  padding: 10px 12px;
  color: #f44336;
  background-color: rgba(244, 67, 54, 0.1);
  border-radius: 4px;
  font-size: 13px;
}

.form-footer {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 16px 20px;
  border-top: 1px solid var(--color-border, #3c3c3c);
}

.form-footer .spacer {
  flex: 1;
}

.test-btn,
.cancel-btn,
.save-btn {
  padding: 8px 16px;
  font-size: 13px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.15s ease;
}

.test-btn {
  color: var(--color-primary, #007acc);
  background-color: transparent;
  border: 1px solid var(--color-primary, #007acc);
}

.test-btn:hover:not(:disabled) {
  background-color: rgba(0, 122, 204, 0.1);
}

.test-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.cancel-btn {
  color: var(--color-text-2, #cccccc);
  background-color: var(--color-surface, #2d2d2d);
  border: 1px solid var(--color-border, #3c3c3c);
}

.cancel-btn:hover {
  background-color: var(--color-surface-hover, #3c3c3c);
}

.save-btn {
  color: #ffffff;
  background-color: var(--color-primary, #007acc);
}

.save-btn:hover:not(:disabled) {
  background-color: var(--color-primary-hover, #0098ff);
}

.save-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.spinner {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
</style>
