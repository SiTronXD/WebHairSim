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

[[stage(compute), workgroup_size(1)]]
fn main([[builtin(global_invocation_id)]] GlobalInvocationID : vec3<u32>) 
{
    var index : u32 = GlobalInvocationID.x;

    // Write to actual buffer from temp buffer, to avoid race conditions
    hairPoints.points[index].pos = hairPointsTempWrite.points[index].pos;
}
