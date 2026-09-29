const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('overlayAPI', {
  version: '0.3.0',
  mail: {
    hasConfig: () => ipcRenderer.invoke('mail:has-config'),
    connect: (email, password) => ipcRenderer.invoke('mail:connect', { email, password }),
    clearConfig: () => ipcRenderer.invoke('mail:clear-config'),
    list: () => ipcRenderer.invoke('mail:list'),
    getMessage: (uid) => ipcRenderer.invoke('mail:get-message', uid)
  },
  links: {
    getSections: () => ipcRenderer.invoke('links:get-sections'),
    addSection: (name) => ipcRenderer.invoke('links:add-section', name),
    removeSection: (name) => ipcRenderer.invoke('links:remove-section', name),
    list: (section) => ipcRenderer.invoke('links:list', section),
    move: (id, toSection) => ipcRenderer.invoke('links:move', { id, toSection }),
    delete: (id) => ipcRenderer.invoke('links:delete', id),
    open: (url) => ipcRenderer.invoke('links:open', url),
    onChanged: (callback) => {
      const listener = () => callback();
      ipcRenderer.on('links:changed', listener);
      return () => ipcRenderer.removeListener('links:changed', listener);
    }
  },
  screenshots: {
    list: () => ipcRenderer.invoke('screenshots:list'),
    open: (filePath) => ipcRenderer.invoke('screenshots:open', filePath),
    copy: (filePath) => ipcRenderer.invoke('screenshots:copy', filePath),
    showInFolder: (filePath) => ipcRenderer.invoke('screenshots:show-in-folder', filePath),
    onChanged: (callback) => {
      const listener = () => callback();
      ipcRenderer.on('screenshots:changed', listener);
      return () => ipcRenderer.removeListener('screenshots:changed', listener);
    }
  },
  schedule: {
    list: (date) => ipcRenderer.invoke('schedule:list', date),
    add: (date, time, title) => ipcRenderer.invoke('schedule:add', { date, time, title }),
    toggle: (id) => ipcRenderer.invoke('schedule:toggle', id),
    delete: (id) => ipcRenderer.invoke('schedule:delete', id)
  },
  notes: {
    list: () => ipcRenderer.invoke('notes:list'),
    create: (text) => ipcRenderer.invoke('notes:create', text),
    update: (id, text) => ipcRenderer.invoke('notes:update', { id, text }),
    delete: (id) => ipcRenderer.invoke('notes:delete', id)
  },
  moodle: {
    hasSession: () => ipcRenderer.invoke('moodle:has-session'),
    login: (siteUrl, username, password) => ipcRenderer.invoke('moodle:login', { siteUrl, username, password }),
    logout: () => ipcRenderer.invoke('moodle:logout'),
    deadlines: () => ipcRenderer.invoke('moodle:deadlines'),
    grades: () => ipcRenderer.invoke('moodle:grades'),
    announcements: () => ipcRenderer.invoke('moodle:announcements'),
    materials: () => ipcRenderer.invoke('moodle:materials')
  }
});
