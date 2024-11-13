import * as PIXI from "pixi.js";

const Direction = {
    LEFT: 'left',
    TOP: 'top',
    BOTTOM: 'bottom',
    RIGHT: 'right',
    TOP_LEFT: 'top_left',
    TOP_RIGHT: 'top_right',
    BOTTOM_LEFT: 'bottom_left',
    BOTTOM_RIGHT: 'bottom_right'
}

const DIR_TO_POINT = {
    'left': new PIXI.Point(-1, 0),
    'top': new PIXI.Point(0, -1),
    'bottom': new PIXI.Point(0, 1),
    'right': new PIXI.Point(1, 0),
    top_left: new PIXI.Point(-1, -1),
    top_right: new PIXI.Point(1, -1),
    bottom_left: new PIXI.Point(-1, 1),
    bottom_right: new PIXI.Point(1, 1),
}

class Joystick extends PIXI.Container {
    settings = undefined

    outerRadius = 0;
    innerRadius = 0;

    outer = null;
    inner = null;

    innerAlphaStandby = 0.5;

    constructor(opts) {
        super();

        this.settings = Object.assign({
            outerScale: { x: 1, y: 1 },
            innerScale: { x: 1, y: 1 },
        }, opts);

        if (!this.settings.outer) {
            const outer = new PIXI.Graphics();
            outer.beginFill(0x000000);
            outer.drawCircle(0, 0, 60);
            outer.alpha = 0.5;
            this.settings.outer = outer;
        }

        if (!this.settings.inner) {
            const inner = new PIXI.Graphics();
            inner.beginFill(0x000000);
            inner.drawCircle(0, 0, 35);
            inner.alpha = this.innerAlphaStandby;
            this.settings.inner = inner;
        }

        this.initialize();
    }

    initialize() {
        this.outer = this.settings.outer;
        this.inner = this.settings.inner;

        this.outer.scale.set(this.settings.outerScale.x, this.settings.outerScale.y);
        this.inner.scale.set(this.settings.innerScale.x, this.settings.innerScale.y);

        if ('anchor' in this.outer) { this.outer.anchor.set(0.5); }
        if ('anchor' in this.inner) { this.inner.anchor.set(0.5); }

        this.addChild(this.outer);
        this.addChild(this.inner);

        // this.outerRadius = this.containerJoystick.width / 2;
        this.outerRadius = this.width / 2.5;
        this.innerRadius = this.inner.width / 2;

        this.bindEvents();
    }

