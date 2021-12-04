import * as Shaders from './shaders';
import { vec3, mat4 } from 'gl-matrix';

export const createAnimation = (draw: any, 
    rotation: vec3 = vec3.fromValues(0,0,0)) =>
{
    function step()
    {
        // Update rotation
        rotation[0] += 0.01;
        rotation[1] += 0.01;
        rotation[2] += 0.01;

        draw();
        requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
}

export const createTransforms = (
    modelMat: mat4, translation: vec3 = [0, 0, 0],
    rotation: vec3 = [0, 0, 0], scaling: vec3 = [1, 1, 1]) =>
{
    const rotateXMat = mat4.create();
    const rotateYMat = mat4.create();
    const rotateZMat = mat4.create();
    const translateMat = mat4.create();
    const scaleMat = mat4.create();

    // Perform individual transformations
    mat4.fromTranslation(translateMat, translation);
    mat4.fromXRotation(rotateXMat, rotation[0]);
    mat4.fromYRotation(rotateYMat, rotation[1]);
    mat4.fromZRotation(rotateZMat, rotation[2]);
    mat4.fromScaling(scaleMat, scaling);

    // Combine all transformation matrices together to form a final
    // transformation matrix: the model matrix
    mat4.multiply(modelMat, rotateXMat, scaleMat);
    mat4.multiply(modelMat, rotateYMat, modelMat);
    mat4.multiply(modelMat, rotateZMat, modelMat);
    mat4.multiply(modelMat, translateMat, modelMat);
}

export const createViewProjection = (aspectRatio = 1.0, 
    cameraPosition: vec3 = [2, 2, 4], lookDirection: vec3 = [0, 0, 0],
    upDirection: vec3 = [0, 1, 0]) =>
{
    const viewMatrix = mat4.create();
    const projectionMatrix = mat4.create();
    const viewProjectionMatrix = mat4.create();

    mat4.perspective(projectionMatrix, 2*Math.PI/5, aspectRatio, 0.1, 100.0);
    mat4.lookAt(viewMatrix, cameraPosition, lookDirection, upDirection);
    mat4.multiply(viewProjectionMatrix, projectionMatrix, viewMatrix);

    return { 
        viewMatrix, 
        projectionMatrix, 
        viewProjectionMatrix, 
        cameraPosition
    };
}

export const createRenderPassDesc = (
    textureView: GPUTextureView, depthTextureView: GPUTextureView) =>
{
    const renderPassDescription = 
    {
        colorAttachments: [
        {
            view: textureView,
            loadValue: { r: 0.2, g: 0.2, b: 0.2, a: 1.0 }, //background color
            storeOp: 'store'
        }],
        depthStencilAttachment: 
        {
            view: depthTextureView,
            depthLoadValue: 1.0,
            depthStoreOp: "store",
            stencilLoadValue: 0,
            stencilStoreOp: "store"
        }
    };

    return renderPassDescription;
}

export const createModelRenderPipeline = (device: GPUDevice,
    gpuFormat: GPUTextureFormat) =>
{
    const shader = Shaders.getModelShaders();

    // Vertex buffer is a single buffer
    const pipeline = device.createRenderPipeline(
    {
        vertex: 
        {
            module: device.createShaderModule(
            {                    
                code: shader.vertexShader
            }),
            entryPoint: "main",
            buffers:[
            {
                arrayStride: 4*(3+3),
                attributes: [
                {
                    shaderLocation: 0,
                    format: "float32x3",
                    offset: 0
                },
                {
                    shaderLocation: 1,
                    format: "float32x3",
                    offset: 4*3
                }]
            }]
        },
        fragment: 
        {
            module: device.createShaderModule(
            {
                code: shader.fragmentShader
            }),
            entryPoint: "main",
            targets: [
            {
                format: gpuFormat
            }]
        },
        primitive: 
        {
            topology: "triangle-list",
            cullMode: "back"
        },
        depthStencil: 
        {
            format: "depth24plus",
            depthWriteEnabled: true,
            depthCompare: "less"
        }
    });

    return pipeline;
}

export const createHairRenderPipeline = (device: GPUDevice,
    gpuFormat: GPUTextureFormat) =>
{
    const shader = Shaders.getHairShaders();

    const pipeline = device.createRenderPipeline(
    {
        vertex: 
        {
            module: device.createShaderModule(
            {
                code: shader.vertexShader
            }),
            entryPoint: "main",
            buffers: [
                // Hair points, vec4 for read coherency
                {
                    arrayStride: 4*(4),
                    attributes: [
                    {
                        shaderLocation: 0,
                        format: "float32x4",
                        offset: 0
                    }]
                },
                // Positions and normals
                {
                    arrayStride: 4*(3+3),
                    attributes: [
                    {
                        shaderLocation: 1,
                        format: "float32x3",
                        offset: 0
                    },
                    {
                        shaderLocation: 2,
                        format: "float32x3",
                        offset: 4*3
                    }]
                }
            ]
        },
        fragment: {
            module: device.createShaderModule(
            { 
                code: shader.fragmentShader
            }),
            entryPoint: "main",
            targets: [
            {
                format: gpuFormat
            }]
        },
        primitive: 
        {
            topology: "triangle-list",
            cullMode: "back"
        },
        depthStencil: 
        {
            format: "depth24plus",
            depthWriteEnabled: true,
            depthCompare: "less"
        }
    });

    return pipeline;
}

export const createComputePipeline = (device: GPUDevice, shader: any) =>
{
    const computePipeline = device.createComputePipeline(
    {
        compute: 
        {
            module: device.createShaderModule(
            {
                code: shader
            }),
            entryPoint: 'main'
        }
    });

    return computePipeline;
}

export const createComputeUpdateHairPipeline = (device: GPUDevice) =>
{
    return createComputePipeline(device, Shaders.getUpdateHairComputeShader());
}

export const createComputeApplyHairPipeline = (device: GPUDevice) =>
{
    return createComputePipeline(device, Shaders.getApplyHairComputeShader());
}

export const createBindGroup = (device: GPUDevice, pipeline: GPURenderPipeline,
    vertexUniformBuffer: GPUBuffer, fragmentUniformBuffer: GPUBuffer) =>
{
    const uniformBindGroup = device.createBindGroup(
    {
        layout: pipeline.getBindGroupLayout(0),
        entries: [
        {
            binding: 0,
            resource: 
            {
                buffer: vertexUniformBuffer,
                offset: 0,
                size: 64*3
            }
        },
        {
            binding: 1,
            resource: 
            {
                buffer: fragmentUniformBuffer,
                offset: 0,
                size: 16*2
            }
        }]
    });

    return uniformBindGroup;
}

export const createComputeUpdateHairBindGroup = (device: GPUDevice, 
    computePipeline: GPUComputePipeline, hairPointBuffer: GPUBuffer, 
    hairPointTempWriteBuffer: GPUBuffer, byteLength: number) =>
{
    const createdBindGroup = device.createBindGroup(
    {
        layout: computePipeline.getBindGroupLayout(0),
        entries: [
        {
            binding: 0,
            resource: 
            {
                buffer: hairPointBuffer,
                size: byteLength,
                offset: 0,
            },
        },
        {
            binding: 1,
            resource: 
            {
                buffer: hairPointTempWriteBuffer,
                size: byteLength,
                offset: 0,
            },
        }],
    });

    return createdBindGroup;
}

export const createComputeApplyHairBindGroup = (device: GPUDevice, 
    computePipeline: GPUComputePipeline, hairPointBuffer: GPUBuffer,
    hairPointTempWriteBuffer: GPUBuffer, 
    hairPointVertexDataBuffer: GPUBuffer,
    byteLength: number, vertexDataByteLength: number) =>
{
    const createdBindGroup = device.createBindGroup(
    {
        layout: computePipeline.getBindGroupLayout(0),
        entries: [
        {
            binding: 0,
            resource: 
            {
                buffer: hairPointBuffer,
                size: byteLength,
                offset: 0,
            },
        },
        {
            binding: 1,
            resource: 
            {
                buffer: hairPointTempWriteBuffer,
                size: byteLength,
                offset: 0,
            },
        },
        {
            binding: 2,
            resource: 
            {
                buffer: hairPointVertexDataBuffer,
                size: vertexDataByteLength,
                offset: 0,
            },
        }],
    });

    return createdBindGroup;
}

export const createGPUBufferUint = (device: GPUDevice, data: Uint32Array,
    usageFlag: GPUBufferUsageFlags = GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST) =>
{
    // Created mapped buffer
    const buffer = device.createBuffer(
    {
        size: data.byteLength,
        usage: usageFlag,
        mappedAtCreation: true
    });

    // Set buffer data 
    new Uint32Array(buffer.getMappedRange()).set(data);

    // Unmap
    buffer.unmap();

    return buffer;
}

export const createGPUBuffer = (device: GPUDevice, data: Float32Array,
    usageFlag: GPUBufferUsageFlags = GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST) => 
{
    // Create mapped buffer
    const buffer = device.createBuffer(
    {
        size: data.byteLength,
        usage: usageFlag,
        mappedAtCreation: true
    });

    // Set buffer data
    new Float32Array(buffer.getMappedRange()).set(data);

    // Unmap
    buffer.unmap();

    return buffer;
}

export const initGPU = async () => {
    const checkgpu = checkWebGPU();
    if(checkgpu.includes('Your current browser does not support WebGPU!'))
    {
        console.log(checkgpu);
        throw('Your current browser does not support WebGPU');
    }

    const canvas = document.getElementById('canvas-webgpu') as HTMLCanvasElement;
    const adapter = await navigator.gpu?.requestAdapter() as GPUAdapter;
    const device = await adapter?.requestDevice() as GPUDevice;
    const context = canvas.getContext('webgpu') as unknown as GPUCanvasContext;

    const devicePixelRatio = window.devicePixelRatio || 1;
    const size = [
        canvas.clientWidth * devicePixelRatio,
        canvas.clientHeight * devicePixelRatio
    ];
    const format = context.getPreferredFormat(adapter!);
    
    context.configure(
    {
        device: device,
        format: format,
        size: size
    });

    return { 
        device, 
        canvas, 
        format, 
        context 
    };
}

export const checkWebGPU = () => {
    let result = 'Great, your current browser supports WebGPU!';

    // WebGPU is not supported
    if(!navigator.gpu) 
    {
        result = `Your current browser does not support WebGPU! 
        Make sure you are on a system with WebGPU enabled. Currently,
        SPIR-WebGPU is only supported in <a href="https://www.google.com/chrome/canary">Chrome canary</a>
        with the flag "enable-unsafe-webgpu" enabled. See the
        <a href="https://github.com/gpuweb/gpuweb/wiki/Implementation-Status">
        Implementation Status</a> page for more details.`;
    }

    return result;
}