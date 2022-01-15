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
struct MatrixParams
{
    modelMatrix : mat4x4<f32>;
};
[[binding(0), group(0)]] var<storage, read> hairPoints : HairPoints;
[[binding(1), group(0)]] var<storage, read_write> hairPointsTempWrite : HairPoints;
[[binding(2), group(0)]] var<storage, read> hairPointPrevBuffer : HairPoints;
[[binding(3), group(0)]] var<storage, read> hairPointRootBuffer : HairPoints;
[[binding(4), group(0)]] var<storage, read> hairPointAccelBuffer : HairPoints;
[[binding(5), group(0)]] var<uniform> params : HairParams;
[[binding(6), group(0)]] var<uniform> matrixParams : MatrixParams;

[[stage(compute), workgroup_size(4)]]
fn main([[builtin(global_invocation_id)]] GlobalInvocationID : vec3<u32>) 
{
    var index : u32 = GlobalInvocationID.x;

    // "Movable" hair points
    if(index % u32(params.numberOfHairPoints) != 0u)
    {
        var readAccel = hairPointAccelBuffer.points[index].pos.xyz;
        var prevPos = hairPointPrevBuffer.points[index].pos.xyz;
        var currPos = hairPoints.points[index].pos.xyz;
        var parentPointPos = hairPoints.points[index - 1u].pos.xyz;

        // Verlet integration (x' = x + (x - x*))
        var drag = 0.982;
        var nextPos = currPos + (currPos - prevPos) * drag + readAccel * params.deltaTime * params.deltaTime;

        // Write new position to temp buffer
        hairPointsTempWrite.points[index].pos = vec4<f32>(nextPos, 1.0);
            
    }
    // Root point, which should only follow the head in world space
    else
    {
        var rootPos = hairPointRootBuffer.points[index / u32(params.numberOfHairPoints)].pos;
        var rootWorldPos = matrixParams.modelMatrix * vec4<f32>(rootPos.xyz, 1.0);

        // Write new position to temp buffer
        hairPointsTempWrite.points[index].pos = rootWorldPos;
    }
}
