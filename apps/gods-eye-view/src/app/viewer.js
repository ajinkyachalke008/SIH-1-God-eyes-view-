import * as Cesium from 'cesium';

// Defensive guard against DeveloperError halting the render loop on GPUs or contexts lacking depth textures
if (Cesium.ClassificationPrimitive?.prototype?.update && !Cesium.ClassificationPrimitive.prototype._patchedForSafety) {
  const originalUpdate = Cesium.ClassificationPrimitive.prototype.update;
  Cesium.ClassificationPrimitive.prototype.update = function (frameState) {
    try {
      return originalUpdate.call(this, frameState);
    } catch (err) {
      if (
        err?.message?.includes('All GeometryInstances must have the same color attribute') ||
        err?.message?.includes('Materials on ClassificationPrimitives are not supported')
      ) {
        console.warn('[Cesium:ClassificationPrimitive] Guarded against unsupported ground primitive attributes:', err.message);
        this.show = false;
        return;
      }
      throw err;
    }
  };
  Cesium.ClassificationPrimitive.prototype._patchedForSafety = true;
}

/** Create the standard globe viewer in caller-owned, visible containers. */
export function createApplicationViewer({ container, creditContainer }) {
  if (!container || !creditContainer)
    throw new TypeError('Viewer and credit containers are required');
  const viewer = new Cesium.Viewer(container, {
    timeline: false,
    animation: false,
    baseLayerPicker: false,
    geocoder: false,
    homeButton: false,
    sceneModePicker: false,
    navigationHelpButton: false,
    fullscreenButton: false,
    vrButton: false,
    selectionIndicator: false,
    infoBox: false,
    baseLayer: false,
    creditContainer,
    msaaSamples: 2,
    contextOptions: {
      webgl: {
        preserveDrawingBuffer: true,
        failIfMajorPerformanceCaveat: false,
      },
      allowTextureFilterAnisotropic: true,
    },
  });
  try {
    viewer.targetFrameRate = 60;
    viewer.scene.globe.show = false;
    viewer.scene.skyAtmosphere.show = true;
    viewer.scene.skyAtmosphere.atmosphereLightIntensity = 18;
    viewer.scene.skyAtmosphere.saturationShift = -0.12;
    viewer.scene.skyAtmosphere.brightnessShift = -0.08;
    viewer.scene.rethrowRenderErrors = false;
    return viewer;
  } catch (error) {
    viewer.destroy();
    throw error;
  }
}
