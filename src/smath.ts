import { vec3 } from 'gl-matrix';

export const getSpherePosition = (radius: number, theta: number, 
    phi: number, center: vec3 = [0,0,0]) =>
{
    const snt = Math.sin(theta * Math.PI / 180);
    const cnt = Math.cos(theta * Math.PI / 180);
    const snp = Math.sin(phi * Math.PI / 180);
    const cnp = Math.cos(phi * Math.PI / 180);

    return [
        radius * snt * cnp + center[0],
        radius * cnt + center[1],
        -radius*snt*snp + center[2]
    ];
}

export const clamp = (value: number, minValue: number, maxValue: number) =>
{
    if(value < minValue)
        return minValue;
    else if(value > maxValue)
        return maxValue;

    return value;
}