// hooks/useKeyboardShortcuts.js
// Enterprise keyboard shortcuts for power users

import { useEffect } from 'react';
import { useRouter } from 'next/router';

export default function useKeyboardShortcuts() {
  const router = useRouter();

  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ignore if user is typing in an input/textarea
      const target = e.target;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return;
      }

      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const modKey = isMac ? e.metaKey : e.ctrlKey;

      // ⌘/Ctrl + K: Quick search/command palette
      if (modKey && e.key === 'k') {
        e.preventDefault();
        // TODO: Open command palette
        console.log('Command palette triggered');
      }

      // ⌘/Ctrl + Shift + L: Toggle theme
      if (modKey && e.shiftKey && e.key === 'L') {
        e.preventDefault();
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'light' ? 'dark' : 'light';
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
      }

      // Navigation shortcuts
      if (modKey && e.shiftKey) {
        switch (e.key) {
          case 'H': // Home
            e.preventDefault();
            router.push('/dashboard');
            break;
          case 'L': // Lanes
            e.preventDefault();
            router.push('/lanes');
            break;
          case 'R': // Recap
            e.preventDefault();
            router.push('/recap');
            break;
          case 'N': // New Lane
            e.preventDefault();
            router.push('/enter-lane');
            break;
        }
      }

      // Quick actions (no modifier)
      if (!modKey && !e.shiftKey && !e.altKey) {
        switch (e.key) {
          case '?': // Show help
            e.preventDefault();
            showKeyboardShortcutsHelp();
            break;
          case 'Escape': // Close modals/dialogs
            // Trigger custom event for modal closing
            window.dispatchEvent(new CustomEvent('closeModals'));
            break;
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [router]);
}

function showKeyboardShortcutsHelp() {
  const modal = document.createElement('div');
  modal.id = 'keyboard-shortcuts-modal';
  modal.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: var(--color-bg-overlay);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 9999;
    backdrop-filter: blur(4px);
  `;

  const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
  const modKey = isMac ? '⌘' : 'Ctrl';

  modal.innerHTML = `
    <div class="card" style="max-width: 600px; width: 90%; max-height: 80vh; overflow-y: auto;">
      <div class="card-header">
        <h2 style="font-size: 1.25rem; font-weight: 600; color: var(--color-text-primary); margin: 0;">
          ⌨️ Keyboard Shortcuts
        </h2>
      </div>
      <div class="card-body">
        <div style="display: grid; gap: 1.5rem;">
          <div>
            <h3 style="font-size: 0.875rem; font-weight: 600; color: var(--color-text-secondary); margin-bottom: 0.5rem;">
              NAVIGATION
            </h3>
            <div style="display: grid; gap: 0.5rem;">
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <span style="color: var(--color-text-primary);">Go to Dashboard</span>
                <div style="display: flex; gap: 0.25rem;">
                  <kbd class="kbd">${modKey}</kbd>
                  <kbd class="kbd">Shift</kbd>
                  <kbd class="kbd">H</kbd>
                </div>
              </div>
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <span style="color: var(--color-text-primary);">Go to Lanes</span>
                <div style="display: flex; gap: 0.25rem;">
                  <kbd class="kbd">${modKey}</kbd>
                  <kbd class="kbd">Shift</kbd>
                  <kbd class="kbd">L</kbd>
                </div>
              </div>
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <span style="color: var(--color-text-primary);">Go to Recap</span>
                <div style="display: flex; gap: 0.25rem;">
                  <kbd class="kbd">${modKey}</kbd>
                  <kbd class="kbd">Shift</kbd>
                  <kbd class="kbd">R</kbd>
                </div>
              </div>
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <span style="color: var(--color-text-primary);">New Lane</span>
                <div style="display: flex; gap: 0.25rem;">
                  <kbd class="kbd">${modKey}</kbd>
                  <kbd class="kbd">Shift</kbd>
                  <kbd class="kbd">N</kbd>
                </div>
              </div>
            </div>
          </div>

          <div>
            <h3 style="font-size: 0.875rem; font-weight: 600; color: var(--color-text-secondary); margin-bottom: 0.5rem;">
              APPEARANCE
            </h3>
            <div style="display: grid; gap: 0.5rem;">
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <span style="color: var(--color-text-primary);">Toggle Dark/Light Mode</span>
                <div style="display: flex; gap: 0.25rem;">
                  <kbd class="kbd">${modKey}</kbd>
                  <kbd class="kbd">Shift</kbd>
                  <kbd class="kbd">L</kbd>
                </div>
              </div>
            </div>
          </div>

          <div>
            <h3 style="font-size: 0.875rem; font-weight: 600; color: var(--color-text-secondary); margin-bottom: 0.5rem;">
              GENERAL
            </h3>
            <div style="display: grid; gap: 0.5rem;">
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <span style="color: var(--color-text-primary);">Show this help</span>
                <kbd class="kbd">?</kbd>
              </div>
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <span style="color: var(--color-text-primary);">Close modal/dialog</span>
                <kbd class="kbd">Esc</kbd>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div class="card-footer" style="display: flex; justify-content: flex-end;">
        <button class="btn btn-primary" onclick="document.getElementById('keyboard-shortcuts-modal').remove()">
          Got it
        </button>
      </div>
    </div>
  `;

  // Close on click outside
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      modal.remove();
    }
  });

  // Close on Escape
  const handleEscape = (e) => {
    if (e.key === 'Escape') {
      modal.remove();
      document.removeEventListener('keydown', handleEscape);
    }
  };
  document.addEventListener('keydown', handleEscape);

  document.body.appendChild(modal);
}
