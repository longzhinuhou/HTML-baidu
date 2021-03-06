var log = function(){console.log.apply(console, arguments)}
//建立飞船对象
var Airship = function(id, pathId, dynaId, powerId) {
    this.id = id,
    this.path = pathId,
    this.state = 'stop',
    this.deg = 0,
    this.power = 100,
    this.dynaId = dynaId,
    this.powerId = powerId,
    this.speed,
    this.color,
    this.chargeSpeed,
    this.dischargeSpeed,
    this.shipDiv,
    this.powerDiv
}
//创建飞船
Airship.prototype.create = function() {
    let id = this.id,
        pid = this.path,
        dynaId = String(this.dynaId),
        powerId = String(this.powerId)
    this.speed = (dynaId === '0') ? 30 : ((dynaId === '1') ? 50 : 80)
    this.dischargeSpeed = (dynaId === '0') ? 5 : ((dynaId === '1') ? 7 : 9)
    this.chargeSpeed = (powerId === '0') ? 2 : ((powerId === '1') ? 3 : 4)
    this.color = (dynaId === '0') ? 'green' : ((dynaId === '1') ? 'blue' : 'purple')
    var t = `<div class="ship" data-ship=${id}>
                <div class="power" style="background-color:${this.color}"><span>100%</span></div>
            </div>`
    var path = $(`[data-path=${pid}]`)
    path.append(t)
    this.shipDiv = $(`[data-ship=${id}]`)
    this.powerDiv = $('.power', this.shipDiv)
    //把信息在控制台list中显示出来
    consoler(`创建飞船${id}号`,'green')
}
//飞船动力系统,包括飞行和停止和销毁
Airship.prototype.dynamicSystem = function() {
    //用一个参数self把this传进去,和bind(this)的效果相同
    var self = this
    var fly = function() {
        //剩下的能量还能飞多久(单位是s)，以及开始的角度，和这段时间能飞多少角度
        //注意这里不能在step里面直接用self.deg，否则无法在动画的过程中同步self.deg
        var time = self.power / self.dischargeSpeed
        var deg = self.deg
        var degEnd = self.deg + self.speed * time
        self.shipDiv.animate({xx: 0},{
            // 注意，这里animate不支持transform,不可直接用，但是可以用step函数实现
            step: function(n, fx) {
                // 这里指定了start，前面的xx就和这里无关了，随便写个数就好
                fx.start = deg
                fx.end = degEnd
                self.deg = n % 360
                // log(n)
                $(this).css('transform', `rotate(${n}deg)`)
            },
            duration : time * 1000
        })
    }
    var stop = function() {
        self.shipDiv.stop()
    }
    var destroy = function() {
        self.shipDiv.stop()
        self.powerDiv.stop()
        self.shipDiv.remove()
    }
    return {
        fly: fly,
        stop: stop,
        destroy: destroy
    }
}
//飞船能量系统，包括充能和放能
Airship.prototype.powerSystem = function() {
    var self = this
    var power = self.power
    var powerCharge = function(pStart, pEnd) {
        var time = Math.abs(pEnd - pStart) / self.dischargeSpeed
        self.powerDiv.animate({x: 0}, {
            step: function(n, fx) {
                fx.start = pStart
                fx.end = pEnd
                self.power = n
                //这里的this指的是调用动画的对象，即self.powerDiv
                $(this).css('width', `${n}%`)
                let m = Math.floor(n)
                $('span', this).text(`${m}%`)
                if (n > 50) {
                    $(this).css('background-color', `${self.color}`)
                } else if (n > 25) {
                    $(this).css('background-color', `orange`)
                } else {
                    $(this).css('background-color', `red`)
                }
            },
            //这里定义结束后执行的函数，如果能量为0，则飞船状态改为stop
            complete: function() {
                if (self.power === 0) {
                    self.stateManager().changeState('stop')
                }
            },
            duration : time * 1000,
        })
    }
    var discharge = function() {
        self.powerDiv.stop()
        self.powerSystem().powerCharge(power, 0)
    }
    var charge = function() {
        self.powerDiv.stop()
        self.powerSystem().powerCharge(power, 100)
    }
    return {
        powerCharge : powerCharge,
        discharge : discharge,
        charge : charge
    }
}
//不同状态时的相应行为
Airship.prototype.stateManager = function() {
    var self = this
    //不同状态时的行为函数
    var states = {
        flyState : function() {
            if (self.state !== 'destroy') {
                self.state = 'fly'
                self.dynamicSystem().fly()
                self.powerSystem().discharge()
                consoler(`${self.id}号飞船起飞,速度:${self.speed}km/s,耗能率:${self.dischargeSpeed}%/s`)
            }
        },
        stopState : function() {
            if (self.state !== 'destroy') {
                self.state = 'stop'
                self.dynamicSystem().stop()
                self.powerSystem().charge()
                consoler(`${self.id}号飞船停止,充能率${self.chargeSpeed}%/s`)
            }

        },
        destroyState : function() {
            self.state = 'destroy'
            self.dynamicSystem().destroy()
            consoler(`${self.id}号飞船已销毁~`,'red')
        }
    }
    var changeState = function(state) {
        if (state !== self.state) {
            states[`${state}State`]()
        }
    }
    return {changeState : changeState}
}
//接受信号系统，用于通过信号做出相应行为
Airship.prototype.messageManager = function(code) {
    var self = this
    var getMessage = function() {
        var msg = adapterDecompile(code)
        if (msg.shipId === self.path) {
            switch (msg.command) {
                case 'fly':
                case 'stop':
                case 'destroy':
                    self.stateManager().changeState(msg.command)
                    break;
                default:
                    alert("invalid command")
            }
        }
    }
    var adapterDecompile = function() {
        var shipId = Number(code[0]),
            commandCode = code.slice(1),
            command
        switch (commandCode) {
            case '0001':
                command = 'fly'
                break;
            case '0010':
                command = 'stop'
                break;
            case '1100':
                command = 'destroy'
                break;
            default:
                consoler(`无效命令`, 'red')
        }
        return {
            shipId : shipId,
            command : command
        }
    }
    return {getMessage : getMessage}

}

