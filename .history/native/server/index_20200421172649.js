const electron = require('electron');
const app = electron.app;
const BrowserWindow = electron.BrowserWindow;
const ipcMain = electron.ipcMain;
const dialog = electron.dialog;

var mainWindow = null;

// 这里是把electron主线程当作server
function initialize(indexHTML, debug, {width, height, transparent, frame}) {
  width = width ? width : 0;
  height = height ? height : 0;
  transparent = transparent ? transparent : true;
  frame = frame ? frame : false;
  // 创建浏览器窗口。
  if(debug == true) {
    mainWindow = new BrowserWindow({webPreferences: {
        nodeIntegration:true,
      },width: width, height: height, transparent: transparent, frame: frame, x: 0, y:0, acceptFirstMouse: true});
      console.log("ui渲染线程 debug模式开启");
      mainWindow.openDevTools({mode:'detach'});
  } else {
    mainWindow = new BrowserWindow({webPreferences: {
        nodeIntegration:true,
      },width: width, height: height, transparent: true, frame: false, x: 0, y:0, acceptFirstMouse: true});
  }
  
  // 加载应用的 index.html
  mainWindow.loadURL(indexHTML);
  // mainWindow.setAlwaysOnTop(true);
  // 打开开发工具
  

  // 当 window 被关闭，这个事件会被发出
  mainWindow.on('closed', function() {
    // 取消引用 window 对象，如果你的应用支持多窗口的话，
    // 通常会把多个 window 对象存放在一个数组里面，
    // 但这次不是。
    mainWindow = null;
  });

  function debounce(fn, wait) {    
    var timeout = null;    
    return function() {        
        if(timeout !== null)   clearTimeout(timeout);        
        timeout = setTimeout(fn, wait);    
    }
  }
  let m_hwnd = mainWindow.getNativeWindowHandle().readUInt32LE();
  mainWindow.webContents.on('did-finish-load', function() {
    mainWindow.webContents.send('window_ready', {hwnd: m_hwnd});
  });
  // mainWindow.setBounds
  ipcMain.on('resize', function(event, arg) {
    if (arg != undefined) {
      // console.log(arg);
      mainWindow.showInactive();
      mainWindow.setResizable(true);
      mainWindow.setBounds({width:arg[0], height:arg[1], x: 0, y:0}, false);
      mainWindow.setResizable(false);
    }
  })
  // event.sender.send('test', 123);
  console.log(m_hwnd);
  ipcMain.on('open-file-dialog', (event) => {
    dialog.showOpenDialog({
      properties: ['openFile']
    }, (files) => {
      if (files) {
        event.sender.send('selected-file', files);
      }
    })
  })
  return mainWindow
}

exports.initialize = initialize;