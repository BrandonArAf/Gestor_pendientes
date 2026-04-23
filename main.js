const { app, BrowserWindow, Tray, Menu, nativeImage, Notification, ipcMain, shell, dialog } = require('electron');
const path = require('path');
const fs = require('fs');

const DATA_FILE  = path.join(app.getPath('userData'), 'tasks.json');
const NOTIF_LOG  = path.join(app.getPath('userData'), 'notif-log.json');

let mainWindow = null;
let tray       = null;

// ─── App identity ────────────────────────────────────────────────────────────
app.setName('Pendientes');
if (process.platform === 'win32') app.setAppUserModelId('Pendientes');

// ─── Persistent storage ──────────────────────────────────────────────────────
function loadTasks() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const raw = fs.readFileSync(DATA_FILE, 'utf8');
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
      throw new Error('JSON no es un array');
    }
  } catch (e) {
    console.error('[loadTasks] Error leyendo tasks.json:', e.message);
    // Backup corrupted file before returning empty
    try {
      const backup = DATA_FILE.replace('.json', `.corrupted-${Date.now()}.json`);
      if (fs.existsSync(DATA_FILE)) fs.copyFileSync(DATA_FILE, backup);
      console.warn('[loadTasks] Backup guardado en:', backup);
    } catch (_) {}
  }
  return [];
}

function saveTasks(tasks) {
  try {
    const tmp = DATA_FILE + '.tmp';
    fs.writeFileSync(tmp, JSON.stringify(tasks, null, 2), 'utf8');
    fs.renameSync(tmp, DATA_FILE); // Atomic write: avoids corruption on crash
  } catch (e) {
    console.error('[saveTasks] Error guardando tasks.json:', e.message);
  }
}

function appendNotifLog(entry) {
  try {
    let log = [];
    if (fs.existsSync(NOTIF_LOG)) {
      try { log = JSON.parse(fs.readFileSync(NOTIF_LOG, 'utf8')); } catch (_) {}
    }
    log.push(entry);
    // Keep last 200 entries
    if (log.length > 200) log = log.slice(-200);
    fs.writeFileSync(NOTIF_LOG, JSON.stringify(log, null, 2), 'utf8');
  } catch (e) {
    console.error('[appendNotifLog] Error:', e.message);
  }
}

// ─── Notifications ───────────────────────────────────────────────────────────
function sendNotification(title, body, taskId) {
  if (!Notification.isSupported()) return;
  const n = new Notification({ title, body, silent: false });
  n.on('click', () => showWindow());
  n.show();
  appendNotifLog({ ts: Date.now(), title, body, taskId: taskId || null });
}

function checkNotifications(tasks) {
  const now = Date.now();
  let changed = false;

  tasks.forEach(task => {
    if (task.done) return;
    if (task.snoozedUntil && now < task.snoozedUntil) return;

    const elapsed   = (now - task.creado) / 3600000;
    const hoursLeft = task.alerta - elapsed;

    // Pre-alerta: avisar 1 hora antes de vencer
    if (!task.warnNotified && hoursLeft > 0 && hoursLeft <= 1) {
      const minsLeft = Math.round(hoursLeft * 60);
      sendNotification(
        `Vence en ${minsLeft} min — ${task.canal}`,
        `${task.nombre}: ${task.desc.slice(0, 80)}${task.desc.length > 80 ? '…' : ''}`,
        task.id
      );
      task.warnNotified = true;
      changed = true;
    }

    // Alerta: al vencer
    if (elapsed >= task.alerta && !task.notified) {
      sendNotification(
        `Vencida — ${task.canal.toUpperCase()}`,
        `${task.nombre}: ${task.desc.slice(0, 80)}${task.desc.length > 80 ? '…' : ''}`,
        task.id
      );
      task.notified     = true;
      task.lastNotified = now;
      changed           = true;
    } else if (task.notified && (now - (task.lastNotified || 0)) >= 30 * 60 * 1000) {
      const overdueH    = Math.floor(elapsed - task.alerta);
      const overdueText = overdueH > 0 ? ` · ${overdueH}h sin atender` : '';
      sendNotification(
        `Recordatorio${overdueText} — ${task.canal}`,
        `${task.nombre}: ${task.desc.slice(0, 80)}`,
        task.id
      );
      task.lastNotified = now;
      changed           = true;
    }
  });

  if (changed) {
    saveTasks(tasks);
    updateTrayBadge(tasks);
  }
}

