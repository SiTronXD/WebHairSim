export interface LightInputs 
{
    color?: string;
    ambientIntensity?: string;
    diffuseIntensity?: string;
    specularIntensity?: string;
    shininess?: string;
    specularColor?: string;
    isPhong?: string;
}

export const Shaders = (li: LightInputs) => 
{
    // Define default input values:
    li.color = li.color == undefined ? '(1.0, 0.0, 0.0)' : li.color;
    li.ambientIntensity = li.ambientIntensity == undefined ? '0.2' : li.ambientIntensity;
    li.diffuseIntensity = li.diffuseIntensity == undefined ? '0.8' : li.diffuseIntensity;
    li.specularIntensity = li.specularIntensity == undefined ? '0.4' : li.specularIntensity;
    li.shininess = li.shininess == undefined ? '30.0' : li.shininess;
    li.specularColor = li.specularColor == undefined ? '(1.0, 1.0, 1.0)' : li.specularColor;
    li.isPhong = li.isPhong == undefined ? '0' : li.isPhong;

    console.log(JSON.stringify(li, null, 4));

    const vertex = `
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
            output.vNormal = uniforms.normalMatrix * normal;
            output.Position = uniforms.viewProjectionMatrix * mPosition;

            return output;
        }
    `;

    const fragment = `
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
            let V : vec3<f32> = normalize(uniforms.eyePosition.xyz - vPosition.xyz);
            let H : vec3<f32> = normalize(L + V);

            let diffuse : f32 = ${li.diffuseIntensity} * max(dot(N, L), 0.0);
            var specular : f32;
            var isp : i32 = ${li.isPhong};
            if(isp == 1)
            {
                specular = ${li.specularIntensity} * pow(max(dot(V, reflect(-L, N)), 0.0), ${li.shininess});
            }
            else
            {
                specular = ${li.specularIntensity} * pow(max(dot(N, H), 0.0), ${li.shininess});
            }

            let ambient : f32 = ${li.ambientIntensity};
            let finalColor : vec3<f32> = vec3<f32>${li.color} * (ambient + diffuse) + vec3<f32>${li.specularColor} * specular;

            return vec4<f32>(finalColor, 1.0);
        }
    `;

    return { vertex, fragment };
}