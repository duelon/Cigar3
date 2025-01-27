import * as PIXI from 'pixi.js'
import Cell from "./Cell.js"
import {Joystick} from "./joystick.js";
import {createPixiButton} from "./pixi-utils.js";

export default class {
    constructor(core) {
        this.core = core

        this.initRenderer()
        this.initMinimap()

        this.cells = []
        this.cellsByID = new Map()
        this.ownedCells = []
        this.camera = {
            x: 1,
            y: 1,
            s: 1,
            w: 1,
            score: 0,
            target: {
                x: 1,
                y: 1,
                s: 1
            }
        }

        this.target_relative = new PIXI.Point()
        this.joystick_enable = false
        this.registerMouse()

        this.loop = this.loop.bind(this)

        this.skins = {}
        this.loop()
    }

    async loadInfos() {
        this.skins = await this.fetchSkins()
        this.servers = await this.fetchServers()
        await this.initJoystick()
        this.registerJoystick()

        window.setInterval(this.checkResize, 100)
        this.resizeLayout()
    }

    drawBorder() {
        if (this.borderGraphics) this.borderGraphics.destroy()

        const border = this.core.net.border
        this.borderGraphics = new PIXI.Graphics()
        .lineStyle(50, 0xffffff)
        .drawRect(-border.width / 2, -border.height / 2, border.width, border.height);
        this.borderGraphics.visible = this.core.settings.border

        this.field.addChild(this.borderGraphics)
    }

    drawBackground() {
        if (this.backgroundGraphics) this.backgroundGraphics.destroy()

        const border = this.core.net.border
        this.backgroundGraphics = new PIXI.Graphics()
        .beginFill(0x222222)
        .drawRect(-border.width / 2, -border.height / 2, border.width, border.height)
        .endFill()
        this.backgroundGraphics.visible = this.core.settings.background

        this.field.addChild(this.backgroundGraphics)
    }

    drawRainbowBorder() {
        if (this.rainbowSprite) this.rainbowSprite.destroy()
        
        const border = this.core.net.border
        this.rainbowSprite = new PIXI.Sprite.from('./sprites/rainbow-border.png')
        this.rainbowSprite.anchor.set(0.5)
        this.rainbowSprite.width = border.width * 1.043
        this.rainbowSprite.height = border.height * 1.043
        this.colorMatrix = new PIXI.filters.ColorMatrixFilter()
        this.rainbowSprite.filters = [this.colorMatrix] 
        this.hueDegree = 0
        this.rainbowSprite.visible = this.core.settings.rainbowBorder

        this.field.addChild(this.rainbowSprite)
        this.performHueShifting()
    }

    performHueShifting() {
        this.hueDegree += 1
        if (this.hueDegree > 360) this.hueDegree = 0
        this.colorMatrix.hue(this.hueDegree)
        this.hueShiftingRAF = requestAnimationFrame(this.performHueShifting.bind(this))
    }

    drawGrid() {
        if (this.gridSprite) this.gridSprite.destroy()

        const border = this.core.net.border
        const g = new PIXI.Graphics()
        const width = 100
        const height = 100
        g.lineStyle(10, 0x333333, 1)
        g.moveTo(width, 0)
        g.lineTo(0, 0)
        g.moveTo(width / 2, height / 2)
        g.lineTo(width / 2, -height / 2)
        const texture = this.renderer.generateTexture(g, PIXI.SCALE_MODES.LINEAR, 1, new PIXI.Rectangle(0, 0, width / 2, height / 2))
        texture.baseTexture.mipmap = true
        this.gridSprite = new PIXI.TilingSprite(texture, border.width, border.height)
        this.gridSprite.position.set(-border.width / 2, -border.height / 2)
        this.gridSprite.visible = this.core.settings.grid

        this.field.addChild(this.gridSprite)
    }

