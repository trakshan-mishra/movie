const { app, BrowserWindow } = require('electron');
const path = require('path');

let mainWindow;

function createWindow() {
    mainWindow = new BrowserWindow({
      width: 800,
      height: 600,
      webPreferences: {
        nodeIntegration: true,
    contextIsolation: false,
    webSecurity: false,   
        preload: path.join(__dirname, 'preload.js')
      }
    });
  
    // If you're in production, load the built files
    if (process.env.NODE_ENV === 'production') {
      mainWindow.loadFile(path.join(__dirname, 'build', 'index.html'));
    } else {
      // For development, load the app locally
      mainWindow.loadURL('https://moviemx.netlify.app/');
    }
  }
  

app.whenReady().then(() => {
  createWindow();
  
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
