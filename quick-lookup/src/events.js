import { listen as tauriListen } from '@tauri-apps/api/event'

//TODO: remove the now-useless code that accounts for developing
//on the browser environment
let mockEmitLayerChangeCallbacks = [];
export function mockEmitLayerChange(layerNum) {
    for(var mockEmitLayerChangeCallback of mockEmitLayerChangeCallbacks) {
      mockEmitLayerChangeCallback({layer: layerNum});
    }
}

export function listen(callback) {
  if (typeof window.__TAURI__ == "undefined") {
    callback({layer: 0});
    mockEmitLayerChangeCallbacks.push(callback);
  }
  else {
    callback({layer: window.__START_LAYER__});
    tauriListen('update-keyboard', (event) => callback(event.payload)).then();
  }
}
