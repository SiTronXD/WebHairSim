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
    [[location(0)]] vWorldPosition : vec4<f32>;
    [[location(1)]] vNormal : vec4<f32>;
};

[[stage(vertex)]]
fn main(
    [[location(0)]] pointPosition : vec4<f32>) -> Output
{
    var output : Output;
    let worldPosition : vec4<f32> = vec4<f32>(pointPosition.xyz, 1.0);

    output.vWorldPosition = worldPosition;
    output.vNormal = uniforms.modelMatrix * vec4<f32>(0.0, 1.0, 0.0, 0.0);
    output.Position = uniforms.viewProjectionMatrix * worldPosition;

    return output;
}