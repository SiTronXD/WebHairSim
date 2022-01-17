import * as Shaders from './shaders';
import { vec3, mat4 } from 'gl-matrix';
import { getTextureData } from './textureLoader';

export const createRenderLoop = (draw: any) =>
{
    let currentTime: any = performance.now();
    let lastTime: any = currentTime;
    let deltaTime: number = 0.0;

    function step()
    {
        // Calculate delta time
        currentTime = performance.now();
        deltaTime = (currentTime - lastTime) * 0.001;
        lastTime = currentTime;

        // Loop
        draw(deltaTime);
        requestAnimationFrame(step);
    }

    // Start loop
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
    cameraPosition: vec3 = [2, 2, 4], lookAtPosition: vec3 = [0, 0, 0],
    upDirection: vec3 = [0, 1, 0]) =>
{
    const viewMatrix = mat4.create();
    const projectionMatrix = mat4.create();
    const viewProjectionMatrix = mat4.create();

    mat4.perspective(projectionMatrix, 2*Math.PI/5, aspectRatio, 0.1, 100.0);
    mat4.lookAt(viewMatrix, cameraPosition, lookAtPosition, upDirection);
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

export const createModelRenderPipeline = (
    device: GPUDevice,
    gpuFormat: GPUTextureFormat,
    vertexShader: any,
    fragmentShader: any) =>
{
    // Vertex buffer is a single buffer
    const pipeline = device.createRenderPipeline(
    {
        vertex: 
        {
            module: device.createShaderModule(
            {                    
                code: vertexShader
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
                code: fragmentShader
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
                // Hair vertex positions, vec4 for read coherency
                {
                    arrayStride: 4*(4),
                    stepMode: 'vertex',
                    attributes: [
                    {
                        shaderLocation: 0,
                        format: "float32x4",
                        offset: 0
                    }]
                },
                // Hair UV coordinates
                {
                    arrayStride: 4*(2),
                    stepMode: 'vertex',
                    attributes: [
                    {
                        shaderLocation: 1,
                        format: "float32x2",
                        offset: 0
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
            cullMode: "none"
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

export const createComputeConstrainHairPipeline = (device: GPUDevice) =>
{
    return createComputePipeline(device, Shaders.getConstrainHairComputeShader());
}

export const createComputeApplyHairPipeline = (device: GPUDevice) =>
{
    return createComputePipeline(device, Shaders.getApplyHairComputeShader());
}

export const createComputeInterpolateHairPipeline = (device: GPUDevice) =>
{
    return createComputePipeline(device, Shaders.getInterpolateHairComputeShader());
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
                size: 64*3,
                offset: 0,
            }
        },
        {
            binding: 1,
            resource: 
            {
                buffer: fragmentUniformBuffer,
                size: 16*2,
                offset: 0,
            }
        }]
    });

    return uniformBindGroup;
}

export const createHairBindGroup = async(device: GPUDevice, pipeline: GPURenderPipeline,
    vertexUniformBuffer: GPUBuffer, fragmentUniformBuffer: GPUBuffer) =>
{
    // Load texture and sampler
    const textureData = await getTextureData(device, 'res/gfx/hairTexture.png');

    const uniformBindGroup = device.createBindGroup(
    {
        layout: pipeline.getBindGroupLayout(0),
        entries: [
        {
            binding: 0,
            resource: 
            {
                buffer: vertexUniformBuffer,
                size: 64*3,
                offset: 0,
            }
        },
        {
            binding: 1,
            resource: textureData.sampler
        },
        {
            binding: 2,
            resource: textureData.texture.createView()
        }]
    });

    return uniformBindGroup;
}

export const createComputeUpdateHairBindGroup = (
    device: GPUDevice, 
    computePipeline: GPUComputePipeline, 
    hairPointBuffer: GPUBuffer, 
    hairPointTempWriteBuffer: GPUBuffer, 
    hairPointPrevBuffer: GPUBuffer,
    hairPointRootBuffer: GPUBuffer,
    computeUniformBuffer: GPUBuffer, 
    computeMatrixBuffer: GPUBuffer,
    hairPointByteLength: number, 
    rootByteLength: number,
    uniformBufferByteLength: number,
    uniformMatrixBufferByteLength: number) =>
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
                size: hairPointByteLength,
                offset: 0,
            },
        },
        {
            binding: 1,
            resource: 
            {
                buffer: hairPointTempWriteBuffer,
                size: hairPointByteLength,
                offset: 0,
            },
        },
        {
            binding: 2,
            resource:
            {
                buffer: hairPointPrevBuffer,
                size: hairPointByteLength,
                offset: 0,
            }
        },
        {
            binding: 3,
            resource:
            {
                buffer: hairPointRootBuffer,
                size: rootByteLength,
                offset: 0,
            }
        },
        {
            binding: 4,
            resource: 
            {
                buffer: computeUniformBuffer,
                size: uniformBufferByteLength,
                offset: 0,
            },
        },
        {
            binding: 5,
            resource:
            {
                buffer: computeMatrixBuffer,
                size: uniformMatrixBufferByteLength,
                offset: 0,
            }
        }],
    });

    return createdBindGroup;
}

