struct Point 
{
    pos : vec4<f32>;
};
[[block]] struct HairPoints
{
    points : [[stride(16)]] array<Point>;
};
[[block]] struct HairParams
{
    deltaTime: f32;
};
[[binding(0), group(0)]] var<storage, read> hairPoints : HairPoints;
[[binding(1), group(0)]] var<storage, read_write> hairPointsTempWrite : HairPoints;
[[binding(2), group(0)]] var<uniform> params : HairParams;

[[stage(compute), workgroup_size(1)]]
fn main([[builtin(global_invocation_id)]] GlobalInvocationID : vec3<u32>) 
{
    var index : u32 = GlobalInvocationID.x;

    // Don't move the first point
    if(index != 0u)
    {
        var readPos = hairPoints.points[index].pos;

        // Write to temp buffer to avoid race conditions
        hairPointsTempWrite.points[index].pos = 
            readPos + vec4<f32>(0.0, params.deltaTime, 0.0, 0.0);
    }
}