// var test1 = function() {
//     return {
//         t1: function() {
//             //这里返回的this是整个return的对象
//             log('t1的this是',this)
//         },
//         t2: function() {
//             log('t2的this是',this)
//         }
//     }
// }
//指挥官对象,参数为要发送的对象
var Commander = function(obj) {
    this.obj = obj,
    this.msg,
    this.pathId
}
Commander.prototype.commandManager = function() {
    var self = this
    var menuBind = function() {
        $('#cancel').on('click', function(e){
            $('.cover')[0].style.display = 'none'
        })
        $('#ok').on('click', function(e){
            let dynaId = $('#menu-select-dyna').val(),
                powerId = $('#menu-select-pow').val(),
                msgObj = {
                    message : self.msg,
                    pathId : self.pathId,
                    dynaId : dynaId,
                    powerId : powerId
                }
            self.obj.receive(msgObj).sendMessage()
            $('.cover')[0].style.display = 'none'
            $(('button[name="create"]'),`[data-con=${self.pathId}]`).attr('disabled', 'true').removeClass('hover')
        })
    }
    var buttonBind = function() {
        $('button', '.command').hover(function(e){
            $(e.target).addClass('hover')
        },function(e){
            $(e.target).removeClass('hover')
        })
        $('control').on('click', 'button', function(e){
            var t = $(e.target)
            var msg = t.attr('name')
            var pathId = t.parent().data('con')
            self.msg = msg
            self.pathId = pathId
            //如果点击的是create,则不能在这个轨道再创建，按钮变为不可点击
            if (msg === 'create') {
                $('.cover')[0].style.display = 'block'
                //把第一个置为选中
                $('#menu-select-dyna').children()[0].selected = 'selected'
                $('#menu-select-pow').children()[0].selected = 'selected'
            } else {
                if (msg === 'destroy') {
                    //如果点击销毁，则创建按钮可点击，这里不能用attr将disabled属性改为false,应删除此属性
                    t.siblings('button[name="create"]').removeAttr('disabled').removeClass('hover')
                }
                var msgObj = {
                    message : self.msg,
                    pathId : self.pathId
                }
                self.obj.receive(msgObj).sendMessage()
            }
        })
        consoler(`准备就绪,请下达指令`)
    }

    var commandBind = function() {
        buttonBind()
        menuBind()
    }
    return {commandBind : commandBind}
}


