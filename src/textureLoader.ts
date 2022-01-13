export const getTextureData = async(
    device: GPUDevice, filePath: string,
    addressModeU = 'repeat', addressModeV = 'repeat') =>
{
    // Load image file
    const img = document.createElement('img');
    img.src = filePath;
    await img.decode();
    const imageBitmap = await createImageBitmap(img);

    // Create texture
    const texture = device.createTexture({
        size: [imageBitmap.width, imageBitmap.height, 1],
        format: 'rgba8unorm',
        usage: GPUTextureUsage.TEXTURE_BINDING |
            GPUTextureUsage.COPY_DST |
            GPUTextureUsage.RENDER_ATTACHMENT,
    });

    // Create sampler
    const sampler = device.createSampler({
        minFilter: 'linear',
        magFilter: 'linear',
        addressModeU: addressModeU as GPUAddressMode,
        addressModeV: addressModeV as GPUAddressMode
    });

    // Create texture on GPU
    device.queue.copyExternalImageToTexture(
        { source: imageBitmap },
        { texture: texture },
        [imageBitmap.width, imageBitmap.height]
    );

    return {
        texture,
        sampler
    };
}