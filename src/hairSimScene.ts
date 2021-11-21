import * as WGPU from './helper';
import { Shaders } from './shaders';
import { vec3, mat4 } from 'gl-matrix';
import { SphereData } from './vertex_data';

export const HairSim = async () =>
{
    const gpu = await WGPU.InitGPU();
    const device = gpu.device;
    
    // Model data
    const data = SphereData(1.0, 10, 15);
    const vertexData = data?.vertexData!;
    const indexData = data?.indexData!;

    // Create buffers
    const numIndices = indexData.length;
    const vertexBuffer = WGPU.CreateGPUBuffer(device, vertexData);
    const indexBuffer = WGPU.CreateGPUBufferUint(device, indexData);
 
    // Shader and render pipeline
    const shader = Shaders();
    const pipeline = WGPU.CreateRenderPipeline(
        device, 
        shader, 
        gpu.format
    );

    // Create uniform data
    const normalMatrix = mat4.create();
    const modelMatrix = mat4.create();
    let vMatrix = mat4.create();
    let vpMatrix = mat4.create();
    const vp = WGPU.CreateViewProjection(gpu.canvas.width/gpu.canvas.height);
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

    // Uniform bind group for uniforms
    const uniformBindGroup = WGPU.CreateBindGroup(
        device, 
        pipeline, 
        vertexUniformBuffer, 
        fragmentUniformBuffer
    );

    // Color and depth textures
    let textureView = gpu.context.getCurrentTexture().createView();
    const depthTexture = device.createTexture({
        size: [gpu.canvas.width, gpu.canvas.height, 1],
        format: "depth24plus",
        usage: GPUTextureUsage.RENDER_ATTACHMENT
    });

    // Color and depth/stencil attachments
    const renderPassDescription = WGPU.CreateRenderPassDesc(
        textureView, 
        depthTexture.createView()
    );
    
    function Draw() 
    {
        // Update model matrix and normal matrix
        WGPU.CreateTransforms(modelMatrix, [0,0,0], rotation);
        mat4.invert(normalMatrix, modelMatrix);
        mat4.transpose(normalMatrix, normalMatrix);
        device.queue.writeBuffer(vertexUniformBuffer, 64, modelMatrix as ArrayBuffer);
        device.queue.writeBuffer(vertexUniformBuffer, 128, normalMatrix as ArrayBuffer);

        // Recreate color attachment
        textureView = gpu.context.getCurrentTexture().createView();
        renderPassDescription.colorAttachments[0].view = textureView;

        // Draw
        const commandEncoder = device.createCommandEncoder();
        const renderPass = commandEncoder.beginRenderPass(renderPassDescription as GPURenderPassDescriptor);
        renderPass.setPipeline(pipeline);
        renderPass.setVertexBuffer(0, vertexBuffer);
        renderPass.setIndexBuffer(indexBuffer, "uint32");
        renderPass.setBindGroup(0, uniformBindGroup);       
        renderPass.drawIndexed(numIndices);
        renderPass.endPass();

        // Submit
        device.queue.submit([commandEncoder.finish()]);
    }

    // Make draw() loop
    WGPU.CreateAnimation(Draw, rotation);
}