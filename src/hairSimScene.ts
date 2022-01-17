import * as WGPU from './gpuHelper';
import * as Shaders from './shaders';
import { vec3, mat4, vec4 } from 'gl-matrix';
import { createSphereData, createHairStrandData } from './vertexData';
import { loadOBJ } from './objLoader';

let settings: any;
export const updateSettings = async(newSettings: any) =>
{
    settings = newSettings;
}

// "integrate" hair simulation
const updateHairSim = async (
    passEncoder: GPUComputePassEncoder, 
    computeUpdateHairPipeline: GPUComputePipeline, 
    computeUpdateHairBindGroup: GPUBindGroup, 
    
    computeConstrainHairPipeline: GPUComputePipeline,
    computeConstrainHairBindGroup: GPUBindGroup,

    computeApplyHairPipeline: GPUComputePipeline, 
    computeApplyHairBindGroup: GPUBindGroup, 
    
    numAllHairPoints: number,
    numHairStrands: number) =>
{
    // Hair physics
    passEncoder.setPipeline(computeUpdateHairPipeline);
    passEncoder.setBindGroup(0, computeUpdateHairBindGroup);
    passEncoder.dispatch(numAllHairPoints / 4);

    // Constrain positions to account for hair length
    passEncoder.setPipeline(computeConstrainHairPipeline);
    passEncoder.setBindGroup(0, computeConstrainHairBindGroup);
    for(let i = 0; i < 10; i++)
    {
        passEncoder.dispatch(numHairStrands / 4);
    }

    // Apply changes to buffers + geometry
    passEncoder.setPipeline(computeApplyHairPipeline);
    passEncoder.setBindGroup(0, computeApplyHairBindGroup);
    passEncoder.dispatch(numAllHairPoints / 4);
}

