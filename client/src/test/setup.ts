import '@testing-library/jest-dom/vitest';
import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

// RTL auto-cleanup relies on test globals; with globals disabled we
// register it explicitly so each test starts from an empty DOM.
afterEach(() => {
  cleanup();
});