    bindEvents() {
        let that = this;
        this.interactive = true;

        let dragging = false;
        let eventData = null;
        let power = null;
        let startPosition = null;

        function onDragStart(event) {
            eventData = event.data;
            startPosition = eventData.getLocalPosition(that);

            dragging = true;
            that.inner.alpha = 1;

            that.settings.onStart?.();
        }

        function onDragEnd(event) {
            if (dragging == false) { return; }

            that.inner.position.set(0, 0);

            dragging = false;
            that.inner.alpha = that.innerAlphaStandby;

            that.settings.onEnd?.();
        }

        function onDragMove(event) {
            if (dragging == false) { return; }

            let newPosition = eventData.getLocalPosition(that);

            let sideX = newPosition.x - startPosition.x;
            let sideY = newPosition.y - startPosition.y;

            let centerPoint = new PIXI.Point(0, 0);
            let angle = 0;

            if (sideX == 0 && sideY == 0) { return; }

            let calRadius = 0;

            if (sideX * sideX + sideY * sideY >= that.outerRadius * that.outerRadius) {
                calRadius = that.outerRadius;
            }
            else {
                calRadius = that.outerRadius - that.innerRadius;
            }

            /**
             * x:   -1 <-> 1
             * y:   -1 <-> 1
             *          Y
             *          ^
             *          |
             *     180  |  90
             *    ------------> X
             *     270  |  360
             *          |
             *          |
             */

            let direction = Direction.LEFT;

            if (sideX == 0) {
                if (sideY > 0) {
                    centerPoint.set(0, (sideY > that.outerRadius) ? that.outerRadius : sideY);
                    angle = 270;
                    direction = Direction.BOTTOM;
                } else {
                    centerPoint.set(0, -(Math.abs(sideY) > that.outerRadius ? that.outerRadius : Math.abs(sideY)));
                    angle = 90;
                    direction = Direction.TOP;
                }
                that.inner.position.set(centerPoint.x, centerPoint.y);
                power = that.getPower(centerPoint);
                that.settings.onChange?.({ angle, direction, power, });
                return;
            }

            if (sideY == 0) {
                if (sideX > 0) {
                    centerPoint.set((Math.abs(sideX) > that.outerRadius ? that.outerRadius : Math.abs(sideX)), 0);
                    angle = 0;
                    direction = Direction.LEFT;
                } else {
                    centerPoint.set(-(Math.abs(sideX) > that.outerRadius ? that.outerRadius : Math.abs(sideX)), 0);
                    angle = 180;
                    direction = Direction.RIGHT;
                }

                that.inner.position.set(centerPoint.x, centerPoint.y);
                power = that.getPower(centerPoint);
                that.settings.onChange?.({ angle, direction, power, });
                return;
            }

            let tanVal = Math.abs(sideY / sideX);
            let radian = Math.atan(tanVal);
            angle = radian * 180 / Math.PI;

            let centerX = 0;
            let centerY = 0;

            if (sideX * sideX + sideY * sideY >= that.outerRadius * that.outerRadius) {
                centerX = that.outerRadius * Math.cos(radian);
                centerY = that.outerRadius * Math.sin(radian);
            }
            else {
                centerX = Math.abs(sideX) > that.outerRadius ? that.outerRadius : Math.abs(sideX);
                centerY = Math.abs(sideY) > that.outerRadius ? that.outerRadius : Math.abs(sideY);
            }

            if (sideY < 0) {
                centerY = -Math.abs(centerY);
            }
            if (sideX < 0) {
                centerX = -Math.abs(centerX);
            }

            if (sideX > 0 && sideY < 0) {
                // < 90
            }
            else if (sideX < 0 && sideY < 0) {
                // 90 ~ 180
                angle = 180 - angle;
            }
            else if (sideX < 0 && sideY > 0) {
                // 180 ~ 270
                angle = angle + 180;
            }
            else if (sideX > 0 && sideY > 0) {
                // 270 ~ 369
                angle = 360 - angle;
            }
            centerPoint.set(centerX, centerY);
            power = that.getPower(centerPoint);

            direction = that.getDirection(centerPoint);
            that.inner.position.set(centerPoint.x, centerPoint.y);

            that.settings.onChange?.({ angle, direction, power, });
        };

        this.on('pointerdown', onDragStart)
            .on('pointerup', onDragEnd)
            .on('pointerupoutside', onDragEnd)
            .on('pointermove', onDragMove)
    }

    getPower(centerPoint) {
        const a = centerPoint.x - 0;
        const b = centerPoint.y - 0;
        return Math.min(1, Math.sqrt(a * a + b * b) / this.outerRadius);
    }

    getDirection(center) {
        let rad = Math.atan2(center.y, center.x);// [-PI, PI]
        if ((rad >= -Math.PI / 8 && rad < 0) || (rad >= 0 && rad < Math.PI / 8)) {
            return Direction.RIGHT;
        } else if (rad >= Math.PI / 8 && rad < 3 * Math.PI / 8) {
            return Direction.BOTTOM_RIGHT;
        } else if (rad >= 3 * Math.PI / 8 && rad < 5 * Math.PI / 8) {
            return Direction.BOTTOM;
        } else if (rad >= 5 * Math.PI / 8 && rad < 7 * Math.PI / 8) {
            return Direction.BOTTOM_LEFT;
        } else if ((rad >= 7 * Math.PI / 8 && rad < Math.PI) || (rad >= -Math.PI && rad < -7 * Math.PI / 8)) {
            return Direction.LEFT;
        } else if (rad >= -7 * Math.PI / 8 && rad < -5 * Math.PI / 8) {
            return Direction.TOP_LEFT;
        } else if (rad >= -5 * Math.PI / 8 && rad < -3 * Math.PI / 8) {
            return Direction.TOP;
        } else {
            return Direction.TOP_RIGHT;
        }
    }
}

function createButton(caption, rad = 60) {
    const button = new PIXI.Graphics();
    button.beginFill(0xffffff);
    button.drawCircle(0, 0, rad);
    button.alpha = 0.5;
    button.tint = 0x404040

    const text = new PIXI.Text(caption, { fontName: 'Courier', fontSize: 20 })
    text.anchor.set(0.5)
    button.addChild(text)
    button.interactive = true

    return button
}