export const hairSim = async () =>
{
    const gpu = await WGPU.initGPU();

    // Check if WebGPU is not supported
    if(!gpu.webGPUSupported)
    {
        document.getElementById("MainText")!.innerHTML = `Your current browser does not support WebGPU! 
            Make sure you are on a system with WebGPU enabled. Currently,
            SPIR-WebGPU is only supported in <a href="https://www.google.com/chrome/canary">Chrome canary</a>
            with the flag "enable-unsafe-webgpu" enabled. See the
            <a href="https://github.com/gpuweb/gpuweb/wiki/Implementation-Status">
            Implementation Status</a> page for more details.`;
    }

    // WebGPU is supported
    const device = gpu.device!;
    const canvas = gpu.canvas!;
    const format = gpu.format!; 
    const context = gpu.context!;
    const framebufferSize = gpu.framebufferSize!;
    
    // Model data buffers
    const modelData = await loadOBJ('res/gfx/suzanne.obj');
    const modelHairRootGeometryData = await loadOBJ('res/gfx/suzanneHairRoot.obj');
    const modelNumIndices = modelData?.indexData.length!;
    const modelVertexBuffer = WGPU.createGPUBuffer(device, modelData?.vertexData!);
    const modelIndexBuffer = WGPU.createGPUBufferUint(device, modelData?.indexData!);
 
    const hairSimDeltaTime: number = 0.05;
    const baseAcceleration: number = 5.0;

    // Hair strand data buffers
    const numHairPointsPerStrand: number = 32;
    const numHairStrands: number = 4096;
    const hairStrandLength: number = 4.0;
    const hairStrandWidth: number = 0.05;
    const maxHairPointDist: number = hairStrandLength / numHairPointsPerStrand;
    const hairStrandData = createHairStrandData(
        modelHairRootGeometryData, numHairPointsPerStrand, numHairStrands, maxHairPointDist
    );
    const hairStrandNumIndices = hairStrandData?.indexData.length!;
    const hairStrandIndexBuffer = WGPU.createGPUBufferUint(device, hairStrandData?.indexData);

    // Collision spheres
    // xyz: position, w: radius
    let collisionSpheres = [] as any;
    collisionSpheres.push([0, 0, 0, 1]);                // Main head
    collisionSpheres.push([1.16, 0.15, -0.4, 0.4]);     // Ear
    collisionSpheres.push([-1.16, 0.15, -0.4, 0.4]);    // Ear
    collisionSpheres.push([0, 0, 0.9, 1.0]);            // Face

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
    const modelPipeline = WGPU.createModelRenderPipeline(device, format, defaultShaders.vertexShader, defaultShaders.fragmentShader);
    const collisionModelPipeline = WGPU.createModelRenderPipeline(device, format, redShaders.vertexShader, redShaders.fragmentShader);
    const hairPipeline = WGPU.createHairRenderPipeline(device, format);
    const computeUpdateHairPipeline = WGPU.createComputeUpdateHairPipeline(device);
    const computeConstrainHairPipeline = WGPU.createComputeConstrainHairPipeline(device);
    const computeApplyHairPipeline = WGPU.createComputeApplyHairPipeline(device);
    const computeInterpolateHairPipeline = WGPU.createComputeInterpolateHairPipeline(device);

    // Hair
    const numAllHairPoints = numHairPointsPerStrand * numHairStrands;
    const initialHairPointRootPosData = hairStrandData.rootPositions;
    const initialHairPointData = hairStrandData.hairPointPositions;
    const initialHairPointVertexData = new Float32Array(numAllHairPoints * 4 * 2);
    const localCollisionSpheres = new Float32Array(collisionSpheres.flat());

    // Just init the point vertex positions to 0, since
    // these will be updated dynamically
    for(let i = 0; i < numAllHairPoints * 4 * 2; i++)
    {
        initialHairPointVertexData[i] = 0.0;
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

    // Hair point to vertex data buffer
    const hairPointVertexDataBuffer = WGPU.createGPUBuffer(
        device, 
        initialHairPointVertexData, 
        GPUBufferUsage.VERTEX | GPUBufferUsage.STORAGE
    );
    const hairPointUVDataBuffer = WGPU.createGPUBuffer(
        device,
        hairStrandData.uvData,
        GPUBufferUsage.VERTEX | GPUBufferUsage.STORAGE
    );

    // Collision spheres data buffer
    const collisionSpheresBuffer = WGPU.createGPUBuffer(
        device,
        localCollisionSpheres,
        GPUBufferUsage.VERTEX | GPUBufferUsage.STORAGE
    );

    // Create uniform data
    const vpCamPos: vec3 = [2, 2, 4];
    const vp = WGPU.createViewProjection(canvas.width / canvas.height, vpCamPos);
    const normalMatrix = mat4.create();
    const modelMatrix = mat4.create();

    // Hair uniform data
    const HairParams = 
    {
        deltaTime: hairSimDeltaTime,
        maxHairPointDist: maxHairPointDist,
        numberOfHairPoints: numHairPointsPerStrand,
        accelerationSpeed: baseAcceleration * settings.gravityStrength
    };
    const InterpolateHairParams = 
    {
        halfHairWidth: hairStrandWidth*0.5,
        noInterpolation: -1.0,
        numHairPointsPerStrand: numHairPointsPerStrand,
        numHairStrands: numHairStrands
    };

    // Add rotation and camera
    let rotation = vec3.fromValues(0, 0, 0);       
    let camPosition = new Float32Array(vp.cameraPosition);
    let lightPosition = camPosition;

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

    // For interpolate hair shader
    const interpolateHairUniformBufferSize: number = Object.keys(InterpolateHairParams).length * 4;
    const interpolateHairUniformBuffer = device.createBuffer(
    {
        size: interpolateHairUniformBufferSize,
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
    });
    const interpolateHairVectorUniformBufferSize: number = 1 * 4 * 4;
    const interpolateHairVectorUniformBuffer = device.createBuffer(
    {
        size: interpolateHairVectorUniformBufferSize,
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
    });

    // Write to uniforms
    device.queue.writeBuffer(vertexUniformBuffer, 0, vp.viewProjectionMatrix as ArrayBuffer);
    device.queue.writeBuffer(fragmentUniformBuffer, 0, lightPosition);
    device.queue.writeBuffer(fragmentUniformBuffer, 16, camPosition);
    
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
    const hairBindGroup = await WGPU.createHairBindGroup(
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
        computeUniformBuffer,
        computeUniformMatrixBuffer,
        initialHairPointData.byteLength,
        initialHairPointRootPosData.byteLength,
        computeUniformBufferSize,
        computeUniformMatrixBufferSize
    );
    const computeConstrainHairBindGroup = WGPU.createComputeConstrainHairBindGroup(
        device,
        computeConstrainHairPipeline,
        hairPointTempWriteBuffer,
        collisionSpheresBuffer,
        computeUniformBuffer,
        computeUniformMatrixBuffer,
        initialHairPointData.byteLength,
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
        initialHairPointData.byteLength,
    );
    const computeInterpolateHairBindGroup = WGPU.createComputeInterpolateHairBindGroup(
        device,
        computeInterpolateHairPipeline,
        hairPointBuffer,
        hairPointPrevBuffer,
        hairPointVertexDataBuffer,
        interpolateHairUniformBuffer,
        interpolateHairVectorUniformBuffer,
        initialHairPointData.byteLength,
        initialHairPointVertexData.byteLength,
        interpolateHairUniformBufferSize,
        interpolateHairVectorUniformBufferSize
    );

    // Color and depth textures
    let textureView = context.getCurrentTexture().createView();
    const depthTexture = device.createTexture({
        size: [framebufferSize[0], framebufferSize[1], 1],
        format: "depth24plus",
        usage: GPUTextureUsage.RENDER_ATTACHMENT
    });

    // Color and depth/stencil attachments
    const renderPassDescription = WGPU.createRenderPassDesc(
        textureView, 
        depthTexture.createView()
    );

    let timeAccumulator: number = 0.0;

    function draw(deltaTime: number) 
    {
        // Update rotation
        rotation[1] += deltaTime;

        // Update model matrix and normal matrix
        let translation: vec3 = vec3.fromValues(
            0, 
            Math.abs(2.0 * Math.sin(rotation[1])), 
            Math.sin(rotation[1]) * 2.0
        );
        WGPU.createTransforms(modelMatrix, translation, rotation);
        mat4.invert(normalMatrix, modelMatrix);
        mat4.transpose(normalMatrix, normalMatrix);
        device.queue.writeBuffer(vertexUniformBuffer, 64, modelMatrix as ArrayBuffer);
        device.queue.writeBuffer(vertexUniformBuffer, 128, normalMatrix as ArrayBuffer);

        // Update uniforms for compute buffers
        HairParams.accelerationSpeed = baseAcceleration * settings.gravityStrength;
        device.queue.writeBuffer(computeUniformMatrixBuffer, 0, modelMatrix as ArrayBuffer);
        device.queue.writeBuffer(
            computeUniformBuffer, 
            0, 
            new Float32Array(
            [
                HairParams.deltaTime, 
                HairParams.maxHairPointDist,
                HairParams.numberOfHairPoints,
                HairParams.accelerationSpeed
            ])
        );

        // Recreate color attachment
        textureView = context.getCurrentTexture().createView();
        renderPassDescription.colorAttachments[0].view = textureView;

        // Start passes
        const commandEncoder = device.createCommandEncoder();

        // Compute pass
        {
            const passEncoder = commandEncoder.beginComputePass();

            // Handle constant time steps for hair simulation in continuous environment

            // Don't let it accumulate time less than 4 fps
            timeAccumulator += deltaTime;
            timeAccumulator = Math.min(timeAccumulator, 0.25);

            while(timeAccumulator >= hairSimDeltaTime)
            {
                timeAccumulator -= hairSimDeltaTime;

                // "Integrate"
                updateHairSim(
                    passEncoder, 
                    computeUpdateHairPipeline, 
                    computeUpdateHairBindGroup, 
                    computeConstrainHairPipeline,
                    computeConstrainHairBindGroup,
                    computeApplyHairPipeline, 
                    computeApplyHairBindGroup, 
                    numAllHairPoints,
                    numHairStrands
                );
            }

            // Buffers to apply interpolated geometry
            let interpolationFactor: number = 
                settings.simulationStateInterpolation ? (timeAccumulator / hairSimDeltaTime) : 0.0;
            device.queue.writeBuffer(
                interpolateHairUniformBuffer,
                0,
                new Float32Array(
                [
                    InterpolateHairParams.halfHairWidth,
                    interpolationFactor,
                    InterpolateHairParams.numHairPointsPerStrand,
                    InterpolateHairParams.numHairStrands
                ])
            );
            device.queue.writeBuffer(interpolateHairVectorUniformBuffer, 0, camPosition);

            // Apply interpolated geometry
            passEncoder.setPipeline(computeInterpolateHairPipeline);
            passEncoder.setBindGroup(0, computeInterpolateHairBindGroup);
            passEncoder.dispatch(numAllHairPoints / 4);

            // End of compute pass
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
            if(settings.renderCollisionSpheres)
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
            passEncoder.setVertexBuffer(1, hairPointUVDataBuffer);
            passEncoder.setIndexBuffer(hairStrandIndexBuffer, "uint32");
            passEncoder.drawIndexed(hairStrandNumIndices);
            // (Instancing is not used since each hair strand has multiple
            // array entries for vertex positions)


            // End of pass
            passEncoder.endPass();
        }

        // Submit passes
        device.queue.submit([commandEncoder.finish()]);
    }

    // Make draw() loop
    WGPU.createRenderLoop(draw);
}