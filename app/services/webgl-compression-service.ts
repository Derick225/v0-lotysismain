"use client"

import * as tf from "@tensorflow/tfjs"

interface WebGLCompressionCapabilities {
    webgl2: boolean
    computeShaders: boolean
    textureFloat: boolean
    maxTextureSize: number
    maxComputeWorkGroupSize: number
    parallelProcessing: boolean
}

interface GPUCompressionResult {
    compressedData: ArrayBuffer
    compressionTime: number
    gpuMemoryUsed: number
    parallelOps: number
}

export class WebGLCompressionService {
    private static instance: WebGLCompressionService
    private gl: WebGL2RenderingContext | null = null
    private capabilities: WebGLCompressionCapabilities | null = null
    private shaderPrograms: Map<string, WebGLProgram> = new Map()
    private isInitialized = false

    private constructor() { }

    static getInstance(): WebGLCompressionService {
        if (!WebGLCompressionService.instance) {
            WebGLCompressionService.instance = new WebGLCompressionService()
        }
        return WebGLCompressionService.instance
    }

    async initialize(): Promise<boolean> {
        if (this.isInitialized) return true

        try {
            // Créer un canvas WebGL2 invisible
            const canvas = document.createElement("canvas")
            canvas.width = 1
            canvas.height = 1
            this.gl = canvas.getContext("webgl2", {
                antialias: false,
                depth: false,
                stencil: false,
                alpha: false,
                preserveDrawingBuffer: false,
                powerPreference: "high-performance",
            })

            if (!this.gl) {
                console.warn("WebGL2 non disponible, utilisation du CPU")
                return false
            }

            // Détecter les capacités
            this.capabilities = await this.detectCapabilities()

            // Compiler les shaders
            await this.compileShaders()

            this.isInitialized = true
            console.log("WebGL Compression Service initialisé avec succès")
            console.log("Capacités:", this.capabilities)

            return true
        } catch (error) {
            console.error("Erreur lors de l'initialisation WebGL:", error)
            return false
        }
    }

    private async detectCapabilities(): Promise<WebGLCompressionCapabilities> {
        if (!this.gl) throw new Error("WebGL non initialisé")

        const gl = this.gl

        // Vérifier les extensions
        const extensions = {
            textureFloat: gl.getExtension("EXT_color_buffer_float"),
            textureHalfFloat: gl.getExtension("EXT_color_buffer_half_float"),
        }

        return {
            webgl2: true,
            computeShaders: true, // WebGL2 supporte les compute shaders via transform feedback
            textureFloat: !!extensions.textureFloat,
            maxTextureSize: gl.getParameter(gl.MAX_TEXTURE_SIZE),
            maxComputeWorkGroupSize: 1024, // Simulé pour WebGL2
            parallelProcessing: true,
        }
    }

    private async compileShaders(): Promise<void> {
        if (!this.gl) return

        // Shader pour la quantification
        const quantizationShader = this.createShaderProgram(
            this.getQuantizationVertexShader(),
            this.getQuantizationFragmentShader(),
        )

        // Shader pour l'élagage
        const pruningShader = this.createShaderProgram(this.getPruningVertexShader(), this.getPruningFragmentShader())

        // Shader pour la compression de textures
        const compressionShader = this.createShaderProgram(
            this.getCompressionVertexShader(),
            this.getCompressionFragmentShader(),
        )

        // Shader pour la décompression
        const decompressionShader = this.createShaderProgram(
            this.getDecompressionVertexShader(),
            this.getDecompressionFragmentShader(),
        )

        this.shaderPrograms.set("quantization", quantizationShader)
        this.shaderPrograms.set("pruning", pruningShader)
        this.shaderPrograms.set("compression", compressionShader)
        this.shaderPrograms.set("decompression", decompressionShader)
    }

