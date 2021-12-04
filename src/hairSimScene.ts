import * as WGPU from './helper';
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
 
    // Hair strand data buffers
    const numHairPoints = 4;
    const hairStrandData = createHairStrandData(numHairPoints);
    const hairStrandNumVertices = hairStrandData?.vertexData.length!;
    const hairStrandNumIndices = hairStrandData?.indexData.length!;
    const hairStrandVertexBuffer = WGPU.createGPUBuffer(device, hairStrandData?.vertexData);
    const hairStrandIndexBuffer = WGPU.createGPUBufferUint(device, hairStrandData?.indexData);


    // Render pipelines and compute pipeline
    const modelPipeline = WGPU.createModelRenderPipeline(
        device, 
        gpu.format
    );
    const hairPipeline = WGPU.createHairRenderPipeline(
        device,
        gpu.format
    );
    const computePipeline = WGPU.createComputePipeline(device);

    // Hair points
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

    // Uniform bind groups for uniforms in render pipeline and buffer
    // in compute pipeline
    const modelBindGroup = WGPU.createBindGroup(
        device, 
        modelPipeline, 
        vertexUniformBuffer, 
        fragmentUniformBuffer
    );
    const hairBindGroup = WGPU.createBindGroup(
        device,
        hairPipeline,
        vertexUniformBuffer, 
        fragmentUniformBuffer
    );
    const computeBindGroup = WGPU.createComputeBindGroup(
        device,
        computePipeline,
        hairPointBuffer,
        initialHairPointData.byteLength
    );

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