    drawSectors() {
        if (this.sectorContainer) this.sectorContainer.destroy()

        const labels = []
        const rows = 5
        const cols = 5
        const sectorSize = this.core.net.border.width / 5
        this.sectorContainer = new PIXI.Container()
        for (let row = 0; row < rows; row++) {
            labels[row] = []
            for (let col = 0; col < cols; col++) {
                const square = new PIXI.Graphics()
                square.lineStyle(100, 0x444444)
                square.drawRect(0, 0, sectorSize, sectorSize);
                square.position.set(col * sectorSize, row * sectorSize)
                const label = new PIXI.Text(String.fromCharCode(65 + row) + (col + 1), {
                    fontFamily: 'Arial',
                    fontSize: 1024,
                    fill: 0x444444
                })
                label.position.set(
                    col * sectorSize + (sectorSize - label.width) / 2,
                    row * sectorSize + (sectorSize - label.height) / 2
                )
                const sector = new PIXI.Container()
                sector.addChild(square, label)
                this.sectorContainer.addChild(sector)
            }
        }
        this.sectorContainer.position.set(-1 * sectorSize * 5 / 2, -1 * sectorSize * 5 / 2)
        this.sectorContainer.visible = this.core.settings.sectors

        this.field.addChild(this.sectorContainer)
    }

    initMinimap() {
        const sprite = this.minimapEntity = new PIXI.Sprite(PIXI.Texture.WHITE)
        sprite.width = 10
        sprite.height = 10
        sprite.anchor.set(.5)

        const miniGraphics = new PIXI.Graphics()
        miniGraphics.beginFill(0x0, 0.4)
        miniGraphics.drawRoundedRect(0, 0, 200, 200, 20)
        miniGraphics.endFill()

        this.minimapStage = new PIXI.Container()
        this.minimapStage.pivot.set(100, 100)
        this.minimapStage.addChild(miniGraphics, sprite)
        this.stage.addChild(this.minimapStage)
    }

    initRenderer() {
        const view = this.view = document.getElementById("view")
        this.renderer = new PIXI.Renderer({ 
            view,
            width: innerWidth,
            height: innerHeight,
            antialiasing: false,
            powerPreference: 'high-performance',
        })
        this.stage = new PIXI.Container()

        this.field = new PIXI.Container()
        this.field.sortableChildren = true

        this.stage.addChild(this.field)

        this.stage.interactive = true
        this.stage.hitArea = this.renderer.screen

        const circle = new PIXI.Graphics()
        circle.beginFill(0xffffff)
        circle.drawCircle(256, 256, 256)
        circle.endFill();

        const star = new PIXI.Graphics()
        .beginFill(0xffffff)
        .lineStyle(10, 0x777777, 1)
        .drawPolygon(new Star(256, 256, 30, 256, 220, 0))
        .endFill();

        const cellRenderTexture = PIXI.RenderTexture.create({ width: 512, height: 512 })
        this.renderer.render(circle, { renderTexture: cellRenderTexture })
        cellRenderTexture.baseTexture.mipmap = true

        const virusRenderTexture = PIXI.RenderTexture.create({ width: 512, height: 512 })
        this.renderer.render(star, { renderTexture: virusRenderTexture })
        virusRenderTexture.baseTexture.mipmap = true

        this.textures = { cell: cellRenderTexture, virus: virusRenderTexture }

        Cell.SPRITE = new PIXI.Sprite(cellRenderTexture)

        PIXI.BitmapFont.from("Nunito", {
            fontSize: 60,
            lineJoin: "round",
            fontFamily: "Nunito",
            fill: "white",
            stroke: "black",
            strokeThickness: 10
        })
    }

    fetchServers() {
        return new Promise((resolve, reject) => {
            fetch('./servers.json')
            .then(response => {
                if (!response.ok) reject()
                return response.json()
            })
            .then(servers => {
                resolve(servers)
            })
        })
    }

    fetchSkins() {
        return new Promise((resolve, reject) => {
            fetch('./skins.json')
            .then(response => {
                if (!response.ok) reject()
                return response.json()
            })
            .then(skins => {
                resolve(skins)
            })
        })
    }

    loop() {
        this.now = Date.now()
        for (const cell of this.cells.slice(0)) { cell.update(this.now) }
        this.updateCamera()

        this.renderer.render(this.stage)

        requestAnimationFrame(this.loop)
    }

    clear() {
        this.field.removeChildren()
        this.cells = []
        this.cellsByID = new Map()
        this.ownedCells = []
    }

