struct Point 
{
    pos : vec4<f32>;
};
[[block]] struct HairPoints
{
    points : [[stride(16)]] array<Point>;
};
[[binding(0), group(0)]] var<storage, read> hairPoints : HairPoints;
[[binding(1), group(0)]] var<storage, read_write> hairPointsTempWrite : HairPoints;

[[stage(compute), workgroup_size(1)]]
fn main([[builtin(global_invocation_id)]] GlobalInvocationID : vec3<u32>) 
{
    var index : u32 = GlobalInvocationID.x;

    // Write to temp buffer to avoid race conditions
    var readPos = hairPoints.points[index].pos;
    hairPointsTempWrite.points[index].pos = vec4<f32>(0.0, readPos.y - 0.01, 0.0, 0.0);
}
