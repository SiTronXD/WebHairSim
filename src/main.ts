//import { hairSim } from './hairSimScene';
import * as Scene from './hairSimScene';
import $, { ajaxSettings } from 'jquery';

let settings = 
{
    renderCollisionSpheres: false,
    simulationStateInterpolation: true,
    gravityStrength: 1.0,
};

// Update settings and run
Scene.updateSettings(settings);
Scene.hairSim();


// ---------- HTML elements ----------

// Toggle render collision spheres
$('#renderCollisionSpheres').on("click", function()
{
    settings.renderCollisionSpheres = $("#renderCollisionSpheres").is(':checked');
    Scene.updateSettings(settings);
});

// Toggle simulation state interpolation
$('#simStateInterpolation').on("click", function()
{
    settings.simulationStateInterpolation = $("#simStateInterpolation").is(':checked');
    Scene.updateSettings(settings);
});

// Gravity slider
var gravitySlider = document.getElementById("gravityRange");
var gravityOutput = document.getElementById("gravityOutputValue");
gravityOutput!.innerHTML = (<HTMLInputElement> gravitySlider!).value;
gravitySlider!.oninput = function() 
{
    let sliderValue = (<HTMLInputElement> this).value;

    // Set
    settings.gravityStrength = <number> (<unknown> sliderValue);
    Scene.updateSettings(settings);

    // Display gravity value
    gravityOutput!.innerHTML = (<HTMLInputElement> this).value;
}