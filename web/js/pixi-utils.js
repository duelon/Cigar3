import * as PIXI from 'pixi.js';

export function createPixiButton(caption, rad = 60) {
    const button = new PIXI.Graphics();
    button.beginFill(0xffffff);
    button.drawCircle(0, 0, rad);
    button.alpha = 0.5;
    button.tint = 0x404040

    const text = new PIXI.Text(caption, { fontName: 'Courier', fontSize: 20 })
    text.anchor.set(0.5)
    button.addChild(text)
    button.interactive = true

    let last_click = 0
    const delay = 100

    button.on('pointerdown', () => {
        const now = performance.now()
        if (last_click + delay > now) {
            return
        }
        last_click = now
        if (button.tint < 0x800000) {
            button.tint = 0xffffff - button.tint
        }
        button.emit('clicked')
    })
    const pointerup = () => {
        if (button.tint > 0x800000) {
            button.tint = 0xffffff - button.tint
        }
    }
    button.on('pointerup', pointerup)
    button.on('pointerupoutside', pointerup)


    return button
}
