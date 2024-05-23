import { app } from "../../../scripts/app.js";
import { api } from '../../../scripts/api.js'
import { ComfyWidgets } from "../../../scripts/widgets.js"

function draggable(model) {
  model.buttonMode = true;
  model.on("pointerdown", (e) => {
    model.dragging = true;
    model._pointerX = e.data.global.x - model.x;
    model._pointerY = e.data.global.y - model.y;
  });
  model.on("pointermove", (e) => {
    if (model.dragging) {
      model.position.x = e.data.global.x - model._pointerX;
      model.position.y = e.data.global.y - model._pointerY;
    }
  });
  model.on("pointerupoutside", () => (model.dragging = false));
  model.on("pointerup", () => (model.dragging = false));
}

function talk(model,audio_link){
    var volume = 1; // [Optional arg, can be null or empty] [0.0 - 1.0]
    var expression = 8; // [Optional arg, can be null or empty] [index|name of expression]
    var resetExpression = true; // [Optional arg, can be null or empty] [true|false] [default: true] [if true, expression will be reset to default after animation is over]
    var crossOrigin = "anonymous"; // [Optional arg, to use not same-origin audios] [DEFAULT: null]
    
    model.speak(audio_link, {volume: volume, expression:expression, resetExpression:resetExpression, crossOrigin: crossOrigin})
    
    // Or if you want to keep some things default
    model.speak(audio_link)
    model.speak(audio_link, {volume: volume})
    model.speak(audio_link, {expression:expression, resetExpression:resetExpression})
}

function showVtuber(node, audio_name,audio_type, vtuber) {
    let params =  {
        "filename": audio_name,
        "type": audio_type,
    }
    const audio_link = api.apiURL('/view?' + new URLSearchParams(params));

    var element = document.createElement("div");
   
    const previewNode = node;
    var previewWidget = node.addDOMWidget("vtuberpreview", "preview", element, {
        serialize: false,
        hideOnZoom: false,
        getValue() {
            return element.value;
        },
        setValue(v) {
            element.value = v;
        },
    });

    previewWidget.computeSize = function(width) {
        if (this.aspectRatio && !this.parentEl.hidden) {
            let height = (previewNode.size[0]-20)/ this.aspectRatio + 10;
            if (!(height > 0)) {
                height = 0;
            }
            this.computedHeight = height + 10;
            return [width, height];
        }
        return [width, -4];//no loaded src, widget should not display
    }
    // element.style['pointer-events'] = "none"
    previewWidget.value = {hidden: false, paused: false, params: {}}
    previewWidget.parentEl = document.createElement("canvas");
    previewWidget.parentEl.id = "canvas";
    previewWidget.parentEl.style['width'] = "100%"
    element.appendChild(previewWidget.parentEl);

    const cubism4Model = `extensions/ComfyUI-Live2DViewer/vtuber/${vtuber}/runtime/${vtuber}.model3.json`;

    (async function main() {

        const app = new PIXI.Application({
          view: document.getElementById("canvas"),
          autoStart: true,
          resizeTo: window,
          backgroundColor: 0x333333
        });
      
        const models = await Promise.all([
          PIXI.live2d.Live2DModel.from(cubism4Model)
        ]);
      
        models.forEach((model) => {
          app.stage.addChild(model);
      
          const scaleX = (innerWidth ) / model.width;
          const scaleY = (innerHeight ) / model.height;
      
          // fit the window
          model.scale.set(Math.min(scaleX, scaleY));
      
          model.y = innerHeight * 0.1;
          draggable(model);
          talk(model,audio_link);
        });
      
        const model4 = models[0];
      
      
        model4.x = innerWidth  / 2;
      
      
        model4.on("hit", (hitAreas) => {
          if (hitAreas.includes("Body")) {
            model4.motion("Tap");
          }
      
          if (hitAreas.includes("Head")) {
            model4.expression();
          }
        });
        let btnWidget =  node.addWidget("button", "RELOAD", "Audio", () => {
          talk(model4,audio_link);
        });
        element.appendChild(btnWidget);
      })();
      return { widget: previewWidget };
}

app.registerExtension({
	name: "Live2DViewer.ShowVtuber",
	async beforeRegisterNodeDef(nodeType, nodeData, app) {
		if (nodeData?.name == "Live2DViewer") {
      nodeType.prototype.onExecuted = function (data) {
				showVtuber(this, data.vtuber[0],data.vtuber[1],data.vtuber[2]);
        console.log(data.vtuber);
			}
		}
	},
});