struct Point 
{
    pos : vec4<f32>;
};
struct HairPoints
{
    points : [[stride(16)]] array<Point>;
};
struct HairParams
{
    deltaTime: f32;
    maxHairPointDist: f32;
    numberOfHairPoints: f32;
};
[[binding(0), group(0)]] var<storage, read_write> hairPointsTempWrite : HairPoints;
[[binding(1), group(0)]] var<uniform> params : HairParams;

[[stage(compute), workgroup_size(1)]]
fn main([[builtin(global_invocation_id)]] GlobalInvocationID : vec3<u32>) 
{
    var index : u32 = GlobalInvocationID.x;

    // "Movable" hair points
    if(index % u32(params.numberOfHairPoints) != 0u)
    {
        // Load positions
        var currPos = hairPointsTempWrite.points[index].pos.xyz;
        var parentPointPos = hairPointsTempWrite.points[index - 1u].pos.xyz;

        var nextPos = currPos;

        // Constraint
        var deltaPos = currPos - parentPointPos;
        deltaPos = normalize(deltaPos);
        nextPos = parentPointPos + deltaPos * params.maxHairPointDist;

        // Write new position to temp buffer
        hairPointsTempWrite.points[index].pos = vec4<f32>(nextPos, 1.0);
    }
}