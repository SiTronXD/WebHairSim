struct Point 
{
    pos : vec4<f32>;
};
[[block]] struct HairPoints
{
    points : [[stride(16)]] array<Point>;
};
[[binding(0), group(0)]] var<storage, read_write> hairPoints : HairPoints;

[[stage(compute), workgroup_size(1)]]
fn main([[builtin(global_invocation_id)]] GlobalInvocationID : vec3<u32>) {
    var index : u32 = GlobalInvocationID.x;

    // Write to buffer
    hairPoints.points[index].pos = vec4<f32>(0.0, -1.0, 0.0, 0.0);
}
