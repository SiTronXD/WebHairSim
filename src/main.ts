import { CreateShapeWithLight } from './light';
import { LightInputs } from './shaders';
import { CubeData } from './vertex_data';
import $ from 'jquery';

const data = CubeData();
let li:LightInputs = {};
let isAnimation = true;
CreateShapeWithLight(data.positions, data.normals, li, isAnimation);