//mediator对象，作用是接受指挥官的信号并延迟发送，但是会有丢包，并且储存所有飞船的信息
var Mediator = function(missProb, sendSpeed) {
    this.shipData = new Object(),
    this.missProb = missProb,
    this.sendSpeed = sendSpeed
}
Mediator.prototype.receive = function(msg) {
    var self = this,
        pid = msg.pathId,
        ms = msg.message,
        prob = Number(self.missProb),
        sendSpeed = Number(self.sendSpeed)
    var adapterCompile = function() {
        var shipCode = msg.pathId,
            commandCode
        switch (msg.message) {
            case 'fly':
                commandCode = '0001'
                break;
            case 'stop':
                commandCode = '0010'
                break;
            case 'destroy':
                commandCode = '1100'
                break;
        }
        var code = shipCode + commandCode
        return code
    }
    var newShip = function() {
        var length = self.shipData.length,
            dynaId = msg.dynaId,
            powerId = msg.powerId,
            // newId = (length === 0) ? 1 : (self.shipData[length - 1].id + 1),
            newId = pid,
            newOne = new Airship(newId, pid, dynaId, powerId)
        newOne.create()
        // self.shipData.push(newOne)
        if (self.shipData[pid] !== undefined) {
            consoler(`飞船已经创建！`, 'red')
        } else {
            self.shipData[pid] = newOne
        }
    }
    var sendMessage = function() {
        var sendTimer = setInterval(function(){
            var test = Math.random()
            // log(test)
            var success = test > prob ? true : false
            if (success) {
                consoler(`信号发送成功！`, 'green')
                if (ms === 'create') {
                    //同级函数可以直接调用
                    newShip()
                } else {
                    //向所有的飞船发送命令
                    var code = adapterCompile()
                    var keys = Object.keys(self.shipData)
                    for (var i = 0; i < keys.length; i++) {
                        self.shipData[keys[i]].messageManager(code).getMessage()
                    }
                    if (ms === 'destroy') {
                        delete self.shipData[pid]
                    }
                }
                clearInterval(sendTimer)
            } else {
                consoler(`信号发送失败,重新发送中...`, 'red')
            }
        },sendSpeed)
    }
    return {
        sendMessage : sendMessage
    }
}

//控制台工具
var consoler = function(msg, color='blue') {
    var t = `<li style='color: ${color}'><i class="fa fa-volume-up"></i> ${msg}</li>`
    $('.list').find('ul').prepend(t)
}

//生成星空,把屏幕分成八块，每块里面随机分3-10个
var stars = function() {
    var divide = function() {
        for (var i = 0; i < 2; i++) {
            for (var j = 0; j < 4; j++) {
                let minLeft = 25 * j,
                    maxLeft = 25 * (j + 1),
                    minTop = 50 * i,
                    maxTop = 50 * (i + 1)
                eachArea(minLeft, maxLeft, minTop, maxTop)
            }
        }
    }
    var eachArea = function(minLeft, maxLeft, minTop, maxTop) {
        let min = 8, max = 15,
            num = Math.floor(Math.random() * (max - min) + min)
        for (let i = 0; i < num; i++) {
            var starLeft = Math.floor(Math.random() * (maxLeft - minLeft) + minLeft),
                starTop = Math.floor(Math.random() * (maxTop - minTop) + minTop),
                radius = Math.floor(Math.random() * 3 + 1)
            t = `<star style="width:${radius}px; height:${radius}px; top:${starTop}%; left:${starLeft}%"></star>`
            $('stars').append(t)
        }
    }
    var shinning = function() {
        var out = setInterval(function(){
            let num = Math.floor(Math.random() * ($('stars').children().length)),
                star = $($('stars').children()[num])
                star.animate({x:0},{
                    step : function(n, fx) {
                        $(this).css('background-color', 'transparent')
                    },
                    complete : function() {
                        $(this).css('background-color', 'white')
                    },
                    duration : 600
                })
        },1500)
    }
    return {
        divide : divide,
        shinning : shinning
    }
}
//主线程
window.onload = function() {
    stars().divide()
    stars().shinning()
    var media = new Mediator(0.1, 300)
    var commander = new Commander(media)
    commander.commandManager().commandBind()
}
// test()
