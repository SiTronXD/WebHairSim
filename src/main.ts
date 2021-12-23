import { hairSim } from './hairSimScene';
import $ from 'jquery';

let renderCollisionSpheres = false;
hairSim(renderCollisionSpheres);

// Toggle render collision spheres
$('#renderCollisionSpheres').on("click", function()
{
    renderCollisionSpheres = $("#renderCollisionSpheres").is(':checked');

    hairSim(renderCollisionSpheres);
});