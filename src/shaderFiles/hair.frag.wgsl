[[block]] struct Uniforms
{
    lightPosition : vec4<f32>;
    eyePosition : vec4<f32>;
};
[[binding(1), group(0)]] var<uniform> uniforms : Uniforms;

[[stage(fragment)]]
fn main(
    [[location(0)]] vWorldPosition : vec4<f32>, 
    [[location(1)]] vNormal : vec4<f32>) -> [[location(0)]] vec4<f32> 
{
    let color : vec3<f32> = vec3<f32>(0.0, 0.0, 1.0);
    let ambientIntensity : f32 = 0.2;
    let diffuseIntensity : f32 = 0.8;

    let N : vec3<f32> = normalize(vNormal.xyz);
    let L : vec3<f32> = normalize(uniforms.lightPosition.xyz - vWorldPosition.xyz);

    let diffuse : f32 = diffuseIntensity * max(dot(N, L), 0.0);

    let finalColor : vec3<f32> = color * (ambientIntensity + diffuse);

    return vec4<f32>(finalColor, 1.0);
}