struct Point 
{
    pos: vec4<f32>;
};
struct HairPoints
{
    points: [[stride(16)]] array<Point>;
};
struct ApplyHairParams
{
    hairHairWidth: f32;
    interpolationFactor: f32;
    numHairPointsPerStrand: f32;
    numHairStrands: f32;
};
struct VectorParams
{
    camPosition: vec4<f32>;
};
[[binding(0), group(0)]] var<storage, read> hairPoints : HairPoints;
[[binding(1), group(0)]] var<storage, read> hairPointPrevBuffer : HairPoints;
[[binding(2), group(0)]] var<storage, read_write> hairPointsVertexData : HairPoints;
[[binding(3), group(0)]] var<uniform> params : ApplyHairParams;
[[binding(4), group(0)]] var<uniform> vectorParams : VectorParams;

[[stage(compute), workgroup_size(1)]]
fn main([[builtin(global_invocation_id)]] GlobalInvocationID : vec3<u32>) 
{
    var index : u32 = GlobalInvocationID.x;

    var currPos = hairPoints.points[index].pos;
    var prevPos = hairPointPrevBuffer.points[index].pos;

    // Interpolate position
    let interpolatedPos = prevPos * (1.0 - params.interpolationFactor) + currPos * params.interpolationFactor;

    // Create vector to rotate around
    var localHairPointIndex = index % u32(params.numHairPointsPerStrand);
    var rotVec = vec3<f32>(0.0, 0.0, 0.0);

    // Parent point
    if(localHairPointIndex > 0u)
    {
        rotVec = rotVec + normalize(hairPoints.points[index - 1u].pos - currPos).xyz;
    }
    // Child point
    if(localHairPointIndex < u32(params.numHairPointsPerStrand) - 1u)
    {
        rotVec = rotVec + normalize(currPos - hairPoints.points[index + 1u].pos).xyz;
    }
    rotVec = normalize(rotVec);

    // Create orthogonal vector to offset vertex position
    var toCamVec = (vectorParams.camPosition - interpolatedPos).xyz;
    var rightVec = normalize(cross(rotVec, toCamVec));

    // Apply vertex positions in world space
    hairPointsVertexData.points[index * 2u + 0u].pos = interpolatedPos + vec4<f32>(rightVec, 0.0) * params.hairHairWidth;
    hairPointsVertexData.points[index * 2u + 1u].pos = interpolatedPos - vec4<f32>(rightVec, 0.0) * params.hairHairWidth;

    // hairPointsVertexData.points[index * 2u + 0u].pos = interpolatedPos + vec4<f32>(params.hairHairWidth, 0.0, 0.0, 0.0);
    // hairPointsVertexData.points[index * 2u + 1u].pos = interpolatedPos + vec4<f32>(-params.hairHairWidth, 0.0, 0.0, 0.0);
}
