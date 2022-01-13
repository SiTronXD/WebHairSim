import { vec3 } from "gl-matrix";

export const createInitialHairPoints = (
    hairRootGeometryData: any,
    numHairPoints: number, 
    numHairStrands: number,
    maxHairPointDist: number) =>
{
    const numAllHairPoints = numHairPoints * numHairStrands;
    const rootPositions = new Float32Array(numHairStrands * 4);
    const hairPointPositions = new Float32Array(numAllHairPoints * 4);

    const rootGeomVertices = hairRootGeometryData.vertexData;
    const rootGeomIndices = hairRootGeometryData.indexData;
    const vertStride = 3 * 2;

    let createdRootPositions = [] as any;
    let hairStrandNormal = [] as any;

    // Initial growth positions
    for(let i = 0; i < numHairStrands; i++)
    {
        // Random first triangle vertex index
        const randomIndex = 
            Math.floor(Math.random() * rootGeomIndices.length / 3);
        const triIndex0 = rootGeomIndices[randomIndex * 3 + 0];
        const triIndex1 = rootGeomIndices[randomIndex * 3 + 1];
        const triIndex2 = rootGeomIndices[randomIndex * 3 + 2];

        // 3 triangle vertices
        const vertPos0 = vec3.fromValues(
            rootGeomVertices[triIndex0 * vertStride + 0],
            rootGeomVertices[triIndex0 * vertStride + 1],
            rootGeomVertices[triIndex0 * vertStride + 2]
        );
        const vertPos1 = vec3.fromValues(
            rootGeomVertices[triIndex1 * vertStride + 0],
            rootGeomVertices[triIndex1 * vertStride + 1],
            rootGeomVertices[triIndex1 * vertStride + 2]
        );
        const vertPos2 = vec3.fromValues(
            rootGeomVertices[triIndex2 * vertStride + 0],
            rootGeomVertices[triIndex2 * vertStride + 1],
            rootGeomVertices[triIndex2 * vertStride + 2]
        );

        // Random barycentric coordinates
        let baryU = Math.random();
        let baryV = Math.random();
        if(baryU + baryV > 1.0)
        {
            baryU = 1.0 - baryU;
            baryV = 1.0 - baryV;
        }

        let randPos = vertPos0;
        let side0 = vec3.fromValues(0,0,0);
        let side1 = vec3.fromValues(0,0,0);
        vec3.subtract(side0, vertPos1, vertPos0);
        vec3.subtract(side1, vertPos2, vertPos0);
        vec3.scaleAndAdd(randPos, randPos, side0, baryU);
        vec3.scaleAndAdd(randPos, randPos, side1, baryV);

        // Normal
        let normal = vec3.fromValues(0,0,0);
        vec3.cross(normal, side0, side1);
        vec3.normalize(normal, normal);

        // Offset position along the normal
        vec3.scaleAndAdd(randPos, randPos, normal, 0.1);


        // Apply position
        rootPositions[i * 4 + 0] = randPos[0];
        rootPositions[i * 4 + 1] = randPos[1];
        rootPositions[i * 4 + 2] = randPos[2];
        rootPositions[i * 4 + 3] = 0.0;

        // Save root position and normal
        createdRootPositions.push(randPos);
        hairStrandNormal.push(normal);
    }

    // Initial hair point positions
    for(let j = 0; j < numHairStrands; j++)
    {
        for(let i = 0; i < numHairPoints; i++)
        {
            hairPointPositions[(j * numHairPoints + i) * 4 + 0] = 
                createdRootPositions[j][0] + i * hairStrandNormal[j][0] * maxHairPointDist;
            hairPointPositions[(j * numHairPoints + i) * 4 + 1] = 
                createdRootPositions[j][1] + i * hairStrandNormal[j][1] * maxHairPointDist;
            hairPointPositions[(j * numHairPoints + i) * 4 + 2] = 
                createdRootPositions[j][2] + i * hairStrandNormal[j][2] * maxHairPointDist;
            hairPointPositions[(j * numHairPoints + i) * 4 + 3] = 0.0;
        }
    }

    return {
        rootPositions,
        hairPointPositions
    };
}