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

    var rootPos = hairPointsTempWrite.points[index * u32(params.numberOfHairPoints) + 0u].pos.xyz;
    for(var i : u32 = 1u; i < u32(params.numberOfHairPoints); i = i + 1u)
    {
        // Load positions
        var currPos = hairPointsTempWrite.points[index * u32(params.numberOfHairPoints) + i].pos.xyz;
        var currParentPos = hairPointsTempWrite.points[index * u32(params.numberOfHairPoints) + i - 1u].pos.xyz;

        // Constrain
        var deltaPos = currPos - currParentPos;
        var deltaPosLength = length(deltaPos);
        var distDifference = params.maxHairPointDist - deltaPosLength;
        var diffPercent = distDifference / deltaPosLength * 0.95;
        var offsetPos = deltaPos * diffPercent;

        var nextParentPos = currParentPos - offsetPos;
        var nextPos = currPos + offsetPos;

        // Write new position to temp buffer
        hairPointsTempWrite.points[index * u32(params.numberOfHairPoints) + i].pos = vec4<f32>(nextPos, 1.0);
        hairPointsTempWrite.points[index * u32(params.numberOfHairPoints) + i - 1u].pos = vec4<f32>(nextParentPos, 1.0);
    }

    hairPointsTempWrite.points[index * u32(params.numberOfHairPoints) + 0u].pos = vec4<f32>(rootPos, 1.0);

    /*for(var i : u32 = 1u; i < u32(params.numberOfHairPoints); i = i + 1u)
    {
        // Load positions
        var currPos = hairPointsTempWrite.points[index * u32(params.numberOfHairPoints) + i].pos.xyz;
        var parentPointPos = hairPointsTempWrite.points[index * u32(params.numberOfHairPoints) + i - 1u].pos.xyz;

        var nextPos = currPos;

        // Constraint
        var deltaPos = currPos - parentPointPos;
        deltaPos = normalize(deltaPos);
        nextPos = parentPointPos + deltaPos * params.maxHairPointDist;

        // Write new position to temp buffer
        hairPointsTempWrite.points[index * u32(params.numberOfHairPoints) + i].pos = vec4<f32>(nextPos, 1.0);
    }*/
}