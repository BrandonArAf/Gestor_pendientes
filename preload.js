const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  loadTasks:             ()         => ipcRenderer.invoke('load-tasks'),
  saveTasks:             (tasks)    => ipcRenderer.invoke('save-tasks', tasks),
  minimizeWindow:        ()         => ipcRenderer.invoke('minimize-window'),
  maximizeWindow:        ()         => ipcRenderer.invoke('maximize-window'),
  closeWindow:           ()         => ipcRenderer.invoke('close-window'),
  openDataFolder:        ()         => ipcRenderer.invoke('open-data-folder'),
  sendTestNotification:  ()         => ipcRenderer.invoke('send-test-notification'),
  setAutoLaunch:         (enabled)  => ipcRenderer.invoke('set-auto-launch', enabled),
  getAutoLaunch:         ()         => ipcRenderer.invoke('get-auto-launch'),
  snoozeTask:            (id, hours) => ipcRenderer.invoke('snooze-task', id, hours),
  readNotifLog:          (taskId)   => ipcRenderer.invoke('read-notif-log', taskId),
  importTasks:           ()         => ipcRenderer.invoke('import-tasks'),
  onTasksRefresh:        (cb)       => ipcRenderer.on('tasks-refresh', cb),
  removeTasksRefresh:    (cb)       => ipcRenderer.removeListener('tasks-refresh', cb),
  onQuickAdd:            (cb)       => ipcRenderer.on('open-quick-add', cb),
  removeQuickAdd:        (cb)       => ipcRenderer.removeListener('open-quick-add', cb),
});
