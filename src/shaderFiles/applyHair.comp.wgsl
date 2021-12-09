struct Point 
{
    pos : vec4<f32>;
};
[[block]] struct HairPoints
{
    points : [[stride(16)]] array<Point>;
};
[[binding(0), group(0)]] var<storage, read_write> hairPoints : HairPoints;
[[binding(1), group(0)]] var<storage, read> hairPointsTempWrite : HairPoints;
[[binding(2), group(0)]] var<storage, read_write> hairPointPrevBuffer : HairPoints;
[[binding(3), group(0)]] var<storage, read_write> hairPointsVertexData : HairPoints;

[[stage(compute), workgroup_size(1)]]
fn main([[builtin(global_invocation_id)]] GlobalInvocationID : vec3<u32>) 
{
    var index : u32 = GlobalInvocationID.x;

    var currPos = hairPointsTempWrite.points[index].pos;

    // Write to actual buffer from temp buffer, to avoid race conditions
    hairPointPrevBuffer.points[index].pos = hairPoints.points[index].pos;
    hairPoints.points[index].pos = currPos;

    // Write for vertex positions
    hairPointsVertexData.points[index * 2u + 0u].pos = currPos + vec4<f32>(1.0, 0.0, 0.0, 0.0);
    hairPointsVertexData.points[index * 2u + 1u].pos = currPos + vec4<f32>(-1.0, 0.0, 0.0, 0.0);
}
