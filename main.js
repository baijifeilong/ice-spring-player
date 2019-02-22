const {app, BrowserWindow} = require('electron');

app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required');

app.on('ready', function () {
    const mainWindow = new BrowserWindow({width: 1200, height: 800, frame: true});
    mainWindow.loadFile('index.html');
    JSON.parse("false") && mainWindow.webContents.openDevTools();
});

app.on("window-all-closed", () => app.exit());