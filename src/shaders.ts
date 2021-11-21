
import vertexShader from './shaderFiles/default.vert.wgsl';
import fragmentShader from './shaderFiles/default.frag.wgsl';

export const defaultShaders = () => 
{
    return { 
        vertexShader,
        fragmentShader 
    };
}