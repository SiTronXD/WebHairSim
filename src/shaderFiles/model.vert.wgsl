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