export const createComputeConstrainHairBindGroup = (device: GPUDevice,
    computePipeline: GPUComputePipeline,
    hairPointTempWriteBuffer: GPUBuffer,
    collisionSpheresBuffer: GPUBuffer,
    computeUniformBuffer: GPUBuffer,
    computeMatrixBuffer: GPUBuffer,
    hairPointByteLength: number,
    collisionSphereByteLength: number,
    computeUniformBufferByteLength: number,
    uniformMatrixBufferByteLength: number) =>
{
    const createdBindGroup = device.createBindGroup(
        {
            layout: computePipeline.getBindGroupLayout(0),
            entries: [
            {
                binding: 0,
                resource: 
                {
                    buffer: hairPointTempWriteBuffer,
                    size: hairPointByteLength,
                    offset: 0,
                },
            },        
            {
                binding: 1,
                resource:
                {
                    buffer: collisionSpheresBuffer,
                    size: collisionSphereByteLength,
                    offset: 0,
                }
            },
            {
                binding: 2,
                resource: 
                {
                    buffer: computeUniformBuffer,
                    size: computeUniformBufferByteLength,
                    offset: 0,
                },
            },    
            {
                binding: 3,
                resource:
                {
                    buffer: computeMatrixBuffer,
                    size: uniformMatrixBufferByteLength,
                    offset: 0,
                }
            }],
        });
    
        return createdBindGroup;
}

export const createComputeApplyHairBindGroup = (device: GPUDevice, 
    computePipeline: GPUComputePipeline, hairPointBuffer: GPUBuffer,
    hairPointTempWriteBuffer: GPUBuffer, 
    hairPointPrevBuffer: GPUBuffer,
    hairPointByteLength: number) =>
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
                size: hairPointByteLength,
                offset: 0,
            },
        },
        {
            binding: 1,
            resource: 
            {
                buffer: hairPointTempWriteBuffer,
                size: hairPointByteLength,
                offset: 0,
            },
        },
        {
            binding: 2,
            resource:
            {
                buffer: hairPointPrevBuffer,
                size: hairPointByteLength,
                offset: 0,
            }
        }],
    });

    return createdBindGroup;
}

export const createComputeInterpolateHairBindGroup = (device: GPUDevice, 
    computePipeline: GPUComputePipeline, 
    hairPointBuffer: GPUBuffer,
    hairPointPrevBuffer: GPUBuffer,
    hairPointVertexDataBuffer: GPUBuffer,
    interpolateHairUniformBuffer: GPUBuffer,
    interpolateHairVectorUniformBuffer: GPUBuffer,
    hairPointByteLength: number, 
    vertexDataByteLength: number,
    interpolateHairUniformBufferByteLength: number,
    interpolateHairVectorUniformBufferByteLength: number) =>
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
                size: hairPointByteLength,
                offset: 0,
            },
        },
        {
            binding: 1,
            resource:
            {
                buffer: hairPointPrevBuffer,
                size: hairPointByteLength,
                offset: 0,
            }
        },
        {
            binding: 2,
            resource: 
            {
                buffer: hairPointVertexDataBuffer,
                size: vertexDataByteLength,
                offset: 0,
            },
        },
        {
            binding: 3,
            resource:
            {
                buffer: interpolateHairUniformBuffer,
                size: interpolateHairUniformBufferByteLength,
                offset: 0,
            }
        },
        {
            binding: 4,
            resource:
            {
                buffer: interpolateHairVectorUniformBuffer,
                size: interpolateHairVectorUniformBufferByteLength,
                offset: 0,
            }
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
    const webGPUSupported = navigator.gpu != null;
    if(!webGPUSupported)
    {
        return { 
            webGPUSupported,
            device: undefined, 
            canvas: undefined, 
            format: undefined, 
            context: undefined, 
            framebufferSize: undefined
        };
    }

    const canvas = document.getElementById('canvas-webgpu') as HTMLCanvasElement;
    const adapter = await navigator.gpu?.requestAdapter() as GPUAdapter;
    const device = await adapter?.requestDevice() as GPUDevice;
    const context = canvas.getContext('webgpu') as unknown as GPUCanvasContext;

    const devicePixelRatio = window.devicePixelRatio || 1;
    const framebufferSize = [
        canvas.clientWidth * devicePixelRatio,
        canvas.clientHeight * devicePixelRatio
    ];
    const format = context.getPreferredFormat(adapter!);
    
    context.configure(
    {
        device: device,
        format: format,
        size: framebufferSize
    });

    return { 
        webGPUSupported,
        device, 
        canvas, 
        format, 
        context,
        framebufferSize
    };
}