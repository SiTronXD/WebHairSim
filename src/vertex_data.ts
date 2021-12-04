import { SpherePosition } from './math-func';
import { vec3 } from 'gl-matrix';

export const createSphereData = (radius:number, u:number, v:number, 
    center:vec3 = [0,0,0]) =>
{
    if(u < 2 || v < 2) return;

    // Create vertices
    let pts = [] as any;
    let pt = [] as any;
    for(let i = 0; i < u; i++)
    {
        let pt1 = [] as any;

        for(let j = 0; j < v; j++)
        {
            pt = SpherePosition(
                radius, 
                i * 180 / (u-1), 
                j * 360 / (v-1), 
                center
            );
            pt1.push(pt.flat()); // Position
            pt1.push(pt.flat()); // Normal (not normalized)
        }

        pts.push(pt1.flat());
    }

    // Create Indices
    let pi = [] as any;
    for(let i = 0; i < u*v - v - 1; i++)
    {
        pi.push(
            [
                i, 
                i + v, 
                i + v + 1
            ]
        );
        pi.push(
            [
                i, 
                i + v + 1, 
                i + 1
            ]
        );
    }

    const vertexData = new Float32Array(pts.flat());
    const indexData = new Uint32Array(pi.flat());

    return {
        vertexData,
        indexData
    };
}

export const createCubeData = () => 
{
    //   <position>   <normal>
    const vertexData = new Float32Array(
    [
        // front     
         1, -1,  1,  0, 0, 1,
        -1, -1,  1,  0, 0, 1,
        -1,  1,  1,  0, 0, 1,
         1,  1,  1,  0, 0, 1,

        // right
         1, -1, -1,  1, 0, 0,
         1, -1,  1,  1, 0, 0,
         1,  1,  1,  1, 0, 0,
         1,  1, -1,  1, 0, 0,

        // back
        -1,  1, -1,  0, 0, -1,
        -1, -1, -1,  0, 0, -1,
         1, -1, -1,  0, 0, -1,
         1,  1, -1,  0, 0, -1,

        // left
        -1,  1,  1,  -1, 0, 0,
        -1, -1,  1,  -1, 0, 0,
        -1, -1, -1,  -1, 0, 0,
        -1,  1, -1,  -1, 0, 0,

        // top
         1,  1,  1,  0, 1, 0,
        -1,  1,  1,  0, 1, 0,
        -1,  1, -1,  0, 1, 0,
         1,  1, -1,  0, 1, 0,

        // bottom
        -1, -1, -1,  0, -1, 0,
        -1, -1,  1,  0, -1, 0,
         1, -1,  1,  0, -1, 0,
         1, -1, -1,  0, -1, 0
    ]);

    const indexData = new Uint32Array(
    [
        // front
        0, 1, 2, 0, 2, 3,

        // right
        4, 5, 6, 4, 6, 7,

        // back
        8, 9, 10, 8, 10, 11,

        // left
        12, 13, 14, 12, 14, 15,

        // top
        16, 17, 18, 16, 18, 19,

        // bottom
        20, 21, 22, 20, 22, 23
    ]);

    return {
        vertexData,
        indexData
    };
};

export const createHairStrandData = (numHairPoints : number) =>
{
    // Create vertices
    let verts = [] as any;
    for(let i = 0; i < numHairPoints; i++)
    {
        // Position 1
        verts.push([1, 0, i]);

        // Normal 1
        verts.push([0, 1, 0]);


        // Position 2
        verts.push([-1, 0, i]);

        // Normal 2
        verts.push([0, 1, 0]);
    }

    // Create indices
    let ind = [] as any;
    for(let i = 0; i < numHairPoints - 1; i++)
    {
        // Create quad
        ind.push([
            i*2 + 0, i*2 + 1, i*2 + 2,
            i*2 + 1, i*2 + 3, i*2 + 2
        ]);
    }


    const vertexData = new Float32Array(verts.flat());
    const indexData = new Uint32Array(ind.flat());

    return {
        vertexData,
        indexData
    };
}