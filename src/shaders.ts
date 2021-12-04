
import modelVertexShader from './shaderFiles/model.vert.wgsl';
import modelFragmentShader from './shaderFiles/model.frag.wgsl';

import hairVertexShader from './shaderFiles/hair.vert.wgsl';
import hairFragmentShader from './shaderFiles/hair.frag.wgsl';

import updateHairShader from './shaderFiles/updateHair.comp.wgsl';

export const getModelShaders = () => 
{
    const vertexShader = modelVertexShader;
    const fragmentShader = modelFragmentShader;

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

export const getHairComputeShader = () =>
{
    return updateHairShader;
}