import { CreateShapeWithLight, hairSim } from './hairSimScene';
import { LightInputs } from './shaders';
import { CubeData1 } from './vertex_data';
import $ from 'jquery';

const data = CubeData1();
let li:LightInputs = {};
let isAnimation = true;
hairSim(data.vertexData, data.indexData, li, isAnimation);