// bombermine.controller("joystick", function($scope, $rootScope, Game, Keys, gamepad, actions) {
//
//     class Gamepad extends PIXI.utils.EventEmitter {
//         constructor() {
//             super()
//
//             this.prev = new PIXI.Point(0, 0)
//
//             this.init();
//         }
//
//         init() {
//             const viewport_pixi = document.getElementById('viewport_pixi')
//
//             const renderer = this.renderer = new PIXI.CanvasRenderer({
//                 width: 200, height: 200, backgroundAlpha: 0
//             })
//             const stage = this.stage = new PIXI.Container()
//             viewport_pixi.appendChild(renderer.view)
//
//             const ticker = new PIXI.Ticker()
//             // ticker.add(this.tick, this)
//             ticker.add(this.render, this, PIXI.UPDATE_PRIORITY.LOW)
//             ticker.start()
//
//             setInterval(() => {
//                 const { clientWidth, clientHeight } = viewport_pixi
//
//                 const width = Math.round(clientWidth);
//                 const height = Math.round(clientHeight);
//
//                 if (width > 0 && height > 0) {
//                     if (Math.abs(width - renderer.screen.width) > 1 || Math.abs(height - renderer.screen.height) > 1) {
//                         renderer.resize(width, height)
//                         this.emit('resize')
//                     }
//                 }
//             }, 100)
//
//             PIXI.Assets.addBundle('joystick', {
//                 'joy_outer':'i/pixi/joystick.png',
//                 'joy_inner':'i/pixi/joystick-handle.png'
//             })
//             PIXI.Assets.loadBundle('joystick').then((res) => {
//                 this.joystick = new Joystick({
//                     outerScale: {x: 0.65, y: 0.65},
//                     innerScale: {x: 0.65, y: 0.65},
//                     outer: new PIXI.Sprite(res['joy_outer']),
//                     inner: new PIXI.Sprite(res['joy_inner']),
//                     onChange: this.onJoystickChange,
//                     onEnd: () => { this.onJoystickChange({ power: 0, direction: 0}) }
//                 })
//                 this.button1 = createButton('BOMB', 40)
//                 this.button1.position.set(80, 60)
//                 this.button2 = createButton('ACT', 40)
//                 this.button2.position.set(150, 120)
//
//                 stage.addChild(this.joystick, this.button1, this.button2)
//
//                 this.on('resize', () => {
//                     this.joystick.position.set(renderer.screen.width - 100, renderer.screen.height - 100)
//                 })
//                 this.button1.on('pointerdown', () => {
//                     actions.pressGamepadDown('bomb')
//                     this.button1.tint = 0xffffff - this.button1.tint
//                 })
//                 this.button1.on('pointerup', () => {
//                     actions.pressGamepadUp('bomb')
//                     this.button1.tint = 0xffffff - this.button1.tint
//                 })
//                 this.button2.on('pointerdown', () => {
//                     actions.pressGamepadDown('detonate')
//                     this.button2.tint = 0xffffff - this.button2.tint
//                 })
//                 this.button2.on('pointerup', () => {
//                     actions.pressGamepadUp('detonate')
//                     this.button2.tint = 0xffffff - this.button2.tint
//                 })
//
//                 createButton()
//             })
//         }
//
//         onJoystickChange = ({ power, direction }) => {
//             const { prev } = this
//             let cur = new PIXI.Point()
//
//             if (power > 0.3) {
//                 cur = DIR_TO_POINT[direction]
//             }
//             // release old keys
//             if (prev.x > 0 && cur.x <= 0) {
//                 actions.pressGamepadUp('right')
//             }
//             if (prev.y > 0 && cur.y <= 0) {
//                 actions.pressGamepadUp('down')
//             }
//             if (prev.x < 0 && cur.x >= 0) {
//                 actions.pressGamepadUp('left')
//             }
//             if (prev.y < 0 && cur.y >= 0) {
//                 actions.pressGamepadUp('up')
//             }
//             // same but swapped prev <-> cur, and pressing new keys
//             if (cur.x > 0 && prev.x <= 0) {
//                 actions.pressGamepadDown('right')
//             }
//             if (cur.y > 0 && prev.y <= 0) {
//                 actions.pressGamepadDown('down')
//             }
//             if (cur.x < 0 && prev.x >= 0) {
//                 actions.pressGamepadDown('left')
//             }
//             if (cur.y < 0 && prev.y >= 0) {
//                 actions.pressGamepadDown('up')
//             }
//             prev.copyFrom(cur)
//         }
//
//         render() {
//             this.renderer.render(this.stage)
//         }
//     }
//
//     return new Gamepad();
// });