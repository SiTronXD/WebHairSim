import { vec3 } from "gl-matrix";

export const createHairStrand = (startPos: vec3 = [0,0,0], 
    direction: vec3 = [0,0,0]) =>
{
    
}

export const createInitialHairPoints = (numHairStrands: number, 
    numAllHairPoints: number) =>
{
    const growthPoints = new Float32Array(numHairStrands * 4);
    const hairPointPositions = new Float32Array(numAllHairPoints * 4);

    return {
        growthPoints,
        hairPointPositions
    };
}