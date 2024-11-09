export function getMesh() {
    const buffer = new PIXI.Buffer(new Float32Array([
        1.05, 0.4,
        0.4, 1.05,
        -0.4, 1.05,
        -1.05, 0.4,
        -1.05, -0.4,
        -0.4, -1.05,
        0.4, -1.05,
        1.05, -0.4,
    ]))
    
    const geometry = new PIXI.Geometry()
        .addAttribute('aVertexPosition', buffer, 2) // the size of the attribute
    
    // A C TX
    // B D TY
    // 0 0 1
    
    // ось X  вектор (A,B) на экране
    // ось Y в (C,D)
    // нулевая точка (origin)  уходит в (tx,ty)
    
    //в шейдере хранение по столбцам
    
    const vertexSrc = `
        attribute vec2 aVertexPosition;
    
        uniform mat3 translationMatrix;
        uniform mat3 projectionMatrix;
    
        varying vec2 pixel_coord;
        varying vec3 circle;
        varying vec2 vUvs;
    
        void main() {
            vec2 pixel_vert = (translationMatrix * vec3(aVertexPosition, 1.0)).xy;
            vec2 pixel_center = translationMatrix[2].xy;
            float radius = length(translationMatrix[0].xy);
    
            pixel_coord = pixel_vert;
            circle = vec3(pixel_center, radius);
            vUvs = aVertexPosition * 0.5 + 0.5;
    
            gl_Position = vec4((projectionMatrix * translationMatrix * vec3(aVertexPosition, 1.0)).xy, 0.0, 1.0);
        }`;
    
    const fragmentSrc = `
        precision highp float;
    
        // varying vec2 vUvs;
    
        uniform sampler2D uSampler2;
        
        varying vec2 pixel_coord;
        varying vec3 circle;
        varying vec2 vUvs;
        
        float getAlpha() { 
            float dist = length(pixel_coord - circle.xy);
            float rad = circle.z;
            float segX = max(0.0, min(dist + 0.5, rad) - max(dist - 0.5, -rad));
            float segY = min(2.0 * rad, 1.0);
            return segX * segY;
        }
    
        void main() {
            vec4 color = vec4(0.0);
            
            color = texture2D(uSampler2, vUvs) * getAlpha();
            
        //    gl_FragColor = texture2D(uSampler2, vUvs) * vec4(vColor, 1.0);
            gl_FragColor = color;
        }`;
    
    const uniforms = {
        uSampler2: PIXI.Texture.from('bg_scene_rotate.jpg'),
    };
    
    const shader = PIXI.Shader.from(vertexSrc, fragmentSrc, uniforms);
    
    const triangle = new PIXI.Mesh(geometry, shader);
    
    triangle.drawMode = PIXI.DRAW_MODES.TRIANGLE_FAN
    
    triangle.scale.set(300);

    return triangle
}
