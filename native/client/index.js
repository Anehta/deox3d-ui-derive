// 专门提供给electron 渲染线程初始化用的函数

const {UI_CHINNAL_START, 
    UI_CHINNAL_DISABLE, 
    UI_CHINNAL_RESIZE, 
    UI_CHINNAL_MOUSE_DOWN, 
    UI_CHINNAL_MOUSE_UP, 
    UI_CHINNAL_MOUSE_PRESS, 
    UI_CHINNAL_MOUSE_MOVE,
    UI_CHINNAL_MOUSE_WHEEL,
    UI_CHINNAL_KEYDOWN,
    UI_CHINNAL_KEYUP,
    UI_CHINNAL_CUSTOM_EVENT} = require('../proto');
const { EasySession } = require('../lib/easy-rpc');
const electron = require('electron');

const ipcRenderer = electron.ipcRenderer;
let debug = false;

function initialize(open_debug) {
    if(open_debug == true && open_debug != null && open_debug != undefined) {
        debug = true;
    }
    init_body();
    init_event_background();        //加载捕获事件用的背景层
    init_rpc_client();              //加载rpc客户端,全局里有个session可以使用
    init_alert();                   //修改默认对话框重载alert,使用主线程来弹出对话框,修复electron弹出默认对话框后页面失去焦点的bug
}

// 修改body的属性,为了让它与事件穿透层配合
function init_body() {
    let body = document.getElementsByTagName('body')[0];
    body.style.position = "absolute";
    body.style.top = 0;
    body.style.left = 0;
    body.style.zIndex = -101;
    body.style.width = '100vw';
    body.style.height = '100vh';
    body.style.margin = 0;
}

function init_event_background() {
    let event_bg = document.createElement('canvas');
    event_bg.tabIndex = 0;
    event_bg.style.zIndex = -100;   //设置为最低层级,所有ui都应该覆盖在它上面
    event_bg.style.width = '100vw'; //与屏幕一样大
    event_bg.style.height = '100vh';//与屏幕一样大
    event_bg.style.position = "absolute";
    event_bg.style.top = 0;
    event_bg.style.left = 0;
    // document.styleSheets[0].addRule('canvas:focus', 'outline: blue');
    let style = document.createElement('style');
    document.head.appendChild(style);
    sheet = style.sheet;
    sheet.addRule('canvas:focus', 'outline: transparent');
    event_bg.addEventListener('mouseenter', function(event) {
        event_bg.focus();
    });
    // sheet.insertRule('canvas:focus{outline: blue}');
    // 捕获鼠标按下事件
    event_bg.addEventListener('mousedown', function(event) {
        send_mouse_button_event('down', event.buttons, event.clientX, event.clientY);
    });

    // 捕获鼠标抬起事件
    event_bg.addEventListener('mouseup', function(event) {
        send_mouse_button_event('up', event.buttons, event.clientX, event.clientY);
    });

    // 捕获鼠标移动事件
    event_bg.addEventListener('mousemove', function(event) {
        send_mouse_move_event(event.buttons, event.clientX, event.clientY);
    });

    // 捕获鼠标滚轮事件
    event_bg.addEventListener('wheel', function(event) {
        send_mouse_wheel_event(event.deltaX/100, -event.deltaY/100);
    });

    // 焦点在canvas上时才触发
    event_bg.addEventListener('keydown', function(event) {
        send_key_down_event(event.key, event.code, event.altKey, event.ctrlKey, event.shiftKey);
    })

    // 焦点在canvas上时才触发
    event_bg.addEventListener('keyup', function(event) {
        send_key_up_event(event.key, event.code, event.altKey, event.ctrlKey, event.shiftKey);

    })
    
    let body = document.getElementsByTagName("body")[0];
    body.appendChild(event_bg);
}

//type = 'down' | 'up'
function send_mouse_button_event(type, button, x, y) {
    if(debug == true) {
        console.log("send_mouse_button_event", type, button, x, y);
    }
    if(type == 'down') {
        client_request(UI_CHINNAL_MOUSE_DOWN, [button, x, y]);
    } else if (type == 'up') {
        client_request(UI_CHINNAL_MOUSE_UP, [button, x, y]);
    }
}

function send_mouse_move_event(button, x, y) {
    if(debug == true) {
        console.log("send_mouse_move_event", button, x, y);
    }
    client_request(UI_CHINNAL_MOUSE_MOVE, [button, x, y]);
}

function send_mouse_wheel_event(x, y) {
    if(debug == true) {
        console.log("send_mouse_wheel_event", x, y);
    }
    client_request(UI_CHINNAL_MOUSE_WHEEL, [x, y]);
}

function send_key_down_event(key, code, alt, ctrl, shift) {
    if(debug == true) {
        console.log("send_key_down_event", key, code, alt, ctrl, shift);
    }
    client_request(UI_CHINNAL_KEYDOWN, [key, code, alt, ctrl, shift]);
}

function send_key_up_event(key, code, alt, ctrl, shift) {
    if(debug == true) {
        console.log("send_key_up_event",  key, code, alt, ctrl, shift);
    }
    client_request(UI_CHINNAL_KEYUP, [key, code, alt, ctrl, shift]);
}


function client_request(proto, arg) {
    session.request(proto, arg);
}

function init_ipc_renderer(init_ipcRenderer) {
    ipcRenderer = init_ipcRenderer
}

let session = null;
function init_rpc_client() {
    try {
        new EasySession('ws://127.0.0.1:23333', {
            __onclose(e) {
            console.log("关闭UIChannel客户端", e)
            },
            [UI_CHINNAL_START]: (arg) => {
            },
            [UI_CHINNAL_RESIZE]: (arg)=> {
                ipcRenderer.send("resize", arg);
            }
        }).then((ses) => {
            session = ses
            console.log("UIChannel Client 连接成功!")
        })
    } catch (err) {
        console.log(err);
    }

    ipcRenderer.on('window_ready', function(event, message) {
        let timer = setInterval(() => {
          if(session) {
            console.log("hwnd", session); //hwnd
            session.request(UI_CHINNAL_START, message.hwnd);
            clearInterval(timer);
          }
        }, 16.666)
    });
}

function init_alert() {
    var userAgent = navigator.userAgent.toLowerCase();
    if (userAgent.indexOf(' electron/') > -1){
                const { dialog } = require('electron').remote; //修改默认对话框，修复electron弹出默认对话框后页面失去焦点的bug
                alert = function(str){
                      var options = {
                        type: 'warning',
                        buttons: ["确定"],
                        defaultId: 0,
                        cancelId:0,
                        detail:str,
                        message: ''
                      }
                      dialog.showMessageBoxSync(null,options)
                }
                confirm = function(str){
                      var options = {
                        type: 'warning',
                        buttons: ["确认","取消"],
                        defaultId: 0,
                        cancelId:1,
                        detail:'',
                        message: str
                      }
                      var flag = dialog.showMessageBoxSync(null,options);
                      if(flag==0){
                          return true;
                      }else{
                          return false;
                      }
               }
    }
}

exports.initialize = initialize;