import * as WGPU from './helper';
import { vec3, mat4 } from 'gl-matrix';
import { createSphereData, createHairStrandData } from './vertex_data';
import { loadOBJ } from './objLoader';

export const hairSim = async () =>
{
    const gpu = await WGPU.initGPU();
    const device = gpu.device;
    
    // Model data buffers
    const modelData = await loadOBJ('res/gfx/suzanne.obj');
    const modelHairRootGeometryData = await loadOBJ('res/gfx/suzanneHairRoot.obj');
    //const modelData = createSphereData(1.0, 10, 15);
    const modelNumIndices = modelData?.indexData.length!;
    const modelVertexBuffer = WGPU.createGPUBuffer(device, modelData?.vertexData!);
    const modelIndexBuffer = WGPU.createGPUBufferUint(device, modelData?.indexData!);
 

    // Hair strand data buffers
    const numHairPoints: number = 4;
    const numHairStrands: number = 2;
    const maxHairLength: number = 4.0;
    const hairStrandData = createHairStrandData(
        modelHairRootGeometryData, numHairPoints, numHairStrands
    );
    const hairStrandNumIndices = hairStrandData?.indexData.length!;
    const hairStrandIndexBuffer = WGPU.createGPUBufferUint(device, hairStrandData?.indexData);


    // Render pipelines and compute pipeline
    const modelPipeline = WGPU.createModelRenderPipeline(device, gpu.format);
    const hairPipeline = WGPU.createHairRenderPipeline(device, gpu.format);
    const computeUpdateHairPipeline = WGPU.createComputeUpdateHairPipeline(device);
    const computeApplyHairPipeline = WGPU.createComputeApplyHairPipeline(device);

    // Hair
    const numAllHairPoints = numHairPoints * numHairStrands;
    const initialHairPointRootPosData = hairStrandData.rootPositions;
    const initialHairPointData = hairStrandData.hairPointPositions;
    const initialHairPointAccelData = new Float32Array(numAllHairPoints * 4);
    const initialHairPointVertexData = new Float32Array(numAllHairPoints * 4 * 2);

    // Just init the point vertex positions to 0, since
    // these will be updated dynamically
    for(let i = 0; i < numAllHairPoints * 4 * 2; i++)
    {
        initialHairPointVertexData[i] = 0.0;
    }

    // Init gravity
    for(let i = 0; i < numAllHairPoints; i++)
    {
        initialHairPointAccelData[i * 4 + 0] = 0.0;
        initialHairPointAccelData[i * 4 + 1] = -40.0;
        initialHairPointAccelData[i * 4 + 2] = 0.0;
        initialHairPointAccelData[i * 4 + 3] = 0.0;
    }

    // Hair point position buffers
    const hairPointBuffer = WGPU.createGPUBuffer(
        device, 
        initialHairPointData, 
        GPUBufferUsage.VERTEX | GPUBufferUsage.STORAGE
    );
    const hairPointTempWriteBuffer = WGPU.createGPUBuffer(
        device, 
        initialHairPointData, 
        GPUBufferUsage.VERTEX | GPUBufferUsage.STORAGE
    );

    // Previous hair point position buffer
    const hairPointPrevBuffer = WGPU.createGPUBuffer(
        device, 
        initialHairPointData, 
        GPUBufferUsage.VERTEX | GPUBufferUsage.STORAGE
    );

    // Hair point root position buffer
    const hairPointRootBuffer = WGPU.createGPUBuffer(
        device,
        initialHairPointRootPosData,
        GPUBufferUsage.VERTEX | GPUBufferUsage.STORAGE
    );

    // Hair point acceleration buffer
    const hairPointAccelBuffer = WGPU.createGPUBuffer(
        device, 
        initialHairPointAccelData, 
        GPUBufferUsage.VERTEX | GPUBufferUsage.STORAGE
    );

    // Hair point to vertex data buffer
    const hairPointVertexDataBuffer = WGPU.createGPUBuffer(
        device, 
        initialHairPointVertexData, 
        GPUBufferUsage.VERTEX | GPUBufferUsage.STORAGE
    );

    // Create uniform data
    const normalMatrix = mat4.create();
    const modelMatrix = mat4.create();
    let vMatrix = mat4.create();
    let vpMatrix = mat4.create();
    const vp = WGPU.createViewProjection(gpu.canvas.width/gpu.canvas.height);
    vpMatrix = vp.viewProjectionMatrix;

    // Hair uniform data
    const HairParams = 
    {
        deltaTime: 0.007,
        maxHairPointDist: maxHairLength / (numHairPoints / numHairStrands),
        numberOfHairPoints: numHairPoints,
    };

    // Add rotation and camera
    let rotation = vec3.fromValues(0, 0, 0);       
    let eyePosition = new Float32Array(vp.cameraPosition);
    let lightPosition = eyePosition;

    // Create uniform buffer and layout
    const vertexUniformBuffer = device.createBuffer(
    {
        size: 192,
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
    });
    const fragmentUniformBuffer = device.createBuffer(
    {
        size: 32,
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
    });
    const computeUniformBufferSize: number = Object.keys(HairParams).length * 4;
    const computeUniformBuffer = device.createBuffer(
    {
        size: computeUniformBufferSize,
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
    });
    const computeUniformMatrixBufferSize: number = 1 * 4 * 4 * 4;
    const computeUniformMatrixBuffer = device.createBuffer(
    {
        size: computeUniformMatrixBufferSize,
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
    });

    // Write to uniforms
    device.queue.writeBuffer(vertexUniformBuffer, 0, vp.viewProjectionMatrix as ArrayBuffer);
    device.queue.writeBuffer(fragmentUniformBuffer, 0, lightPosition);
    device.queue.writeBuffer(fragmentUniformBuffer, 16, eyePosition);
    device.queue.writeBuffer(
        computeUniformBuffer, 
        0, 
        new Float32Array([
            HairParams.deltaTime, 
            HairParams.maxHairPointDist,
            HairParams.numberOfHairPoints
        ])
    );

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
    const computeUpdateHairBindGroup = WGPU.createComputeUpdateHairBindGroup(
        device,
        computeUpdateHairPipeline,
        hairPointBuffer,
        hairPointTempWriteBuffer,
        hairPointPrevBuffer,
        hairPointRootBuffer,
        hairPointAccelBuffer,
        computeUniformBuffer,
        computeUniformMatrixBuffer,
        initialHairPointData.byteLength,
        initialHairPointRootPosData.byteLength,
        computeUniformBufferSize,
        computeUniformMatrixBufferSize
    );
    const computeApplyHairBindGroup = WGPU.createComputeApplyHairBindGroup(
        device,
        computeApplyHairPipeline,
        hairPointBuffer,
        hairPointTempWriteBuffer,
        hairPointPrevBuffer,
        hairPointVertexDataBuffer,
        initialHairPointData.byteLength,
        initialHairPointVertexData.byteLength
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
        WGPU.createTransforms(modelMatrix, [0,0,Math.sin(rotation[1]) * 2.0], rotation);
        mat4.invert(normalMatrix, modelMatrix);
        mat4.transpose(normalMatrix, normalMatrix);
        device.queue.writeBuffer(vertexUniformBuffer, 64, modelMatrix as ArrayBuffer);
        device.queue.writeBuffer(vertexUniformBuffer, 128, normalMatrix as ArrayBuffer);

        // Update uniforms for compute buffer
        device.queue.writeBuffer(computeUniformMatrixBuffer, 0, modelMatrix as ArrayBuffer);

        // Recreate color attachment
        textureView = gpu.context.getCurrentTexture().createView();
        renderPassDescription.colorAttachments[0].view = textureView;

        // Start passes
        const commandEncoder = device.createCommandEncoder();

        // Compute pass
        {
            const passEncoder = commandEncoder.beginComputePass();

            // Hair physics
            passEncoder.setPipeline(computeUpdateHairPipeline);
            passEncoder.setBindGroup(0, computeUpdateHairBindGroup);
            passEncoder.dispatch(numAllHairPoints);

            // Apply changes
            passEncoder.setPipeline(computeApplyHairPipeline);
            passEncoder.setBindGroup(0, computeApplyHairBindGroup);
            passEncoder.dispatch(numAllHairPoints);

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
            passEncoder.setVertexBuffer(0, hairPointVertexDataBuffer);
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