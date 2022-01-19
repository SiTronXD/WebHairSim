import * as Scene from './hairSimScene';
import $, { ajaxSettings } from 'jquery';

let settings = 
{
    renderCollisionSpheres: false,
    simulationStateInterpolation: true,
    gravityStrength: 1.0,
    hairSimDeltaTime: 0.05,
};

// Update settings and run
Scene.updateSettings(settings);
Scene.hairSim();    // Main point of entry


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

// Hair simulation delta time slider
var hairSimDtSlider = document.getElementById("hairSimDeltaTimeRange");
var hairSimDtOutput = document.getElementById("hairSimDeltaTime");
hairSimDtOutput!.innerHTML = (<HTMLInputElement> hairSimDtSlider!).value + " (" + Math.round(1.0 / settings.hairSimDeltaTime) + " fps)";
hairSimDtSlider!.oninput = function() 
{
    let sliderValue = (<HTMLInputElement> this).value;

    // Set
    settings.hairSimDeltaTime = <number> (<unknown> sliderValue);
    Scene.updateSettings(settings);

    // Display gravity value
    hairSimDtOutput!.innerHTML = (<HTMLInputElement> this).value + " (" + Math.round(1.0 / settings.hairSimDeltaTime) + " fps)";
}