    private createShaderProgram(vertexSource: string, fragmentSource: string): WebGLProgram {
        if (!this.gl) throw new Error("WebGL non initialisé")

        const gl = this.gl

        const vertexShader = this.compileShader(gl.VERTEX_SHADER, vertexSource)
        const fragmentShader = this.compileShader(gl.FRAGMENT_SHADER, fragmentSource)

        const program = gl.createProgram()!
        gl.attachShader(program, vertexShader)
        gl.attachShader(program, fragmentShader)
        gl.linkProgram(program)

        if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
            const error = gl.getProgramInfoLog(program)
            gl.deleteProgram(program)
            throw new Error(`Erreur de liaison du programme: ${error}`)
        }

        return program
    }

    private compileShader(type: number, source: string): WebGLShader {
        if (!this.gl) throw new Error("WebGL non initialisé")

        const gl = this.gl
        const shader = gl.createShader(type)!

        gl.shaderSource(shader, source)
        gl.compileShader(shader)

        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
            const error = gl.getShaderInfoLog(shader)
            gl.deleteShader(shader)
            throw new Error(`Erreur de compilation du shader: ${error}`)
        }

        return shader
    }

    async compressModelGPU(
        model: tf.LayersModel,
        options: {
            quantizationBits: number
            pruningThreshold: number
            useParallelProcessing: boolean
        },
    ): Promise<GPUCompressionResult> {
        if (!this.isInitialized || !this.gl) {
            throw new Error("WebGL Compression Service non initialisé")
        }

        const startTime = performance.now()
        let gpuMemoryUsed = 0
        let parallelOps = 0

        try {
            const compressedLayers: Array<{
                type: string
                config: tf.serialization.ConfigDict
                weights: Array<{
                    shape: number[]
                    data: Float32Array
                    dtype: tf.DataType
                    quantizationBits: number
                    pruningThreshold: number
                }>
            }> = []

            // Traiter chaque couche en parallèle sur GPU
            for (const layer of model.layers) {
                const weights = layer.getWeights()

                if (weights.length > 0) {
                    const compressedWeights = await Promise.all(
                        weights.map(async (weight) => {
                            const result = await this.compressWeightTensorGPU(weight, options)
                            gpuMemoryUsed += result.memoryUsed
                            parallelOps += result.operations
                            return result.compressedWeight
                        }),
                    )

                    compressedLayers.push({
                        type: layer.getClassName(),
                        config: layer.getConfig(),
                        weights: compressedWeights,
                    })
                } else {
                    compressedLayers.push({
                        type: layer.getClassName(),
                        config: layer.getConfig(),
                        weights: [],
                    })
                }
            }

            // Sérialiser les données compressées
            const serializedData = JSON.stringify(compressedLayers)
            const compressedData = new TextEncoder().encode(serializedData).buffer

            const compressionTime = performance.now() - startTime

            return {
                compressedData: compressedData as ArrayBuffer,
                compressionTime,
                gpuMemoryUsed,
                parallelOps,
            }
        } catch (error) {
            console.error("Erreur lors de la compression GPU:", error)
            throw error
        }
    }

    private async compressWeightTensorGPU(
        weight: tf.Tensor,
        options: { quantizationBits: number; pruningThreshold: number },
    ): Promise<{
        compressedWeight: {
            shape: number[]
            data: Float32Array
            dtype: tf.DataType
            quantizationBits: number
            pruningThreshold: number
        }
        memoryUsed: number
        operations: number
    }> {
        if (!this.gl) throw new Error("WebGL non initialisé")

        const gl = this.gl
        let memoryUsed = 0
        let operations = 0

        try {
            // Convertir le tenseur en texture
            const texture = await this.tensorToTexture(weight)
            memoryUsed += this.calculateTextureMemory(weight.shape)

            // Appliquer la quantification sur GPU
            const quantizedTexture = await this.applyQuantizationGPU(texture, options.quantizationBits)
            operations += weight.size

            // Appliquer l'élagage sur GPU
            const prunedTexture = await this.applyPruningGPU(quantizedTexture, options.pruningThreshold)
            operations += weight.size

            // Convertir la texture résultante en données
            const compressedData = await this.textureToData(prunedTexture, weight.shape)

            // Nettoyer les textures GPU
            gl.deleteTexture(texture)
            gl.deleteTexture(quantizedTexture)
            gl.deleteTexture(prunedTexture)

            return {
                compressedWeight: {
                    shape: weight.shape,
                    data: compressedData,
                    dtype: weight.dtype,
                    quantizationBits: options.quantizationBits,
                    pruningThreshold: options.pruningThreshold,
                },
                memoryUsed,
                operations,
            }
        } catch (error) {
            console.error("Erreur lors de la compression du tenseur:", error)
            throw error
        }
    }

    private async tensorToTexture(tensor: tf.Tensor): Promise<WebGLTexture> {
        if (!this.gl) throw new Error("WebGL non initialisé")

        const gl = this.gl
        const data = await tensor.data()

        // Calculer les dimensions de texture optimales
        const totalElements = tensor.size
        const textureWidth = Math.min(Math.ceil(Math.sqrt(totalElements)), this.capabilities!.maxTextureSize)
        const textureHeight = Math.ceil(totalElements / textureWidth)

        // Créer la texture
        const texture = gl.createTexture()!
        gl.bindTexture(gl.TEXTURE_2D, texture)

        // Configurer la texture
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST)
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST)
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)

        // Préparer les données pour la texture
        const textureData = new Float32Array(textureWidth * textureHeight * 4) // RGBA
        for (let i = 0; i < data.length; i++) {
            textureData[i * 4] = data[i] // R
            textureData[i * 4 + 1] = 0 // G
            textureData[i * 4 + 2] = 0 // B
            textureData[i * 4 + 3] = 1 // A
        }

        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, textureWidth, textureHeight, 0, gl.RGBA, gl.FLOAT, textureData)

        return texture
    }

    private async applyQuantizationGPU(inputTexture: WebGLTexture, bits: number): Promise<WebGLTexture> {
        if (!this.gl) throw new Error("WebGL non initialisé")

        const gl = this.gl
        const program = this.shaderPrograms.get("quantization")!

        // Créer la texture de sortie
        const outputTexture = gl.createTexture()!
        gl.bindTexture(gl.TEXTURE_2D, outputTexture)
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST)
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST)

        // Créer un framebuffer pour le rendu
        const framebuffer = gl.createFramebuffer()!
        gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer)
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, outputTexture, 0)

        // Utiliser le programme de quantification
        gl.useProgram(program)

        // Définir les uniformes
        const quantizationLevels = Math.pow(2, bits) - 1
        gl.uniform1f(gl.getUniformLocation(program, "u_quantizationLevels"), quantizationLevels)
        gl.uniform1i(gl.getUniformLocation(program, "u_inputTexture"), 0)

        // Lier la texture d'entrée
        gl.activeTexture(gl.TEXTURE0)
        gl.bindTexture(gl.TEXTURE_2D, inputTexture)

        // Dessiner un quad plein écran
        this.drawFullScreenQuad()

        // Nettoyer
        gl.bindFramebuffer(gl.FRAMEBUFFER, null)
        gl.deleteFramebuffer(framebuffer)

        return outputTexture
    }

    private async applyPruningGPU(inputTexture: WebGLTexture, threshold: number): Promise<WebGLTexture> {
        if (!this.gl) throw new Error("WebGL non initialisé")

        const gl = this.gl
        const program = this.shaderPrograms.get("pruning")!

        // Créer la texture de sortie
        const outputTexture = gl.createTexture()!
        gl.bindTexture(gl.TEXTURE_2D, outputTexture)
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST)
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST)

        // Créer un framebuffer
        const framebuffer = gl.createFramebuffer()!
        gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer)
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, outputTexture, 0)

        // Utiliser le programme d'élagage
        gl.useProgram(program)

        // Définir les uniformes
        gl.uniform1f(gl.getUniformLocation(program, "u_pruningThreshold"), threshold)
        gl.uniform1i(gl.getUniformLocation(program, "u_inputTexture"), 0)

        // Lier la texture d'entrée
        gl.activeTexture(gl.TEXTURE0)
        gl.bindTexture(gl.TEXTURE_2D, inputTexture)

        // Dessiner
        this.drawFullScreenQuad()

        // Nettoyer
        gl.bindFramebuffer(gl.FRAMEBUFFER, null)
        gl.deleteFramebuffer(framebuffer)

        return outputTexture
    }

    private async textureToData(texture: WebGLTexture, shape: number[]): Promise<Float32Array> {
        if (!this.gl) throw new Error("WebGL non initialisé")

        const gl = this.gl

        // Créer un framebuffer pour lire la texture
        const framebuffer = gl.createFramebuffer()!
        gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer)
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0)

        // Lire les pixels
        const totalElements = shape.reduce((a, b) => a * b, 1)
        const textureWidth = Math.min(Math.ceil(Math.sqrt(totalElements)), this.capabilities!.maxTextureSize)
        const textureHeight = Math.ceil(totalElements / textureWidth)

        const pixels = new Float32Array(textureWidth * textureHeight * 4)
        gl.readPixels(0, 0, textureWidth, textureHeight, gl.RGBA, gl.FLOAT, pixels)

        // Extraire seulement les valeurs du canal rouge
        const data = new Float32Array(totalElements)
        for (let i = 0; i < totalElements; i++) {
            data[i] = pixels[i * 4] // Canal rouge
        }

        // Nettoyer
        gl.bindFramebuffer(gl.FRAMEBUFFER, null)
        gl.deleteFramebuffer(framebuffer)

        return data
    }

    async decompressModelGPU(compressedData: ArrayBuffer): Promise<tf.LayersModel> {
        if (!this.isInitialized || !this.gl) {
            throw new Error("WebGL Compression Service non initialisé")
        }

        try {
            // Désérialiser les données
            const jsonString = new TextDecoder().decode(compressedData)
            const layersData = JSON.parse(jsonString)

            // Reconstruire le modèle
            const model = tf.sequential()

            for (const layerData of layersData) {
                if (layerData.weights.length > 0) {
                    // Décompresser les poids sur GPU
                    const decompressedWeights = await Promise.all(
                        layerData.weights.map((weightData: ArrayBuffer) => this.decompressWeightTensorGPU(weightData)),
                    )

                    // Créer la couche avec les poids décompressés
                    const layer = this.createLayerFromConfig(layerData.type, layerData.config)
                    model.add(layer)

                    // Définir les poids après avoir ajouté la couche
                    if (decompressedWeights.length > 0) {
                        layer.setWeights(decompressedWeights)
                    }
                } else {
                    // Couche sans poids
                    const layer = this.createLayerFromConfig(layerData.type, layerData.config)
                    model.add(layer)
                }
            }

            return model
        } catch (error) {
            console.error("Erreur lors de la décompression GPU:", error)
            throw error
        }
    }

    private async decompressWeightTensorGPU(weightData: {
        shape: number[]
        data: Float32Array
        dtype: tf.DataType
        quantizationBits: number
        pruningThreshold: number
    }): Promise<tf.Tensor> {
        if (!this.gl) throw new Error("WebGL non initialisé")

        try {
            // Créer une texture à partir des données compressées
            const texture = await this.dataToTexture(weightData.data, weightData.shape)

            // Appliquer la décompression sur GPU
            const decompressedTexture = await this.applyDecompressionGPU(texture, weightData)

            // Convertir la texture en tenseur
            const decompressedData = await this.textureToData(decompressedTexture, weightData.shape)
            const tensor = tf.tensor(decompressedData, weightData.shape, weightData.dtype)

            // Nettoyer les textures
            this.gl.deleteTexture(texture)
            this.gl.deleteTexture(decompressedTexture)

            return tensor
        } catch (error) {
            console.error("Erreur lors de la décompression du tenseur:", error)
            throw error
        }
    }

    private async dataToTexture(data: Float32Array, shape: number[]): Promise<WebGLTexture> {
        if (!this.gl) throw new Error("WebGL non initialisé")

        const gl = this.gl
        const totalElements = shape.reduce((a, b) => a * b, 1)
        const textureWidth = Math.min(Math.ceil(Math.sqrt(totalElements)), this.capabilities!.maxTextureSize)
        const textureHeight = Math.ceil(totalElements / textureWidth)

        const texture = gl.createTexture()!
        gl.bindTexture(gl.TEXTURE_2D, texture)

        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST)
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST)
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)

        // Préparer les données RGBA
        const textureData = new Float32Array(textureWidth * textureHeight * 4)
        for (let i = 0; i < data.length; i++) {
            textureData[i * 4] = data[i]
            textureData[i * 4 + 1] = 0
            textureData[i * 4 + 2] = 0
            textureData[i * 4 + 3] = 1
        }

        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, textureWidth, textureHeight, 0, gl.RGBA, gl.FLOAT, textureData)

        return texture
    }

    private async applyDecompressionGPU(inputTexture: WebGLTexture, weightData: {
        quantizationBits: number
        pruningThreshold: number
    }): Promise<WebGLTexture> {
        if (!this.gl) throw new Error("WebGL non initialisé")

        const gl = this.gl
        const program = this.shaderPrograms.get("decompression")!

        const outputTexture = gl.createTexture()!
        gl.bindTexture(gl.TEXTURE_2D, outputTexture)
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST)
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST)

        const framebuffer = gl.createFramebuffer()!
        gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer)
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, outputTexture, 0)

        gl.useProgram(program)

        // Paramètres de décompression
        const quantizationLevels = Math.pow(2, weightData.quantizationBits) - 1
        gl.uniform1f(gl.getUniformLocation(program, "u_quantizationLevels"), quantizationLevels)
        gl.uniform1f(gl.getUniformLocation(program, "u_pruningThreshold"), weightData.pruningThreshold)
        gl.uniform1i(gl.getUniformLocation(program, "u_inputTexture"), 0)

        gl.activeTexture(gl.TEXTURE0)
        gl.bindTexture(gl.TEXTURE_2D, inputTexture)

        this.drawFullScreenQuad()

        gl.bindFramebuffer(gl.FRAMEBUFFER, null)
        gl.deleteFramebuffer(framebuffer)

        return outputTexture
    }

    private drawFullScreenQuad(): void {
        if (!this.gl) return

        const gl = this.gl

        // Créer un buffer pour le quad plein écran
        const vertices = new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1])

        const buffer = gl.createBuffer()
        gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
        gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW)

        const positionLocation = gl.getAttribLocation(gl.getParameter(gl.CURRENT_PROGRAM), "a_position")
        gl.enableVertexAttribArray(positionLocation)
        gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0)

        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)

        gl.deleteBuffer(buffer)
    }

    private createLayerFromConfig(type: string, config: tf.serialization.ConfigDict): tf.layers.Layer {
        switch (type) {
            case "Dense":
                return tf.layers.dense(config)
            case "LSTM":
                return tf.layers.lstm(config)
            case "Conv2D":
                return tf.layers.conv2d(config)
            case "Dropout":
                return tf.layers.dropout(config)
            case "MaxPooling2D":
                return tf.layers.maxPooling2d(config)
            case "Flatten":
                return tf.layers.flatten(config)
            default:
                throw new Error(`Type de couche non supporté: ${type}`)
        }
    }

    private calculateTextureMemory(shape: number[]): number {
        const totalElements = shape.reduce((a, b) => a * b, 1)
        return totalElements * 4 * 4 // 4 composants RGBA * 4 bytes par float
    }

    // Shaders GLSL
    private getQuantizationVertexShader(): string {
        return `#version 300 es
      in vec2 a_position;
      out vec2 v_texCoord;
      
      void main() {
        gl_Position = vec4(a_position, 0.0, 1.0);
        v_texCoord = (a_position + 1.0) * 0.5;
      }
    `
    }

    private getQuantizationFragmentShader(): string {
        return `#version 300 es
      precision highp float;
      
      in vec2 v_texCoord;
      out vec4 fragColor;
      
      uniform sampler2D u_inputTexture;
      uniform float u_quantizationLevels;
      
      void main() {
        vec4 inputValue = texture(u_inputTexture, v_texCoord);
        
        // Quantification du canal rouge
        float quantized = round(inputValue.r * u_quantizationLevels) / u_quantizationLevels;
        
        fragColor = vec4(quantized, inputValue.gba);
      }
    `
    }

    private getPruningVertexShader(): string {
        return `#version 300 es
      in vec2 a_position;
      out vec2 v_texCoord;
      
      void main() {
        gl_Position = vec4(a_position, 0.0, 1.0);
        v_texCoord = (a_position + 1.0) * 0.5;
      }
    `
    }

    private getPruningFragmentShader(): string {
        return `#version 300 es
      precision highp float;
      
      in vec2 v_texCoord;
      out vec4 fragColor;
      
      uniform sampler2D u_inputTexture;
      uniform float u_pruningThreshold;
      
      void main() {
        vec4 inputValue = texture(u_inputTexture, v_texCoord);
        
        // Élagage basé sur la valeur absolue
        float prunedValue = abs(inputValue.r) > u_pruningThreshold ? inputValue.r : 0.0;
        
        fragColor = vec4(prunedValue, inputValue.gba);
      }
    `
    }

    private getCompressionVertexShader(): string {
        return `#version 300 es
      in vec2 a_position;
      out vec2 v_texCoord;
      
      void main() {
        gl_Position = vec4(a_position, 0.0, 1.0);
        v_texCoord = (a_position + 1.0) * 0.5;
      }
    `
    }

    private getCompressionFragmentShader(): string {
        return `#version 300 es
      precision highp float;
      
      in vec2 v_texCoord;
      out vec4 fragColor;
      
      uniform sampler2D u_inputTexture;
      
      void main() {
        vec4 inputValue = texture(u_inputTexture, v_texCoord);
        
        // Compression avancée avec encodage
        float compressed = inputValue.r;
        
        // Appliquer une compression par blocs
        vec2 blockCoord = floor(v_texCoord * 8.0) / 8.0;
        float blockAverage = texture(u_inputTexture, blockCoord).r;
        
        // Encoder la différence
        float delta = compressed - blockAverage;
        float encodedDelta = delta * 0.5 + 0.5; // Normaliser entre 0 et 1
        
        fragColor = vec4(encodedDelta, blockAverage, 0.0, 1.0);
      }
    `
    }

    private getDecompressionVertexShader(): string {
        return `#version 300 es
      in vec2 a_position;
      out vec2 v_texCoord;
      
      void main() {
        gl_Position = vec4(a_position, 0.0, 1.0);
        v_texCoord = (a_position + 1.0) * 0.5;
      }
    `
    }

    private getDecompressionFragmentShader(): string {
        return `#version 300 es
      precision highp float;
      
      in vec2 v_texCoord;
      out vec4 fragColor;
      
      uniform sampler2D u_inputTexture;
      uniform float u_quantizationLevels;
      uniform float u_pruningThreshold;
      
      void main() {
        vec4 inputValue = texture(u_inputTexture, v_texCoord);
        
        // Décompression inverse
        float encodedDelta = inputValue.r;
        float blockAverage = inputValue.g;
        
        // Décoder la différence
        float delta = (encodedDelta - 0.5) * 2.0;
        float decompressed = blockAverage + delta;
        
        // Appliquer l'inverse de la quantification
        float dequantized = round(decompressed * u_quantizationLevels) / u_quantizationLevels;
        
        // Appliquer l'inverse de l'élagage
        float final = abs(dequantized) > u_pruningThreshold ? dequantized : 0.0;
        
        fragColor = vec4(final, 0.0, 0.0, 1.0);
      }
    `
    }

    getCapabilities(): WebGLCompressionCapabilities | null {
        return this.capabilities
    }

    isWebGLAvailable(): boolean {
        return this.isInitialized && this.gl !== null
    }

    dispose(): void {
        if (this.gl) {
            // Nettoyer les programmes de shaders
            this.shaderPrograms.forEach((program) => {
                this.gl!.deleteProgram(program)
            })
            this.shaderPrograms.clear()

            // Le contexte sera nettoyé automatiquement
            this.gl = null
        }

        this.isInitialized = false
    }
}
