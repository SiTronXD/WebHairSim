import { SpherePosition, CylinderPosition, ConePosition, TorusPosition } from './math-func';
import { vec3 } from 'gl-matrix';

export const TorusWireframeData = (R:number, r:number, N:number, n:number, center:vec3 = [0,0,0]) =>
{
    if(n < 2 || N < 2) return;

    // Create points
    let pts = [];
    let pt:vec3;
    for(let i = 0; i < N; i++)
    {
        let pt1:vec3[] = [];
        for(let j = 0; j < n; j++)
        {
            pt = TorusPosition(R, r, i * 360 / (N-1), j * 360 / (n-1), center);
            pt1.push(pt);
        }
        pts.push(pt1);
    }

    // Connect points
    let pp = [] as any;
    let p0, p1, p2, p3;
    for(let i = 0; i < N-1; i++)
    {
        for(let j = 0; j < n-1; j++)
        {
            p0 = pts[i][j];
            p1 = pts[i+1][j];
            p2 = pts[i+1][j+1];
            p3 = pts[i][j+1];
            pp.push(
                [
                    p0[0], p0[1], p0[2], p1[0], p1[1], p1[2],
                    p3[0], p3[1], p3[2], p0[0], p0[1], p0[2]
                ]
            );
        }
    }

    return new Float32Array(pp.flat());
}

export const ConeWireframeData = (rtop:number, rbottom:number, height:number,
    n:number, center:vec3 = [0,0,0]) =>
{
    if(n < 2) return;

    // Create points
    let pts = [] as any, h = height/2;
    for(let i = 0; i < n; i++)
    {
        pts.push(
            [
                CylinderPosition(rtop, i*360/(n-1), h, center),
                CylinderPosition(rbottom, i*360/(n-1), -h, center),
                CylinderPosition(0, i*360/(n-1), -h, center),
                CylinderPosition(0, i*360/(n-1), h, center),
            ]
        );
    }

    // Connect points
    let p = [] as any;
    let p0, p1, p2, p3, p4, p5;
    for(let i = 0; i < n-1; i++)
    {
        p0 = pts[i][0];
        p1 = pts[i][1];
        p2 = pts[i][2];
        p3 = pts[i][3];
        p4 = pts[i+1][0];
        p5 = pts[i+1][1];

        p.push(
            [
                // Top
                p0[0], p0[1], p0[2], p3[0], p3[1], p3[2],
                p4[0], p4[1], p4[2], p0[0], p0[1], p0[2],
                
                // Bottom
                p1[0], p1[1], p1[2], p2[0], p2[1], p2[2],
                p5[0], p5[1], p5[2], p1[0], p1[1], p1[2],
                
                // Side
                p0[0], p0[1], p0[2], p1[0], p1[1], p1[2]
            ]
        );
    }

    return new Float32Array(p.flat());
}

export const CylinderWireframeData = (rin:number, rout:number, height:number,
    n:number, center:vec3 = [0,0,0]) =>
{
    if(n < 2 || rin >= rout) return;

    // Create points
    let pts = [] as any, h = height/2;
    for(let i = 0; i < n; i++)
    {
        pts.push(
            [
                CylinderPosition(rout, i*360/(n-1), h, center),
                CylinderPosition(rout, i*360/(n-1), -h, center),
                CylinderPosition(rin, i*360/(n-1), -h, center),
                CylinderPosition(rin, i*360/(n-1), h, center),
            ]
        );
    }

    // Connect points
    let p = [] as any;
    let p0, p1, p2, p3, p4, p5, p6, p7;
    for(let i = 0; i < n-1; i++)
    {
        p0 = pts[i][0];
        p1 = pts[i][1];
        p2 = pts[i][2];
        p3 = pts[i][3];
        p4 = pts[i+1][0];
        p5 = pts[i+1][1];
        p6 = pts[i+1][2];
        p7 = pts[i+1][3];

        p.push(
            [
                // Top face
                p0[0], p0[1], p0[2], p3[0], p3[1], p3[2],
                p3[0], p3[1], p3[2], p7[0], p7[1], p7[2],
                p4[0], p4[1], p4[2], p0[0], p0[1], p0[2],
                
                // Bottom face
                p1[0], p1[1], p1[2], p2[0], p2[1], p2[2],
                p2[0], p2[1], p2[2], p6[0], p6[1], p6[2],
                p5[0], p5[1], p5[2], p1[0], p1[1], p1[2],
                
                // Side face
                p0[0], p0[1], p0[2], p1[0], p1[1], p1[2],
                p3[0], p3[1], p3[2], p2[0], p2[1], p2[2]
            ]
        );
    }

    return new Float32Array(p.flat());
}

