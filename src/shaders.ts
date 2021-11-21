

export interface LightInputs 
{
    color?: string;
    ambientIntensity?: string;
    diffuseIntensity?: string;
}

export const Shaders = () => 
{
    let li:LightInputs = {};

    // Define default input values:
    li.color = '(1.0, 0.0, 0.0)';
    li.ambientIntensity = '0.2';
    li.diffuseIntensity = '0.8';

    const vertexShader = `
        [[block]] struct Uniforms
        {
            viewProjectionMatrix : mat4x4<f32>;
            modelMatrix : mat4x4<f32>;
            normalMatrix : mat4x4<f32>;
        };
        [[binding(0), group(0)]] var<uniform> uniforms : Uniforms;

        struct Output
        {
            [[builtin(position)]] Position : vec4<f32>;
            [[location(0)]] vPosition : vec4<f32>;
            [[location(1)]] vNormal : vec4<f32>;
        };

        [[stage(vertex)]]
        fn main([[location(0)]] position : vec4<f32>, [[location(1)]] normal : vec4<f32>) -> Output
        {
            var output : Output;
            let mPosition : vec4<f32> = uniforms.modelMatrix * position;

            output.vPosition = mPosition;
            output.vNormal = uniforms.modelMatrix * normal;
            output.Position = uniforms.viewProjectionMatrix * mPosition;

            return output;
        }
    `;

    const fragmentShader = `
        [[block]] struct Uniforms
        {
            lightPosition : vec4<f32>;
            eyePosition : vec4<f32>;
        };
        [[binding(1), group(0)]] var<uniform> uniforms : Uniforms;

        [[stage(fragment)]]
        fn main([[location(0)]] vPosition : vec4<f32>, [[location(1)]] vNormal : vec4<f32>) -> [[location(0)]] vec4<f32> 
        {
            let N : vec3<f32> = normalize(vNormal.xyz);
            let L : vec3<f32> = normalize(uniforms.lightPosition.xyz - vPosition.xyz);

            let diffuse : f32 = ${li.diffuseIntensity} * max(dot(N, L), 0.0);

            let ambient : f32 = ${li.ambientIntensity};
            let finalColor : vec3<f32> = vec3<f32>${li.color} * (ambient + diffuse);

            return vec4<f32>(finalColor, 1.0);
        }
    `;

    return { 
        vertexShader,
        fragmentShader 
    };
}