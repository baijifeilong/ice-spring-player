const {app, BrowserWindow} = require('electron');

app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required');

app.on('ready', function () {
    const mainWindow = new BrowserWindow({width: 1200, height: 800, frame: false});
    mainWindow.loadFile('index.html');
    JSON.parse("false") && mainWindow.webContents.openDevTools();
});
