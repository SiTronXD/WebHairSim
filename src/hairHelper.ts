import { vec3 } from "gl-matrix";

export const createHairStrand = (startPos: vec3 = [0,0,0], 
    direction: vec3 = [0,0,0]) =>
{
    
}

export const createInitialHairPoints = (
    hairRootGeometryData: any,
    numHairPoints: number, 
    numHairStrands: number) =>
{
    const numAllHairPoints = numHairPoints * numHairStrands;
    const rootPositions = new Float32Array(numHairStrands * 4);
    const hairPointPositions = new Float32Array(numAllHairPoints * 4);

    // Initial growth positions
    for(let i = 0; i < numHairStrands; i++)
    {
        rootPositions[i * 4 + 0] = 0.0;
        rootPositions[i * 4 + 1] = 0.0;
        rootPositions[i * 4 + 2] = -(i - 0.5) * 2.0;
        rootPositions[i * 4 + 3] = 0.0;
    }

    // Initial hair point positions
    for(let i = 0; i < numAllHairPoints; i++)
    {
        hairPointPositions[i * 4 + 0] = 0.0;
        hairPointPositions[i * 4 + 1] = 0.0;
        hairPointPositions[i * 4 + 2] = i < numHairPoints ? 1 + i : -1 - (i - numHairPoints);
        hairPointPositions[i * 4 + 3] = 0.0;
    }

    return {
        rootPositions,
        hairPointPositions
    };
}