// ─── Snooze ──────────────────────────────────────────────────────────────────
function snoozeTask(tasks, id, hours) {
  const task = tasks.find(t => t.id === id);
  if (!task) return tasks;
  task.snoozedUntil = Date.now() + hours * 3600000;
  task.notified     = false; // Reset so it fires again after snooze expires
  saveTasks(tasks);
  return tasks;
}

// ─── Tray ─────────────────────────────────────────────────────────────────────
function updateTrayBadge(tasks) {
  // Accept pre-loaded tasks or load from disk (single read)
  const t = tasks || loadTasks();
  const urgentCount = t.filter(x => {
    if (x.done) return false;
    if (x.snoozedUntil && Date.now() < x.snoozedUntil) return false;
    return (Date.now() - x.creado) / 3600000 >= x.alerta;
  }).length;

  if (!tray) return;
  tray.setToolTip(urgentCount > 0 ? `Pendientes (${urgentCount} urgentes)` : 'Pendientes');
  tray.setContextMenu(buildTrayMenu(t, urgentCount));
}

function buildTrayMenu(tasks, urgentCount) {
  const pending = tasks.filter(x => !x.done);
  const urgent  = pending.filter(x => (Date.now() - x.creado) / 3600000 >= x.alerta);

  const items = [
    {
      label:   urgentCount > 0
        ? `${urgentCount} tarea${urgentCount > 1 ? 's' : ''} urgente${urgentCount > 1 ? 's' : ''}`
        : `${pending.length} pendiente${pending.length !== 1 ? 's' : ''}`,
      enabled: false
    },
    { type: 'separator' }
  ];

  urgent.slice(0, 5).forEach(t => {
    items.push({ label: `🔴 ${t.nombre} — ${t.canal}`, click: () => showWindow() });
  });

  if (urgent.length > 0) items.push({ type: 'separator' });
  items.push({ label: 'Abrir app', click: () => showWindow() });
  items.push({ type: 'separator' });
  items.push({ label: 'Salir', click: () => { app.isQuitting = true; app.quit(); } });

  return Menu.buildFromTemplate(items);
}

