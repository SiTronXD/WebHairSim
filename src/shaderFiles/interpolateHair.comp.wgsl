struct Point 
{
    pos : vec4<f32>;
};
struct HairPoints
{
    points : [[stride(16)]] array<Point>;
};
struct ApplyHairParams
{
    hairHairWidth: f32;
    interpolationFactor: f32;
};
[[binding(0), group(0)]] var<storage, read> hairPoints : HairPoints;
[[binding(1), group(0)]] var<storage, read> hairPointPrevBuffer : HairPoints;
[[binding(2), group(0)]] var<storage, read_write> hairPointsVertexData : HairPoints;
[[binding(3), group(0)]] var<uniform> params : ApplyHairParams;

[[stage(compute), workgroup_size(1)]]
fn main([[builtin(global_invocation_id)]] GlobalInvocationID : vec3<u32>) 
{
    var index : u32 = GlobalInvocationID.x;

    var currPos = hairPoints.points[index].pos;
    var prevPos = hairPointPrevBuffer.points[index].pos;

    // Write vertex data
    let interpolatedPos = prevPos * (1.0 - params.interpolationFactor) + currPos * params.interpolationFactor;
    hairPointsVertexData.points[index * 2u + 0u].pos = interpolatedPos + vec4<f32>(params.hairHairWidth, 0.0, 0.0, 0.0);
    hairPointsVertexData.points[index * 2u + 1u].pos = interpolatedPos + vec4<f32>(-params.hairHairWidth, 0.0, 0.0, 0.0);
}