    updateCamera() {
        const cells = [];
        for (const id of this.ownedCells) {
            const cell = this.cellsByID.get(id);
            if (cell) cells.push(cell);
        }

        let score = 0
        if (cells.length > 0) {
            let x = 0
            let y = 0
            let s = 0
            for (const cell of cells) {
                score += ~~(cell.r * cell.r / 100);
                x += cell.x;
                y += cell.y;
                s += cell.r;
            }
            this.camera.target.x = x / cells.length;
            this.camera.target.y = y / cells.length;
        }

        this.camera.x += (this.camera.target.x - this.camera.x) / 7
        this.camera.y += (this.camera.target.y - this.camera.y) / 7
        this.camera.target.s = 1;
        this.camera.target.s *= this.camera.w / 2;

        this.camera.s += (this.camera.target.s - this.camera.s) / 20;

        this.field.pivot.set(this.camera.x, this.camera.y)
        this.field.scale.set(this.camera.s)
        this.field.position.set(innerWidth / 2, innerHeight / 2)

        this.camera.score = score
    }

    get screen() {
        return this.renderer.screen
    }

    async initJoystick() {
        //TODO: for pixi-v7 use bundle!
        // PIXI.Assets.addBundle('joystick', {
        //     'joy_outer':'sprites/joystick.png',
        //     'joy_inner':'sprites/joystick-handle.png'
        // })
        // const resources = await PIXI.Assets.loadBundle('joystick')

        // this is pixi-v6 code
        const loader = new PIXI.Loader()
        loader.add('joy_outer', 'sprites/joystick.png')
        loader.add('joy_inner', 'sprites/joystick-handle.png')

        const p = new Promise((resolve, reject) => {
            loader.load((loader, resources) => {
                resolve(resources)
            })
        })
        const resources = await p;

        this.joystick = new Joystick({
            outerScale: { x : 1, y : 1},
            innerScale: { x : 1, y : 1},
            outer: new PIXI.Sprite(resources['joy_outer'].texture),
            inner: new PIXI.Sprite(resources['joy_inner'].texture),
        })
        this.joystick.position.set(this.screen.width - 200, this.screen.height - 200);
        this.stage.addChild(this.joystick)

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
    }

    registerMouse() {
        this.stage.on('mousemove', (event) => {
            if (!this.joystick_enable) {
                this.target_relative.x =
                    (event.data.global.x - this.screen.width/2) / this.camera.s
                this.target_relative.y =
                    (event.data.global.y - this.screen.height/2) / this.camera.s
            }
        })
    }

    registerJoystick() {
        const { joystick } = this
        joystick.settings.onStart = () => {
            this.joystick_enable = true
        }
        joystick.settings.onEnd = () => {
            this.joystick_enable = false
        }
        joystick.settings.onChange = ({ angle, direction, power, }) => {
            const p = power * 100 / this.camera.s
            const radian = -angle * Math.PI / 180.0
            this.target_relative.set(Math.cos(radian) * p, Math.sin(radian) * p)
        }

        this.joystick_split = createPixiButton("SPLIT", 60)
        this.joystick_split.on('clicked', () => {
            this.core.net.sendSplit();
        })
        this.joystick_eject = createPixiButton("EJECT", 60)
        this.joystick_eject.on('clicked', () => {
            this.core.net.sendEject();
        })
        this.stage.addChild(this.joystick_split, this.joystick_eject)
    }

    checkResize = () => {
        const elem_width = window.innerWidth
        const elem_height = window.innerHeight
        const { renderer } = this

        if (elem_width > 0 && elem_height > 0) {
            if (Math.abs(elem_width - renderer.screen.width) > 1 || Math.abs(elem_height - renderer.screen.height) > 1) {
                renderer.resize(elem_width, elem_height)
                // use event instead
                this.resizeLayout()
            }
        }
    }

    resizeLayout() {
        const {screen} = this.renderer
        this.joystick?.position.set(screen.width - 125, screen.height - 125)
        this.joystick_split?.position.set(70, screen.height - 150)
        this.joystick_eject?.position.set(200, screen.height - 100)
        this.minimapStage?.position.set(screen.width/2, screen.height - 105)
    }
}

class Star extends PIXI.Polygon {
    constructor(x, y, points, radius, innerRadius, rotation = 0) {
        innerRadius = innerRadius || radius / 2

        const startAngle = (-1 * Math.PI / 2) + rotation
        const len = points * 2
        const delta = PIXI.PI_2 / len
        const polygon = []

        for (let i = 0; i < len; i++) {
            const r = i % 2 ? innerRadius : radius
            const angle = (i * delta) + startAngle

            polygon.push(
                x + (r * Math.cos(angle)),
                y + (r * Math.sin(angle))
            );
        }

        super(polygon)
    }
}