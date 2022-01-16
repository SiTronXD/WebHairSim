//import { hairSim } from './hairSimScene';
import * as Scene from './hairSimScene';
import $ from 'jquery';

// Run
Scene.hairSim();

// Toggle render collision spheres
$('#renderCollisionSpheres').on("click", function()
{
    Scene.setRenderCollisionSpheres($("#renderCollisionSpheres").is(':checked'));
});