import * as WGPU from './helper';
import * as Shaders from './shaders';
import { vec3, mat4, vec4 } from 'gl-matrix';
import { createSphereData, createHairStrandData } from './vertex_data';
import { loadOBJ } from './objLoader';

export const hairSim = async (renderCollisionSpheres: boolean) =>
{
    const gpu = await WGPU.initGPU();
    const device = gpu.device;
    
    // Model data buffers
    const modelData = await loadOBJ('res/gfx/suzanne.obj');
    //const modelData = await loadOBJ('res/gfx/suzanneHairRoot.obj');
    const modelHairRootGeometryData = await loadOBJ('res/gfx/suzanneHairRoot.obj');
    const modelNumIndices = modelData?.indexData.length!;
    const modelVertexBuffer = WGPU.createGPUBuffer(device, modelData?.vertexData!);
    const modelIndexBuffer = WGPU.createGPUBufferUint(device, modelData?.indexData!);
 

    // Hair strand data buffers
    const numHairPoints: number = 4;
    const numHairStrands: number = 200;
    const hairStrandLength: number = 4.0;
    const hairStrandWidth: number = 0.2;
    const hairStrandData = createHairStrandData(
        modelHairRootGeometryData, numHairPoints, numHairStrands
    );
    const hairStrandNumIndices = hairStrandData?.indexData.length!;
    const hairStrandIndexBuffer = WGPU.createGPUBufferUint(device, hairStrandData?.indexData);

    // Collision spheres
    // xyz: position, w: radius
    let collisionSpheres = [] as any;
    collisionSpheres.push([0, 0, 0, 1]);                // Main
    collisionSpheres.push([1.15, 0.15, -0.3, 0.4]);     // Ear
    collisionSpheres.push([-1.15, 0.15, -0.3, 0.4]);    // Ear
    collisionSpheres.push([0, 0, 0.5, 0.9]);            // Face

    // Sphere buffers
    let allSpheresNumIndices = [] as number[];
    let allSpheresVertexBuffers = [] as GPUBuffer[];
    let allSpheresIndexBuffers = [] as GPUBuffer[];
    for(let i = 0; i < collisionSpheres.length; i++)
    {
        const sphereModelData = createSphereData(collisionSpheres[i][3], 10, 10, [collisionSpheres[i][0], collisionSpheres[i][1], collisionSpheres[i][2]]);
        const sphereModelNumIndices = sphereModelData?.indexData.length!;
        const sphereModelVertexBuffer = WGPU.createGPUBuffer(device, sphereModelData?.vertexData!);
        const sphereModelIndexBuffer = WGPU.createGPUBufferUint(device, sphereModelData?.indexData!);

        // Add to arrays
        allSpheresNumIndices.push(sphereModelNumIndices);
        allSpheresVertexBuffers.push(sphereModelVertexBuffer);
        allSpheresIndexBuffers.push(sphereModelIndexBuffer);
    }

    // Render pipelines and compute pipeline
    const defaultShaders = Shaders.getModelShaders();
    const redShaders = Shaders.getRedShaders();
    const modelPipeline = WGPU.createModelRenderPipeline(device, gpu.format, defaultShaders.vertexShader, defaultShaders.fragmentShader);
    const collisionModelPipeline = WGPU.createModelRenderPipeline(device, gpu.format, redShaders.vertexShader, redShaders.fragmentShader);
    const hairPipeline = WGPU.createHairRenderPipeline(device, gpu.format);
    const computeUpdateHairPipeline = WGPU.createComputeUpdateHairPipeline(device);
    const computeApplyHairPipeline = WGPU.createComputeApplyHairPipeline(device);

    // Hair
    const numAllHairPoints = numHairPoints * numHairStrands;
    const initialHairPointRootPosData = hairStrandData.rootPositions;
    const initialHairPointData = hairStrandData.hairPointPositions;
    const initialHairPointAccelData = new Float32Array(numAllHairPoints * 4);
    const initialHairPointVertexData = new Float32Array(numAllHairPoints * 4 * 2);
    const localCollisionSpheres = new Float32Array(collisionSpheres.flat());

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

    // Collision spheres data buffer
    const collisionSpheresBuffer = WGPU.createGPUBuffer(
        device,
        localCollisionSpheres,
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
        maxHairPointDist: hairStrandLength / numHairPoints,
        numberOfHairPoints: numHairPoints,
    };
    const ApplyHairParams = 
    {
        halfHairWidth: hairStrandWidth*0.5
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

    // For update hair shader
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

    // For apply hair
    const applyHairUniformBufferSize: number = Object.keys(ApplyHairParams).length * 4;
    const applyHairUniformBuffer = device.createBuffer(
    {
        size: applyHairUniformBufferSize,
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
    });

    // Write to uniforms
    device.queue.writeBuffer(vertexUniformBuffer, 0, vp.viewProjectionMatrix as ArrayBuffer);
    device.queue.writeBuffer(fragmentUniformBuffer, 0, lightPosition);
    device.queue.writeBuffer(fragmentUniformBuffer, 16, eyePosition);
    device.queue.writeBuffer(
        computeUniformBuffer, 
        0, 
        new Float32Array(
        [
            HairParams.deltaTime, 
            HairParams.maxHairPointDist,
            HairParams.numberOfHairPoints
        ])
    );
    device.queue.writeBuffer(
        applyHairUniformBuffer,
        0,
        new Float32Array(
        [
            ApplyHairParams.halfHairWidth
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
    const collisionModelBindGroup = WGPU.createBindGroup(
        device, 
        collisionModelPipeline, 
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
        collisionSpheresBuffer,
        computeUniformBuffer,
        computeUniformMatrixBuffer,
        initialHairPointData.byteLength,
        initialHairPointRootPosData.byteLength,
        localCollisionSpheres.byteLength,
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
        applyHairUniformBuffer,
        initialHairPointData.byteLength,
        initialHairPointVertexData.byteLength,
        applyHairUniformBufferSize
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

    function draw(deltaTime: number) 
    {
        // Update rotation
        rotation[1] += deltaTime;

        // Update model matrix and normal matrix
        let translation: vec3 = vec3.fromValues(
            0, 
            0, 
            Math.sin(rotation[1]) * 2.0
        );
        WGPU.createTransforms(modelMatrix, translation, rotation);
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

            // Collision spheres
            if(renderCollisionSpheres)
            {
                passEncoder.setPipeline(collisionModelPipeline);
                passEncoder.setBindGroup(0, collisionModelBindGroup);
                for(let i = 0; i < collisionSpheres.length; i++)
                {
                    passEncoder.setVertexBuffer(0, allSpheresVertexBuffers[i]);
                    passEncoder.setIndexBuffer(allSpheresIndexBuffers[i], "uint32");
                    passEncoder.drawIndexed(allSpheresNumIndices[i]);
                }
            }


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
    WGPU.createRenderLoop(draw);
}