
import modelVertexShader from './shaderFiles/vertexShaders/model.vert.wgsl';
import modelFragmentShader from './shaderFiles/fragmentShaders/model.frag.wgsl';
import redFragmentShader from './shaderFiles/fragmentShaders/red.frag.wgsl';

import hairVertexShader from './shaderFiles/vertexShaders/hair.vert.wgsl';
import hairFragmentShader from './shaderFiles/fragmentShaders/hair.frag.wgsl';

import updateHairShader from './shaderFiles/computeShaders/updateHair.comp.wgsl';
import constrainHairShader from './shaderFiles/computeShaders/constrainHair.comp.wgsl';
import applyHairShader from './shaderFiles/computeShaders/applyHair.comp.wgsl';
import interpolateHairShader from './shaderFiles/computeShaders/interpolateHair.comp.wgsl';

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

export const getConstrainHairComputeShader = () =>
{
    return constrainHairShader;
}

export const getApplyHairComputeShader = () =>
{
    return applyHairShader;
}

export const getInterpolateHairComputeShader = () =>
{
    return interpolateHairShader;
}