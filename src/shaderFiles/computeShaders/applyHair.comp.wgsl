struct Point 
{
    pos : vec4<f32>;
};
struct HairPoints
{
    points : [[stride(16)]] array<Point>;
};
[[binding(0), group(0)]] var<storage, read_write> hairPoints : HairPoints;
[[binding(1), group(0)]] var<storage, read> hairPointsTempWrite : HairPoints;
[[binding(2), group(0)]] var<storage, read_write> hairPointPrevBuffer : HairPoints;

[[stage(compute), workgroup_size(4)]]
fn main([[builtin(global_invocation_id)]] GlobalInvocationID : vec3<u32>) 
{
    var index : u32 = GlobalInvocationID.x;

    var currPos = hairPointsTempWrite.points[index].pos;
    var prevPos = hairPoints.points[index].pos;

    // Write to actual buffer from temp buffer to avoid race conditions
    hairPointPrevBuffer.points[index].pos = prevPos;
    hairPoints.points[index].pos = currPos;
}
