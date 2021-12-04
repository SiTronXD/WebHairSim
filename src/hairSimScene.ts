import * as WGPU from './helper';
import * as Shader from './shaders';
import { vec3, mat4 } from 'gl-matrix';
import { createSphereData, createHairStrandData } from './vertex_data';

export const hairSim = async () =>
{
    const gpu = await WGPU.initGPU();
    const device = gpu.device;
    
    // Model data buffers
    const modelData = createSphereData(1.0, 10, 15);
    const modelNumIndices = modelData?.indexData.length!;
    const modelVertexBuffer = WGPU.createGPUBuffer(device, modelData?.vertexData!);
    const modelIndexBuffer = WGPU.createGPUBufferUint(device, modelData?.indexData!);
 
    // Hair strand buffers
    const numHairPoints = 4;
    const hairStrandData = createHairStrandData(numHairPoints);
    const hairStrandNumVertices = hairStrandData?.vertexData.length!;
    const hairStrandNumIndices = hairStrandData?.indexData.length!;
    const hairStrandVertexBuffer = WGPU.createGPUBuffer(device, hairStrandData?.vertexData);
    const hairStrandIndexBuffer = WGPU.createGPUBufferUint(device, hairStrandData?.indexData);


    // Shaders and render pipeline
    const modelPipeline = WGPU.createRenderPipeline(
        device, 
        Shader.getModelShaders(), 
        gpu.format
    );

    const hairShader = Shader.getHairShaders();
    const hairPipeline = device.createRenderPipeline({
        vertex: {
            module: device.createShaderModule({                    
                code: hairShader.vertexShader
            }),
            entryPoint: "main",
            buffers:[
                // Hair points, vec4 for read coherency
                {
                    arrayStride: 4*(4),
                    attributes: [
                        {
                            shaderLocation: 0,
                            format: "float32x4",
                            offset: 0
                        }
                    ]
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
                        }
                    ]
                }
            ]
        },
        fragment: {
            module: device.createShaderModule({                    
                code: hairShader.fragmentShader
            }),
            entryPoint: "main",
            targets: [
                {
                    format: gpu.format
                }
            ]
        },
        primitive: {
            topology: "triangle-list",
            cullMode: "back"
        },
        depthStencil: {
            format: "depth24plus",
            depthWriteEnabled: true,
            depthCompare: "less"
        }
    });
    const computePipeline = device.createComputePipeline(
    {
        compute: 
        {
            module: device.createShaderModule(
            {
                code: Shader.getHairComputeShader()
            }),
            entryPoint: 'main'
        }
    });

    const initialHairPointData = new Float32Array(hairStrandNumVertices);
    for(let i = 0; i < hairStrandNumVertices; i++)
    {
        initialHairPointData[i] = 0.0;
    }
    const hairPointBuffer = WGPU.createGPUBuffer(
        device, 
        initialHairPointData, 
        GPUBufferUsage.VERTEX | GPUBufferUsage.STORAGE
    );

    const computeBindGroup = device.createBindGroup({
        layout: computePipeline.getBindGroupLayout(0),
        entries: [
          {
            binding: 0,
            resource: {
              buffer: hairPointBuffer,
              offset: 0,
              size: initialHairPointData.byteLength,
            },
          }
        ],
      });

    // Create uniform data
    const normalMatrix = mat4.create();
    const modelMatrix = mat4.create();
    let vMatrix = mat4.create();
    let vpMatrix = mat4.create();
    const vp = WGPU.createViewProjection(gpu.canvas.width/gpu.canvas.height);
    vpMatrix = vp.viewProjectionMatrix;

    // Add rotation and camera
    let rotation = vec3.fromValues(0, 0, 0);       
    let eyePosition = new Float32Array(vp.cameraPosition);
    let lightPosition = eyePosition;

    // Create uniform buffer and layout
    const vertexUniformBuffer = device.createBuffer({
        size: 192,
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
    });
    const fragmentUniformBuffer = device.createBuffer({
        size: 32,
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
    });

    // Write to uniforms
    device.queue.writeBuffer(vertexUniformBuffer, 0, vp.viewProjectionMatrix as ArrayBuffer);
    device.queue.writeBuffer(fragmentUniformBuffer, 0, lightPosition);
    device.queue.writeBuffer(fragmentUniformBuffer, 16, eyePosition);

    // Uniform bind groups for uniforms
    const modelBindGroup = WGPU.createBindGroup(
        device, 
        modelPipeline, 
        vertexUniformBuffer, 
        fragmentUniformBuffer
    );
    const hairBindGroup = device.createBindGroup({
        layout: hairPipeline.getBindGroupLayout(0),
        entries: [
            {
                binding: 0,
                resource: {
                    buffer: vertexUniformBuffer,
                    offset: 0,
                    size: 64*3
                }
            },
            {
                binding: 1,
                resource: {
                    buffer: fragmentUniformBuffer,
                    offset: 0,
                    size: 16*2
                }
            }
        ]
    });

    // Color and depth textures
    let textureView = gpu.context.getCurrentTexture().createView();
    const depthTexture = device.createTexture({
        size: [gpu.canvas.width, gpu.canvas.height, 1],
        format: "depth24plus",
        usage: GPUTextureUsage.RENDER_ATTACHMENT
    });

    // Color and depth/stencil attachments
    const renderPassDescription = WGPU.createRenderPassDesc(
        textureView, 
        depthTexture.createView()
    );
    
    function draw() 
    {
        // Update model matrix and normal matrix
        WGPU.createTransforms(modelMatrix, [0,0,0], rotation);
        mat4.invert(normalMatrix, modelMatrix);
        mat4.transpose(normalMatrix, normalMatrix);
        device.queue.writeBuffer(vertexUniformBuffer, 64, modelMatrix as ArrayBuffer);
        device.queue.writeBuffer(vertexUniformBuffer, 128, normalMatrix as ArrayBuffer);

        // Recreate color attachment
        textureView = gpu.context.getCurrentTexture().createView();
        renderPassDescription.colorAttachments[0].view = textureView;

        // Start passes
        const commandEncoder = device.createCommandEncoder();

        // Compute pass
        {
            const passEncoder = commandEncoder.beginComputePass();
            passEncoder.setPipeline(computePipeline);
            passEncoder.setBindGroup(0, computeBindGroup);
            passEncoder.dispatch(hairStrandNumVertices);
            passEncoder.endPass();
        }
        
        // Draw pass
        {
            const passEncoder = commandEncoder.beginRenderPass(renderPassDescription as GPURenderPassDescriptor);

            // Model
            passEncoder.setPipeline(modelPipeline);
            passEncoder.setBindGroup(0, modelBindGroup);       
            passEncoder.setVertexBuffer(0, modelVertexBuffer);
            passEncoder.setIndexBuffer(modelIndexBuffer, "uint32");
            passEncoder.drawIndexed(modelNumIndices);

            // Hair
            passEncoder.setPipeline(hairPipeline);
            passEncoder.setBindGroup(0, hairBindGroup);    
            passEncoder.setVertexBuffer(0, hairPointBuffer);
            passEncoder.setVertexBuffer(1, hairStrandVertexBuffer);
            passEncoder.setIndexBuffer(hairStrandIndexBuffer, "uint32");
            passEncoder.drawIndexed(hairStrandNumIndices);

            // End of pass
            passEncoder.endPass();
        }

        // Submit passes
        device.queue.submit([commandEncoder.finish()]);
    }

    // Make draw() loop
    WGPU.createAnimation(draw, rotation);
}