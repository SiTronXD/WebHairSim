
[[binding(1), group(0)]] var textureSampler : sampler;
[[binding(2), group(0)]] var textureData : texture_2d<f32>;

[[stage(fragment)]]
fn main([[location(0)]] vUV : vec2<f32>) -> [[location(0)]] vec4<f32> 
{
    let textureColor = textureSample(textureData, textureSampler, vUV).rgb;

    return vec4<f32>(textureColor, 1.0);
}