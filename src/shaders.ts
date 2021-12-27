
import modelVertexShader from './shaderFiles/model.vert.wgsl';
import modelFragmentShader from './shaderFiles/model.frag.wgsl';
import redFragmentShader from './shaderFiles/red.frag.wgsl';

import hairVertexShader from './shaderFiles/hair.vert.wgsl';
import hairFragmentShader from './shaderFiles/hair.frag.wgsl';

import updateHairShader from './shaderFiles/updateHair.comp.wgsl';
import applyHairShader from './shaderFiles/applyHair.comp.wgsl';
import interpolateHairShader from './shaderFiles/interpolateHair.comp.wgsl';

export const getModelShaders = () => 
{
    const vertexShader = modelVertexShader;
    const fragmentShader = modelFragmentShader;

    return { 
        vertexShader,
        fragmentShader 
    };
}

export const getRedShaders = () => 
{
    const vertexShader = modelVertexShader;
    const fragmentShader = redFragmentShader;

    return { 
        vertexShader,
        fragmentShader 
    };
}

export const getHairShaders = () =>
{
    const vertexShader = hairVertexShader;
    const fragmentShader = hairFragmentShader;

    return { 
        vertexShader,
        fragmentShader 
    };
}

export const getUpdateHairComputeShader = () =>
{
    return updateHairShader;
}

export const getApplyHairComputeShader = () =>
{
    return applyHairShader;
}

export const getInterpolateHairComputeShader = () =>
{
    return interpolateHairShader;
}