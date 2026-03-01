/**
 * E2E Test Setup for Vitest
 * Global setup and teardown for end-to-end tests
 */

import { beforeAll, afterAll, beforeEach, afterEach, vi } from 'vitest';
import { initTestEnvironment, cleanupTestEnvironment, createMockInvoke } from './test-environment';

// Mock Tauri API
vi.mock('@tauri-apps/api/core', () => ({
  invoke: createMockInvoke(),
}));

// Mock window.__TAURI__ for browser environment
beforeAll(() => {
  // Initialize test environment
  initTestEnvironment({
    verbose: true,
    mockTauri: true,
    mockSsh: true,
    mockDocker: true,
  });

  // Mock window.__TAURI__ if not present
  if (typeof window !== 'undefined') {
    (window as Record<string, unknown>).__TAURI__ = {
      invoke: createMockInvoke(),
    };
  }
});

// Cleanup after all tests
afterAll(() => {
  cleanupTestEnvironment();
});

// Reset before each test
beforeEach(() => {
  // Reset mock services state
  initTestEnvironment({
    verbose: false,
    mockTauri: true,
    mockSsh: true,
    mockDocker: true,
  });
});

// Cleanup after each test
afterEach(() => {
  vi.clearAllMocks();
});

export { createMockInvoke };
