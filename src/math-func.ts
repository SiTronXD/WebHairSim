import { vec3 } from 'gl-matrix';

export const SpherePosition = (radius:number, theta:number, 
    phi:number, center:vec3 = [0,0,0]) =>
{
    const snt = Math.sin(theta * Math.PI / 180);
    const cnt = Math.cos(theta * Math.PI / 180);
    const snp = Math.sin(phi * Math.PI / 180);
    const cnp = Math.cos(phi * Math.PI / 180);

    return vec3.fromValues(
        radius * snt * cnp + center[0],
        radius * cnt + center[1],
        -radius*snt*snp + center[2]
    );
}