export const SphereWireframeData = (radius:number, u:number, v:number, 
    center:vec3 = [0,0,0]) =>
{
    if(u < 2 || v < 2) return;

    // Create points
    let pts = [];
    let pt:vec3;
    for(let i = 0; i < u; i++)
    {
        let pt1:vec3[] = [];

        for(let j = 0; j < v; j++)
        {
            pt = SpherePosition(
                radius, 
                i * 180 / (u-1), 
                j * 360 / (v-1), 
                center
            );
            pt1.push(pt);
        }

        pts.push(pt1);
    }

    // Connect points
    let pp = [] as any;
    let p0, p1, p2, p3;
    for(let i = 0; i < u - 1; i++)
    {
        for(let j = 0; j < v - 1; j++)
        {
            p0 = pts[i][j];
            p1 = pts[i+1][j];
            // p2 = pts[i+1][j+1]
            p3 = pts[i][j+1];

            pp.push([
                p0[0], p0[1], p0[2], p1[0], p1[1], p1[2],
                p0[0], p0[1], p0[2], p3[0], p3[1], p3[2]
            ]);
        }
    }

    return new Float32Array(pp.flat());
}

export const CubeData1 = () => {
    const vertexData = new Float32Array([
        // position,   color
        -1, -1,  1,    0, 0, 1,     // vertex a, index 0
         1, -1,  1,    1, 0, 1,     // vertex b, index 1
         1,  1,  1,    1, 1, 1,     // vertex c, index 2
        -1,  1,  1,    0, 1, 1,     // vertex d, index 3
        -1, -1, -1,    0, 0, 0,     // vertex e, index 4
         1, -1, -1,    1, 0, 0,     // vertex f, index 5
         1,  1, -1,    1, 1, 0,     // vertex g, index 6
        -1,  1, -1,    0, 1, 0,     // vertex h, index 7 
    ]);

    const indexData = new Uint32Array([
        // front
        0, 1, 2, 2, 3, 0,

        // right
        1, 5, 6, 6, 2, 1,

        // back
        4, 7, 6, 6, 5, 4,

        // left
        0, 3, 7, 7, 4, 0,

        // top
        3, 2, 6, 6, 7, 3,

        // bottom
        0, 4, 5, 5, 1, 0
    ]);

    return {
        vertexData,
        indexData
    };
};

export const CubeData = () =>{
    const positions = new Float32Array([
        // front
        -1, -1,  1,  
         1, -1,  1,  
         1,  1,  1,
         1,  1,  1,
        -1,  1,  1,
        -1, -1,  1,

        // right
         1, -1,  1,
         1, -1, -1,
         1,  1, -1,
         1,  1, -1,
         1,  1,  1,
         1, -1,  1,

        // back
        -1, -1, -1,
        -1,  1, -1,
         1,  1, -1,
         1,  1, -1,
         1, -1, -1,
        -1, -1, -1,

        // left
        -1, -1,  1,
        -1,  1,  1,
        -1,  1, -1,
        -1,  1, -1,
        -1, -1, -1,
        -1, -1,  1,

        // top
        -1,  1,  1,
         1,  1,  1,
         1,  1, -1,
         1,  1, -1,
        -1,  1, -1,
        -1,  1,  1,

        // bottom
        -1, -1,  1,
        -1, -1, -1,
         1, -1, -1,
         1, -1, -1,
         1, -1,  1,
        -1, -1,  1
    ]);

    const colors = new Float32Array([
        // front - blue
        0, 0, 1,
        0, 0, 1,
        0, 0, 1,
        0, 0, 1,
        0, 0, 1,
        0, 0, 1,

        // right - red
        1, 0, 0,
        1, 0, 0,
        1, 0, 0,
        1, 0, 0,
        1, 0, 0,
        1, 0, 0,

        //back - yellow
        1, 1, 0,
        1, 1, 0,
        1, 1, 0,
        1, 1, 0,
        1, 1, 0,
        1, 1, 0,

        //left - aqua
        0, 1, 1,
        0, 1, 1,
        0, 1, 1,
        0, 1, 1,
        0, 1, 1,
        0, 1, 1,

        // top - green
        0, 1, 0,
        0, 1, 0,
        0, 1, 0,
        0, 1, 0,
        0, 1, 0,
        0, 1, 0,

        // bottom - fuchsia
        1, 0, 1,
        1, 0, 1,
        1, 0, 1,
        1, 0, 1,
        1, 0, 1,
        1, 0, 1
    ]);

    const normals = new Float32Array([
        // front
        0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1,

        // right
        1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0,

        // back           
        0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1,

        // left
        -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0,

        // top
        0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0,

        // bottom
        0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0
    ]);

    return {
        positions,
        colors,
        normals
    };
}