function createTrayIcon() {
  const size = process.platform === 'darwin' ? 18 : 24;
  const svg  = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg>`;
  return nativeImage.createFromDataURL(
    `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`
  );
}

// ─── Window ───────────────────────────────────────────────────────────────────
function showWindow() {
  if (!mainWindow) createWindow();
  else { mainWindow.show(); mainWindow.focus(); }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width:    900,
    height:   700,
    minWidth: 720,
    minHeight: 500,
    title:    'Pendientes',
    backgroundColor: '#0f0f11',
    frame:    false,
    titleBarStyle: 'hidden',
    trafficLightPosition: { x: 16, y: 16 },
    webPreferences: {
      nodeIntegration:    false,   // Hardened: no direct Node in renderer
      contextIsolation:   true,    // Hardened: isolated context
      sandbox:            false,   // Needed so preload can use require
      preload: path.join(__dirname, 'preload.js')
    },
    show: false,
    icon: createTrayIcon()
  });

  mainWindow.loadFile(path.join(__dirname, 'src', 'index.html'));
  mainWindow.once('ready-to-show', () => mainWindow.show());

  mainWindow.on('close', e => {
    if (!app.isQuitting) {
      e.preventDefault();
      mainWindow.hide();
      if (process.platform === 'darwin') app.dock?.hide();
    }
  });

  mainWindow.on('closed', () => { mainWindow = null; });
}

function setAutoLaunch(enabled) {
  const settings = {
    openAtLogin: enabled,
    name: 'Pendientes',
    path: process.execPath,
    args: []
  };
  if (!app.isPackaged) settings.args.push(app.getAppPath());
  settings.args.push('--hidden');
  app.setLoginItemSettings(settings);
}

function getAutoLaunch() {
  const settings = {
    name: 'Pendientes',
    path: process.execPath,
    args: []
  };
  if (!app.isPackaged) settings.args.push(app.getAppPath());
  settings.args.push('--hidden');
  return app.getLoginItemSettings(settings).openAtLogin;
}

// ─── App lifecycle ────────────────────────────────────────────────────────────
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', (event, commandLine, workingDirectory) => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.show();
      mainWindow.focus();
    }
  });

  app.whenReady().then(() => {
  if (process.platform === 'darwin') app.dock?.hide();

  // Start hidden if launched via auto-login
  const startHidden = process.argv.includes('--hidden');

  try {
    tray = new Tray(createTrayIcon());
    tray.setToolTip('Pendientes');
    tray.on('click',        () => showWindow());
    tray.on('double-click', () => showWindow());
  } catch (e) {
    console.warn('[Tray] No disponible, abriendo ventana directamente:', e.message);
  }

  if (!startHidden) createWindow();

  const initialTasks = loadTasks();
  updateTrayBadge(initialTasks);
  checkNotifications(initialTasks);

  // Main tick: check notifications + refresh renderer every minute
  setInterval(() => {
    const current = loadTasks();
    checkNotifications(current);
    updateTrayBadge(current);
    if (mainWindow?.webContents && !mainWindow.webContents.isDestroyed()) {
      mainWindow.webContents.send('tasks-refresh');
    }
  }, 60_000);
});
} // end of else block para gotTheLock
// ─── IPC handlers ─────────────────────────────────────────────────────────────
ipcMain.handle('load-tasks', () => loadTasks());

ipcMain.handle('save-tasks', (_, tasks) => {
  saveTasks(tasks);
  checkNotifications(tasks);
  updateTrayBadge(tasks);
  return true;
});

ipcMain.handle('snooze-task', (_, id, hours) => {
  const tasks = loadTasks();
  snoozeTask(tasks, id, hours);
  updateTrayBadge(tasks);
  return true;
});

ipcMain.handle('minimize-window',  () => mainWindow?.minimize());
ipcMain.handle('maximize-window',  () => {
  mainWindow?.isMaximized() ? mainWindow.unmaximize() : mainWindow?.maximize();
});
ipcMain.handle('close-window',     () => mainWindow?.hide());
ipcMain.handle('open-data-folder', () => shell.openPath(app.getPath('userData')));

ipcMain.handle('send-test-notification', () =>
  sendNotification('Pendientes — test', 'Las notificaciones están funcionando correctamente.')
);

ipcMain.handle('set-auto-launch', (_, enabled) => {
  setAutoLaunch(enabled);
  return getAutoLaunch();
});

ipcMain.handle('get-auto-launch', () => getAutoLaunch());

ipcMain.handle('read-notif-log', (_, taskId) => {
  try {
    if (!fs.existsSync(NOTIF_LOG)) return [];
    const log = JSON.parse(fs.readFileSync(NOTIF_LOG, 'utf8'));
    return taskId ? log.filter(e => e.taskId === taskId) : log;
  } catch (_) { return []; }
});

ipcMain.handle('import-tasks', async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
    title:      'Importar tareas',
    filters:    [{ name: 'JSON', extensions: ['json'] }],
    properties: ['openFile']
  });
  if (canceled || !filePaths.length) return null;
  try {
    const raw      = fs.readFileSync(filePaths[0], 'utf8');
    const imported = JSON.parse(raw);
    return Array.isArray(imported) ? imported : null;
  } catch (_) { return null; }
});

// ─── Quit ─────────────────────────────────────────────────────────────────────
app.on('before-quit',        () => { app.isQuitting = true; });
app.on('window-all-closed',  () => { if (process.platform !== 'darwin') app.quit(); });
