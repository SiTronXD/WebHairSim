import * as WGPU from './helper';
import { defaultShaders } from './shaders';
import { vec3, mat4 } from 'gl-matrix';
import { sphereData } from './vertex_data';

export const hairSim = async () =>
{
    const gpu = await WGPU.initGPU();
    const device = gpu.device;
    
    // Model data
    const data = sphereData(1.0, 10, 15);
    const vertexData = data?.vertexData!;
    const indexData = data?.indexData!;

    // Create buffers
    const numIndices = indexData.length;
    const vertexBuffer = WGPU.createGPUBuffer(device, vertexData);
    const indexBuffer = WGPU.createGPUBufferUint(device, indexData);
 
    // Shader and render pipeline
    const shader = defaultShaders();
    const pipeline = WGPU.createRenderPipeline(
        device, 
        shader, 
        gpu.format
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

    // Uniform bind group for uniforms
    const uniformBindGroup = WGPU.createBindGroup(
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
    WGPU.createAnimation(draw, rotation);
}