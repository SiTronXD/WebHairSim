struct Uniforms
{
    viewProjectionMatrix : mat4x4<f32>;
    modelMatrix : mat4x4<f32>;
    normalMatrix : mat4x4<f32>;
};

[[binding(0), group(0)]] var<uniform> uniforms : Uniforms;

struct Output
{
    [[builtin(position)]] Position : vec4<f32>;
    [[location(0)]] vUV : vec2<f32>;
};

[[stage(vertex)]]
fn main(
    [[location(0)]] pointPosition : vec4<f32>,
    [[location(1)]] uvCoords : vec2<f32>) -> Output
{
    var output : Output;
    let worldPosition : vec4<f32> = vec4<f32>(pointPosition.xyz, 1.0);

    output.vUV = uvCoords;
    output.Position = uniforms.viewProjectionMatrix * worldPosition;

    return output;
}