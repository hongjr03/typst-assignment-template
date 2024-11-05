const kObject = Symbol.for("reflexo-obj");
var TypstDefaultParams;
(function(TypstDefaultParams2) {
  TypstDefaultParams2[TypstDefaultParams2["PIXEL_PER_PT"] = 3] = "PIXEL_PER_PT";
})(TypstDefaultParams = TypstDefaultParams || (TypstDefaultParams = {}));
class RenderView {
  constructor(pageInfos, container, options) {
    this.pageInfos = pageInfos;
    this.imageScaleFactor = options.pixelPerPt ?? TypstDefaultParams.PIXEL_PER_PT;
    container.innerHTML = "";
    container.style.width = "100%";
    this.container = container;
    this.canvasList = new Array(this.loadPageCount);
    this.textLayerList = new Array(this.loadPageCount);
    this.commonList = new Array(this.loadPageCount);
    this.textLayerParentList = new Array(this.loadPageCount);
    this.semanticLayerList = new Array(this.loadPageCount);
    const createOver = (i, pageAst, commonDiv) => {
      const width = Math.ceil(pageAst.width) * this.imageScaleFactor;
      const height = Math.ceil(pageAst.height) * this.imageScaleFactor;
      const canvas = this.canvasList[i] = document.createElement("canvas");
      const semanticLayer = this.semanticLayerList[i] = document.createElement("div");
      const textLayer = this.textLayerList[i] = document.createElement("div");
      const textLayerParent = this.textLayerParentList[i] = document.createElement("div");
      const ctx = canvas.getContext("2d");
      if (ctx) {
        const canvasDiv = document.createElement("div");
        canvas.width = width;
        canvas.height = height;
        canvasDiv.appendChild(canvas);
        commonDiv.appendChild(canvasDiv);
        canvasDiv.style.position = "absolute";
      }
      {
        textLayerParent.appendChild(textLayer);
        textLayerParent.className = "typst-html-semantics";
        const containerWidth = container.offsetWidth;
        const orignalScale = containerWidth / pageAst.width;
        textLayerParent.style.width = `${containerWidth}px`;
        textLayerParent.style.height = `${pageAst.height * orignalScale}px`;
        textLayerParent.style.setProperty("--data-text-width", `${orignalScale}px`);
        textLayerParent.style.setProperty("--data-text-height", `${orignalScale}px`);
        commonDiv.classList.add("typst-page");
        commonDiv.classList.add("canvas");
        commonDiv.style.width = `${containerWidth}px`;
        commonDiv.style.height = `${height * orignalScale}px`;
        commonDiv.style.position = "relative";
        semanticLayer.appendChild(textLayerParent);
        commonDiv.appendChild(semanticLayer);
      }
    };
    for (let i = 0; i < this.pageInfos.length; i++) {
      const pageAst = this.pageInfos[i];
      let commonDiv = void 0;
      commonDiv = this.commonList[i] = document.createElement("div");
      container.appendChild(commonDiv);
      createOver(i, pageAst, commonDiv);
    }
  }
  resetLayout() {
    for (let i = 0; i < this.pageInfos.length; i++) {
      const pageAst = this.pageInfos[i];
      const width = Math.ceil(pageAst.width) * this.imageScaleFactor;
      const height = Math.ceil(pageAst.height) * this.imageScaleFactor;
      const canvasDiv = this.canvasList[i].parentElement;
      if (!canvasDiv) {
        throw new Error(`canvasDiv is null for page ${i}, canvas list length ${this.canvasList.length}`);
      }
      const commonDiv = this.commonList[i];
      const textLayerParent = this.textLayerParentList[i];
      const containerWidth = this.container.offsetWidth;
      const orignalScale = containerWidth / width;
      textLayerParent.style.width = `${containerWidth}px`;
      textLayerParent.style.height = `${height * orignalScale}px`;
      commonDiv.style.width = `${containerWidth}px`;
      commonDiv.style.height = `${height * orignalScale}px`;
      const currentScale = this.container.offsetWidth / width;
      canvasDiv.style.transformOrigin = "0px 0px";
      canvasDiv.style.transform = `scale(${currentScale})`;
    }
  }
}
const once = (fn) => {
  let called = false;
  let res;
  return () => {
    if (called) {
      return res;
    }
    called = true;
    return res = fn();
  };
};
class LazyWasmModule {
  constructor(initFn) {
    if (typeof initFn !== "function") {
      throw new Error("initFn is not a function");
    }
    this.initOnce = once(async () => {
      await initFn(this.wasmBin);
    });
  }
  async init(module) {
    this.wasmBin = module;
    await this.initOnce();
  }
}
const instanceOfAny = (object, constructors) => constructors.some((c) => object instanceof c);
let idbProxyableTypes;
let cursorAdvanceMethods;
function getIdbProxyableTypes() {
  return idbProxyableTypes || (idbProxyableTypes = [
    IDBDatabase,
    IDBObjectStore,
    IDBIndex,
    IDBCursor,
    IDBTransaction
  ]);
}
function getCursorAdvanceMethods() {
  return cursorAdvanceMethods || (cursorAdvanceMethods = [
    IDBCursor.prototype.advance,
    IDBCursor.prototype.continue,
    IDBCursor.prototype.continuePrimaryKey
  ]);
}
const cursorRequestMap = /* @__PURE__ */ new WeakMap();
const transactionDoneMap = /* @__PURE__ */ new WeakMap();
const transactionStoreNamesMap = /* @__PURE__ */ new WeakMap();
const transformCache = /* @__PURE__ */ new WeakMap();
const reverseTransformCache = /* @__PURE__ */ new WeakMap();
function promisifyRequest(request) {
  const promise = new Promise((resolve, reject) => {
    const unlisten = () => {
      request.removeEventListener("success", success);
      request.removeEventListener("error", error);
    };
    const success = () => {
      resolve(wrap(request.result));
      unlisten();
    };
    const error = () => {
      reject(request.error);
      unlisten();
    };
    request.addEventListener("success", success);
    request.addEventListener("error", error);
  });
  promise.then((value) => {
    if (value instanceof IDBCursor) {
      cursorRequestMap.set(value, request);
    }
  }).catch(() => {
  });
  reverseTransformCache.set(promise, request);
  return promise;
}
function cacheDonePromiseForTransaction(tx) {
  if (transactionDoneMap.has(tx))
    return;
  const done = new Promise((resolve, reject) => {
    const unlisten = () => {
      tx.removeEventListener("complete", complete);
      tx.removeEventListener("error", error);
      tx.removeEventListener("abort", error);
    };
    const complete = () => {
      resolve();
      unlisten();
    };
    const error = () => {
      reject(tx.error || new DOMException("AbortError", "AbortError"));
      unlisten();
    };
    tx.addEventListener("complete", complete);
    tx.addEventListener("error", error);
    tx.addEventListener("abort", error);
  });
  transactionDoneMap.set(tx, done);
}
let idbProxyTraps = {
  get(target, prop, receiver) {
    if (target instanceof IDBTransaction) {
      if (prop === "done")
        return transactionDoneMap.get(target);
      if (prop === "objectStoreNames") {
        return target.objectStoreNames || transactionStoreNamesMap.get(target);
      }
      if (prop === "store") {
        return receiver.objectStoreNames[1] ? void 0 : receiver.objectStore(receiver.objectStoreNames[0]);
      }
    }
    return wrap(target[prop]);
  },
  set(target, prop, value) {
    target[prop] = value;
    return true;
  },
  has(target, prop) {
    if (target instanceof IDBTransaction && (prop === "done" || prop === "store")) {
      return true;
    }
    return prop in target;
  }
};
function replaceTraps(callback) {
  idbProxyTraps = callback(idbProxyTraps);
}
function wrapFunction(func) {
  if (func === IDBDatabase.prototype.transaction && !("objectStoreNames" in IDBTransaction.prototype)) {
    return function(storeNames, ...args) {
      const tx = func.call(unwrap(this), storeNames, ...args);
      transactionStoreNamesMap.set(tx, storeNames.sort ? storeNames.sort() : [storeNames]);
      return wrap(tx);
    };
  }
  if (getCursorAdvanceMethods().includes(func)) {
    return function(...args) {
      func.apply(unwrap(this), args);
      return wrap(cursorRequestMap.get(this));
    };
  }
  return function(...args) {
    return wrap(func.apply(unwrap(this), args));
  };
}
function transformCachableValue(value) {
  if (typeof value === "function")
    return wrapFunction(value);
  if (value instanceof IDBTransaction)
    cacheDonePromiseForTransaction(value);
  if (instanceOfAny(value, getIdbProxyableTypes()))
    return new Proxy(value, idbProxyTraps);
  return value;
}
function wrap(value) {
  if (value instanceof IDBRequest)
    return promisifyRequest(value);
  if (transformCache.has(value))
    return transformCache.get(value);
  const newValue = transformCachableValue(value);
  if (newValue !== value) {
    transformCache.set(value, newValue);
    reverseTransformCache.set(newValue, value);
  }
  return newValue;
}
const unwrap = (value) => reverseTransformCache.get(value);
const readMethods = ["get", "getKey", "getAll", "getAllKeys", "count"];
const writeMethods = ["put", "add", "delete", "clear"];
const cachedMethods = /* @__PURE__ */ new Map();
function getMethod(target, prop) {
  if (!(target instanceof IDBDatabase && !(prop in target) && typeof prop === "string")) {
    return;
  }
  if (cachedMethods.get(prop))
    return cachedMethods.get(prop);
  const targetFuncName = prop.replace(/FromIndex$/, "");
  const useIndex = prop !== targetFuncName;
  const isWrite = writeMethods.includes(targetFuncName);
  if (
    // Bail if the target doesn't exist on the target. Eg, getAll isn't in Edge.
    !(targetFuncName in (useIndex ? IDBIndex : IDBObjectStore).prototype) || !(isWrite || readMethods.includes(targetFuncName))
  ) {
    return;
  }
  const method = async function(storeName, ...args) {
    const tx = this.transaction(storeName, isWrite ? "readwrite" : "readonly");
    let target2 = tx.store;
    if (useIndex)
      target2 = target2.index(args.shift());
    return (await Promise.all([
      target2[targetFuncName](...args),
      isWrite && tx.done
    ]))[0];
  };
  cachedMethods.set(prop, method);
  return method;
}
replaceTraps((oldTraps) => ({
  ...oldTraps,
  get: (target, prop, receiver) => getMethod(target, prop) || oldTraps.get(target, prop, receiver),
  has: (target, prop) => !!getMethod(target, prop) || oldTraps.has(target, prop)
}));
class ComponentBuilder {
  constructor() {
    this.loadedFonts = /* @__PURE__ */ new Set();
    this.fetcher = fetch;
  }
  setFetcher(fetcher) {
    this.fetcher = fetcher;
  }
  async loadFonts(builder, fonts) {
    const escapeImport = new Function("m", "return import(m)");
    const fetcher = this.fetcher || (this.fetcher = await async function() {
      const { fetchBuilder, FileSystemCache } = await escapeImport("node-fetch-cache");
      const cache = new FileSystemCache({
        /// By default, we don't have a complicated cache policy.
        cacheDirectory: ".cache/typst/fonts"
      });
      const cachedFetcher = fetchBuilder.withCache(cache);
      return function(input, init) {
        const timeout = setTimeout(() => {
          console.warn("font fetching is stucking:", input);
        }, 15e3);
        return cachedFetcher(input, init).finally(() => {
          clearTimeout(timeout);
        });
      };
    }());
    const fontsToLoad = fonts.filter((font) => {
      if (font instanceof Uint8Array) {
        return true;
      }
      if (this.loadedFonts.has(font)) {
        return false;
      }
      this.loadedFonts.add(font);
      return true;
    });
    const fontLists = await Promise.all(fontsToLoad.map(async (font) => {
      if (font instanceof Uint8Array) {
        await builder.add_raw_font(font);
        return;
      }
      return new Uint8Array(await (await fetcher(font)).arrayBuffer());
    }));
    for (const font of fontLists) {
      if (!font) {
        continue;
      }
      await builder.add_raw_font(font);
    }
  }
  async build(options, builder, hooks) {
    const buildCtx = { ref: this, builder, hooks };
    for (const fn of (options == null ? void 0 : options.beforeBuild) ?? []) {
      await fn(void 0, buildCtx);
    }
    if (hooks.latelyBuild) {
      hooks.latelyBuild(buildCtx);
    }
    const component = await builder.build();
    return component;
  }
}
async function buildComponent(options, gModule, Builder, hooks) {
  var _a;
  await gModule.init((_a = options == null ? void 0 : options.getModule) == null ? void 0 : _a.call(options));
  return await new ComponentBuilder().build(options, new Builder(), hooks);
}
var PreviewMode;
(function(PreviewMode2) {
  PreviewMode2[PreviewMode2["Doc"] = 0] = "Doc";
  PreviewMode2[PreviewMode2["Slide"] = 1] = "Slide";
})(PreviewMode = PreviewMode || (PreviewMode = {}));
class TypstDocumentContext {
  constructor(opts) {
    var _a, _b;
    this.modes = [];
    this.partialRendering = true;
    this.renderMode = "svg";
    this.r = void 0;
    this.previewMode = PreviewMode.Doc;
    this.isContentPreview = false;
    this.isMixinOutline = false;
    this.backgroundColor = "black";
    this.pageColor = "white";
    this.pixelPerPt = 3;
    this.isRendering = false;
    this.moduleInitialized = false;
    this.patchQueue = [];
    this.disposeList = [];
    this.currentRealScale = 1;
    this.currentScaleRatio = 1;
    this.vpTimeout = void 0;
    this.sampledRenderTime = 0;
    this.partialRenderPage = 0;
    this.outline = void 0;
    this.cursorPosition = void 0;
    this.cachedDOMState = {
      width: 0,
      height: 0,
      window: {
        innerWidth: 0,
        innerHeight: 0
      },
      boundingRect: {
        left: 0,
        top: 0,
        right: 0
      }
    };
    this.hookedElem = opts.hookedElem;
    this.kModule = opts.kModule;
    this.opts = opts || {};
    {
      const { renderMode, previewMode, isContentPreview, retrieveDOMState } = opts || {};
      this.partialRendering = false;
      this.renderMode = renderMode ?? this.renderMode;
      this.previewMode = previewMode ?? this.previewMode;
      this.isContentPreview = isContentPreview || false;
      this.retrieveDOMState = retrieveDOMState ?? (() => {
        return {
          width: this.hookedElem.offsetWidth,
          height: this.hookedElem.offsetHeight,
          window: {
            innerWidth: window.innerWidth,
            innerHeight: window.innerHeight
          },
          boundingRect: this.hookedElem.getBoundingClientRect()
        };
      });
      this.backgroundColor = getComputedStyle(document.documentElement).getPropertyValue("--typst-preview-background-color");
    }
    this.hookedElem.classList.add("hide-scrollbar-x");
    (_a = this.hookedElem.parentElement) == null ? void 0 : _a.classList.add("hide-scrollbar-x");
    if (this.previewMode === PreviewMode.Slide) {
      this.hookedElem.classList.add("hide-scrollbar-y");
      (_b = this.hookedElem.parentElement) == null ? void 0 : _b.classList.add("hide-scrollbar-y");
    }
    this.installCtrlWheelHandler();
  }
  reset() {
    this.kModule.reset();
    this.moduleInitialized = false;
  }
  dispose() {
    const disposeList = this.disposeList;
    this.disposeList = [];
    disposeList.forEach((x) => x());
  }
  static derive(ctx, mode) {
    return ["rescale", "rerender", "postRender"].reduce((acc, x) => {
      acc[x] = ctx[`${x}$${mode}`].bind(ctx);
      console.assert(acc[x] !== void 0, `${x}$${mode} is undefined`);
      return acc;
    }, {});
  }
  registerMode(mode) {
    const facade = TypstDocumentContext.derive(this, mode);
    this.modes.push([mode, facade]);
    if (mode === this.renderMode) {
      this.r = facade;
    }
  }
  installCtrlWheelHandler() {
    const factors = [
      0.1,
      0.2,
      0.3,
      0.4,
      0.5,
      0.6,
      0.7,
      0.8,
      0.9,
      1,
      1.1,
      1.3,
      1.5,
      1.7,
      1.9,
      2.1,
      2.4,
      2.7,
      3,
      3.3,
      3.7,
      4.1,
      4.6,
      5.1,
      5.7,
      6.3,
      7,
      7.7,
      8.5,
      9.4,
      10
    ];
    const wheelEventHandler = (event) => {
      var _a, _b, _c, _d;
      if (event.ctrlKey) {
        event.preventDefault();
        this.cachedDOMState = this.retrieveDOMState();
        if (window.onresize !== null) {
          window.onresize = null;
        }
        const prevScaleRatio = this.currentScaleRatio;
        if (event.deltaY < 0) {
          if (this.currentScaleRatio >= factors.at(-1)) {
            return;
          } else {
            this.currentScaleRatio = factors.filter((x) => x > this.currentScaleRatio).at(0);
          }
        } else if (event.deltaY > 0) {
          if (this.currentScaleRatio <= factors.at(0)) {
            return;
          } else {
            this.currentScaleRatio = factors.filter((x) => x < this.currentScaleRatio).at(-1);
          }
        } else {
          return;
        }
        const scrollFactor = this.currentScaleRatio / prevScaleRatio;
        const scrollX = event.pageX * (scrollFactor - 1);
        const scrollY = event.pageY * (scrollFactor - 1);
        if (Math.abs(this.currentScaleRatio - 1) < 1e-5) {
          this.hookedElem.classList.add("hide-scrollbar-x");
          (_a = this.hookedElem.parentElement) == null ? void 0 : _a.classList.add("hide-scrollbar-x");
          if (this.previewMode === PreviewMode.Slide) {
            this.hookedElem.classList.add("hide-scrollbar-y");
            (_b = this.hookedElem.parentElement) == null ? void 0 : _b.classList.add("hide-scrollbar-y");
          }
        } else {
          this.hookedElem.classList.remove("hide-scrollbar-x");
          (_c = this.hookedElem.parentElement) == null ? void 0 : _c.classList.remove("hide-scrollbar-x");
          if (this.previewMode === PreviewMode.Slide) {
            this.hookedElem.classList.remove("hide-scrollbar-y");
            (_d = this.hookedElem.parentElement) == null ? void 0 : _d.classList.remove("hide-scrollbar-y");
          }
        }
        const svg = this.hookedElem.firstElementChild;
        if (svg) {
          const scaleRatio = this.getSvgScaleRatio();
          const dataHeight = Number.parseFloat(svg.getAttribute("data-height"));
          const scaledHeight = Math.ceil(dataHeight * scaleRatio);
          this.hookedElem.style.height = `${scaledHeight * 2}px`;
        }
        window.scrollBy(scrollX, scrollY);
        this.addViewportChange();
        return false;
      }
    };
    if (this.renderMode !== "dom") {
      const vscodeAPI = typeof acquireVsCodeApi !== "undefined";
      if (vscodeAPI) {
        window.addEventListener("wheel", wheelEventHandler, {
          passive: false
        });
        this.disposeList.push(() => {
          window.removeEventListener("wheel", wheelEventHandler);
        });
      } else {
        document.body.addEventListener("wheel", wheelEventHandler, {
          passive: false
        });
        this.disposeList.push(() => {
          document.body.removeEventListener("wheel", wheelEventHandler);
        });
      }
    }
  }
  /// Get current scale from html to svg
  // Note: one should retrieve dom state before rescale
  getSvgScaleRatio() {
    const svg = this.hookedElem.firstElementChild;
    if (!svg) {
      return 0;
    }
    const container = this.cachedDOMState;
    const svgWidth = Number.parseFloat(svg.getAttribute("data-width") || svg.getAttribute("width") || "1");
    const svgHeight = Number.parseFloat(svg.getAttribute("data-height") || svg.getAttribute("height") || "1");
    this.currentRealScale = this.previewMode === PreviewMode.Slide ? Math.min(container.width / svgWidth, container.height / svgHeight) : container.width / svgWidth;
    return this.currentRealScale * this.currentScaleRatio;
  }
  processQueue(svgUpdateEvent) {
    const eventName = svgUpdateEvent[0];
    switch (eventName) {
      case "new":
      case "diff-v1": {
        if (eventName === "new") {
          this.reset();
        }
        this.kModule.manipulateData({
          action: "merge",
          data: svgUpdateEvent[1]
        });
        this.moduleInitialized = true;
        return true;
      }
      case "viewport-change": {
        if (!this.moduleInitialized) {
          console.log("viewport-change before initialization");
          return false;
        }
        return true;
      }
      default:
        console.log("svgUpdateEvent", svgUpdateEvent);
        return false;
    }
  }
  triggerUpdate() {
    if (this.isRendering) {
      return;
    }
    this.isRendering = true;
    const doUpdate = async () => {
      this.cachedDOMState = this.retrieveDOMState();
      if (this.patchQueue.length === 0) {
        this.isRendering = false;
        this.postprocessChanges();
        return;
      }
      try {
        let t0 = performance.now();
        const ctoken = this.canvasRenderCToken;
        if (ctoken) {
          await ctoken.cancel();
          await ctoken.wait();
          this.canvasRenderCToken = void 0;
          console.log("cancel canvas rendering");
        }
        let needRerender = false;
        while (this.patchQueue.length > 0) {
          needRerender = this.processQueue(this.patchQueue.shift()) || needRerender;
        }
        let t1 = performance.now();
        if (needRerender) {
          this.r.rescale();
          await this.r.rerender();
          this.r.rescale();
        }
        let t2 = performance.now();
        const d = (e, x, y) => `${e} ${(y - x).toFixed(2)} ms`;
        this.sampledRenderTime = t2 - t0;
        console.log([d("parse", t0, t1), d("rerender", t1, t2), d("total", t0, t2)].join(", "));
        requestAnimationFrame(doUpdate);
      } catch (e) {
        console.error(e);
        this.isRendering = false;
        this.postprocessChanges();
      }
    };
    requestAnimationFrame(doUpdate);
  }
  postprocessChanges() {
    this.r.postRender();
    if (this.previewMode === PreviewMode.Slide) {
      document.querySelectorAll(".typst-page-number-indicator").forEach((x) => {
        x.textContent = `${this.kModule.retrievePagesInfo().length}`;
      });
    }
  }
  addChangement(change) {
    if (change[0] === "new") {
      this.patchQueue.splice(0, this.patchQueue.length);
    }
    const pushChange = () => {
      this.vpTimeout = void 0;
      this.patchQueue.push(change);
      this.triggerUpdate();
    };
    if (this.vpTimeout !== void 0) {
      clearTimeout(this.vpTimeout);
    }
    if (change[0] === "viewport-change" && this.isRendering) {
      this.vpTimeout = setTimeout(pushChange, this.sampledRenderTime || 100);
    } else {
      pushChange();
    }
  }
  addViewportChange() {
    this.addChangement(["viewport-change", ""]);
  }
}
function provideDoc(Base) {
  return class TypstDocument {
    constructor(options) {
      if (options.isContentPreview) {
        options.renderMode = "canvas";
      }
      this.kModule = options.kModule;
      this.impl = new Base(options);
      if (!this.impl.r) {
        throw new Error(`mode is not supported, ${options == null ? void 0 : options.renderMode}`);
      }
      if (options.isContentPreview) {
        this.impl.partialRendering = true;
        this.impl.pixelPerPt = 1;
        this.impl.isMixinOutline = true;
      }
    }
    dispose() {
      this.impl.dispose();
    }
    reset() {
      this.impl.reset();
    }
    addChangement(change) {
      this.impl.addChangement(change);
    }
    addViewportChange() {
      this.impl.addViewportChange();
    }
    setPageColor(color) {
      this.impl.pageColor = color;
      this.addViewportChange();
    }
    setPartialRendering(partialRendering) {
      this.impl.partialRendering = partialRendering;
    }
    setCursor(page, x, y) {
      this.impl.cursorPosition = [page, x, y];
    }
    setPartialPageNumber(page) {
      if (page <= 0 || page > this.kModule.retrievePagesInfo().length) {
        return false;
      }
      this.impl.partialRenderPage = page - 1;
      this.addViewportChange();
      return true;
    }
    getPartialPageNumber() {
      return this.impl.partialRenderPage + 1;
    }
    setOutineData(outline) {
      this.impl.outline = outline;
      this.addViewportChange();
    }
  };
}
function composeDoc(Base, ...mixins) {
  return mixins.reduce((acc, mixin) => mixin(acc), Base);
}
class TypstCancellationToken {
  constructor() {
    this.isCancellationRequested = false;
    let resolveT = void 0;
    let resolveX = void 0;
    this._onCancelled = new Promise((resolve) => {
      resolveT = resolve;
      if (resolveX) {
        resolveX(resolve);
      }
    });
    this._onCancelledResolveResolved = new Promise((resolve) => {
      resolveX = resolve;
      if (resolveT) {
        resolve(resolveT);
      }
    });
  }
  async cancel() {
    await this._onCancelledResolveResolved;
    this.isCancellationRequested = true;
  }
  isCancelRequested() {
    return this.isCancellationRequested;
  }
  async consume() {
    (await this._onCancelledResolveResolved)();
  }
  wait() {
    return this._onCancelled;
  }
}
const animationFrame = () => new Promise((resolve) => requestAnimationFrame(resolve));
var TrackMode;
(function(TrackMode2) {
  TrackMode2[TrackMode2["Doc"] = 0] = "Doc";
  TrackMode2[TrackMode2["Pages"] = 1] = "Pages";
})(TrackMode || (TrackMode = {}));
var RepaintStage;
(function(RepaintStage2) {
  RepaintStage2[RepaintStage2["Layout"] = 0] = "Layout";
  RepaintStage2[RepaintStage2["Svg"] = 1] = "Svg";
  RepaintStage2[RepaintStage2["Semantics"] = 2] = "Semantics";
  RepaintStage2[RepaintStage2["PrepareCanvas"] = 3] = "PrepareCanvas";
  RepaintStage2[RepaintStage2["Canvas"] = 4] = "Canvas";
})(RepaintStage || (RepaintStage = {}));
function provideDomDoc(Base) {
  return class DomDocument extends Base {
    constructor(...args) {
      super(...args);
      this.tmpl = document.createElement("template");
      this.stub = this.createElement("<stub></stub>");
      this.resourceHeader = void 0;
      this.pages = [];
      this.domScale = 1;
      this.track_mode = TrackMode.Doc;
      this.current_task = void 0;
      this.registerMode("dom");
      this.disposeList.push(() => {
        this.dispose();
      });
      this.plugin = this.opts.renderer;
      if (this.opts.domScale !== void 0) {
        if (this.opts.domScale <= 0) {
          throw new Error("domScale must be positive");
        }
        this.domScale = this.opts.domScale;
      }
    }
    dispose() {
      for (const page of this.pages) {
        page.dispose();
      }
      if (this.docKernel) {
        this.docKernel.free();
      }
    }
    createElement(tmpl) {
      this.tmpl.innerHTML = tmpl;
      return this.tmpl.content.firstElementChild;
    }
    async mountDom(pixelPerPt) {
      console.log("mountDom", pixelPerPt);
      if (this.docKernel) {
        throw new Error("already mounted");
      }
      this.hookedElem.innerHTML = `<svg class="typst-svg-resources" viewBox="0 0 0 0" width="0" height="0" style="opacity: 0; position: absolute;"></svg>`;
      this.resourceHeader = this.hookedElem.querySelector(".typst-svg-resources");
      this.docKernel = await this.plugin.renderer.mount_dom(this.kModule[kObject], this.hookedElem);
      this.docKernel.bind_functions({
        populateGlyphs: (data) => {
          let svg = this.createElement(data);
          console.log("populateGlyphs", svg);
          let content = svg.firstElementChild;
          this.resourceHeader.append(content);
        }
      });
    }
    async cancelAnyway$dom() {
      console.log("cancelAnyway$dom");
      if (this.current_task) {
        const task = this.current_task;
        this.current_task = void 0;
        await task.cancel();
      }
    }
    retrieveDOMPages() {
      return Array.from(this.hookedElem.querySelectorAll(".typst-dom-page"));
    }
    // doesn't need to postRender
    postRender$dom() {
    }
    // doesn't need to rescale
    rescale$dom() {
    }
    getDomViewport(cachedWindow, cachedBoundingRect) {
      const left = cachedBoundingRect.left;
      const top = -cachedBoundingRect.top;
      const right = cachedBoundingRect.right;
      const bottom = cachedWindow.innerHeight - cachedBoundingRect.top;
      const rect = {
        x: 0,
        y: top / this.domScale,
        width: Math.max(right - left, 0) / this.domScale,
        height: Math.max(bottom - top, 0) / this.domScale
      };
      if (rect.width <= 0 || rect.height <= 0) {
        rect.x = rect.y = rect.width = rect.height = 0;
      }
      return rect;
    }
    // fast mode
    async rerender$dom() {
      const domState = this.retrieveDOMState();
      const { x, y, width, height } = this.getDomViewport(domState.window, domState.boundingRect);
      let dirty = await this.docKernel.relayout(x, y, width, height);
      if (!dirty) {
        return;
      }
      const cancel = new TypstCancellationToken();
      this.doRender$dom(cancel);
      this.current_task = cancel;
    }
    async doRender$dom(ctx) {
      const condOrExit = (needFrame, cb) => {
        if (needFrame && !ctx.isCancelRequested() && cb) {
          return cb();
        }
      };
      const pages = this.retrieveDOMPages().map((page) => {
        const { innerWidth, innerHeight } = window;
        const browserBBox = page.getBoundingClientRect();
        return {
          inWindow: !(browserBBox.left > innerWidth || browserBBox.right < 0 || browserBBox.top > innerHeight || browserBBox.bottom < 0),
          page
        };
      });
      const renderPage = async (i) => {
        await animationFrame();
        if (ctx.isCancelRequested()) {
          console.log("cancel stage", RepaintStage.Layout, i);
          return void 0;
        }
        const page = pages[i].page;
        const browserBBox = page.getBoundingClientRect();
        const v = this.getDomViewport(window, browserBBox);
        const needCalc = (stage) => this.docKernel.need_repaint(i, v.x, v.y, v.width, v.height, stage);
        const repaint = (stage) => this.docKernel.repaint(i, v.x, v.y, v.width, v.height, stage);
        const calc = (stage) => {
          if (ctx.isCancelRequested()) {
            return void 0;
          }
          return condOrExit(needCalc(stage), () => repaint(stage));
        };
        await calc(RepaintStage.Layout);
        const wScale = (browserBBox.width ? Number.parseFloat(page.getAttribute("data-width")) / browserBBox.width : 1) * this.domScale;
        const hScale = (browserBBox.height ? Number.parseFloat(page.getAttribute("data-height")) / browserBBox.height : 1) * this.domScale;
        v.x *= wScale;
        v.y *= hScale;
        v.y -= 100;
        v.width *= wScale;
        v.height *= hScale;
        v.height += 200;
        await calc(RepaintStage.Svg);
        await calc(RepaintStage.Semantics);
        if (ctx.isCancelRequested()) {
          console.log("cancel stage", RepaintStage.Semantics, i);
          return void 0;
        }
        if (needCalc(RepaintStage.PrepareCanvas)) {
          const calcCanvasAfterPreparing = async () => {
            await repaint(RepaintStage.PrepareCanvas);
            if (ctx.isCancelRequested()) {
              return void 0;
            }
            return calc(RepaintStage.Canvas);
          };
          calcCanvasAfterPreparing();
        } else {
          await calc(RepaintStage.Canvas);
        }
      };
      const renderPages = async (inWindow) => {
        for (let idx = 0; idx < pages.length; ++idx) {
          if (ctx.isCancelRequested()) {
            console.log("cancel page", RepaintStage.Layout, idx);
            return;
          }
          if (pages[idx].inWindow === inWindow) {
            await renderPage(idx);
          }
        }
      };
      this.cancelAnyway$dom();
      await renderPages(true);
      await renderPages(false);
      if (ctx.isCancelRequested()) {
        return;
      }
      console.log("finished", RepaintStage.Layout);
    }
  };
}
class TypstDomDocument extends provideDoc(composeDoc(TypstDocumentContext, provideDomDoc)) {
}
let RenderSession$1 = class RenderSession {
  /**
   * @internal
   */
  constructor(plugin, o) {
    this.plugin = plugin;
    this[kObject] = o;
  }
  /**
   * Set the background color of the Typst document.
   * @param {string} t - The background color in format of `^#?[0-9a-f]{6}$`
   *
   * Note: Default to `#ffffff`.
   *
   * Note: Only available in canvas rendering mode.
   */
  set backgroundColor(t) {
    if (t !== void 0) {
      this[kObject].background_color = t;
    }
  }
  /**
   * Get the background color of the Typst document.
   *
   * Note: Default to `#ffffff`.
   *
   * Note: Only available in canvas rendering mode.
   */
  get backgroundColor() {
    return this[kObject].background_color;
  }
  /**
   * Set the pixel per point scale up the canvas panel.
   *
   * Note: Default to `3`.
   *
   * Note: Only available in canvas rendering mode.
   */
  set pixelPerPt(t) {
    if (t !== void 0) {
      this[kObject].pixel_per_pt = t;
    }
  }
  /**
   * Get the pixel per point scale up the canvas panel.
   *
   * Note: Default to `3`.
   *
   * Note: Only available in canvas rendering mode.
   */
  get pixelPerPt() {
    return this[kObject].pixel_per_pt;
  }
  /**
   * Reset state
   */
  reset() {
    this.plugin.resetSession(this);
  }
  /**
   * @deprecated
   * use {@link docWidth} instead
   */
  get doc_width() {
    return this[kObject].doc_width;
  }
  get docWidth() {
    return this[kObject].doc_width;
  }
  /**
   * @deprecated
   * use {@link docHeight} instead
   */
  get doc_height() {
    return this[kObject].doc_height;
  }
  get docHeight() {
    return this[kObject].doc_height;
  }
  retrievePagesInfo() {
    const pages_info = this[kObject].pages_info;
    const pageInfos = [];
    const pageCount = pages_info.page_count;
    for (let i = 0; i < pageCount; i++) {
      const pageAst = pages_info.page(i);
      pageInfos.push({
        pageOffset: pageAst.page_off,
        width: pageAst.width_pt,
        height: pageAst.height_pt
      });
    }
    return pageInfos;
  }
  getSourceLoc(path) {
    return this[kObject].source_span(path);
  }
  /**
   * See {@link TypstRenderer#renderSvg} for more details.
   */
  renderSvg(options) {
    return this.plugin.renderSvg({
      renderSession: this,
      ...options
    });
  }
  /**
   * See {@link TypstRenderer#renderToSvg} for more details.
   */
  renderToSvg(options) {
    return this.plugin.renderToSvg({
      renderSession: this,
      ...options
    });
  }
  /**
   * See {@link TypstRenderer#renderCanvas} for more details.
   */
  renderCanvas(options) {
    return this.plugin.renderCanvas({
      renderSession: this,
      ...options
    });
  }
  /**
   * See {@link TypstRenderer#manipulateData} for more details.
   */
  manipulateData(opts) {
    this.plugin.manipulateData({
      renderSession: this,
      ...opts
    });
  }
  /**
   * See {@link TypstRenderer#renderSvgDiff} for more details.
   */
  renderSvgDiff(opts) {
    return this.plugin.renderSvgDiff({
      renderSession: this,
      ...opts
    });
  }
  /**
   * @deprecated
   * use {@link getSourceLoc} instead
   */
  get_source_loc(path) {
    return this[kObject].source_span(path);
  }
  /**
   * @deprecated
   * use {@link renderSvgDiff} instead
   */
  render_in_window(rect_lo_x, rect_lo_y, rect_hi_x, rect_hi_y) {
    return this[kObject].render_in_window(rect_lo_x, rect_lo_y, rect_hi_x, rect_hi_y);
  }
  /**
   * @deprecated
   * use {@link manipulateData} instead
   */
  merge_delta(data) {
    this.plugin.manipulateData({
      renderSession: this,
      action: "merge",
      data
    });
  }
};
const gRendererModule = new LazyWasmModule(async (bin) => {
  const module = await Promise.resolve().then(() => wasmPackShim);
  return await module.default(bin);
});
function createTypstRenderer() {
  return new TypstRendererDriver();
}
let warnOnceCanvasSet = true;
class TypstRendererDriver {
  constructor() {
  }
  async init(options) {
    this.rendererJs = await Promise.resolve().then(() => wasmPackShim);
    const TypstRendererBuilder2 = this.rendererJs.TypstRendererBuilder;
    this.renderer = await buildComponent(options, gRendererModule, TypstRendererBuilder2, {});
  }
  loadGlyphPack(_pack) {
    return Promise.resolve();
  }
  createOptionsToRust(options) {
    const rustOptions = new this.rendererJs.CreateSessionOptions();
    if (options.format !== void 0) {
      rustOptions.format = options.format;
    }
    if (options.artifactContent !== void 0) {
      rustOptions.artifact_content = options.artifactContent;
    }
    return rustOptions;
  }
  retrievePagesInfoFromSession(session) {
    return session.retrievePagesInfo();
  }
  /**
   * Render a Typst document to canvas.
   */
  renderCanvas(options) {
    return this.withinOptionSession(options, async (sessionRef) => {
      const rustOptions = new this.rendererJs.RenderPageImageOptions();
      if (options.pageOffset !== void 0) {
        rustOptions.page_off = options.pageOffset;
      }
      if (options.cacheKey !== void 0) {
        rustOptions.cache_key = options.cacheKey;
      }
      if (options.dataSelection !== void 0) {
        let encoded = 0;
        if (options.dataSelection.body) {
          encoded |= 1 << 0;
        } else if (options.canvas && warnOnceCanvasSet) {
          warnOnceCanvasSet = false;
          console.warn("dataSelection.body is not set but providing canvas for body");
        }
        if (options.dataSelection.text || options.dataSelection.annotation) {
          console.error("dataSelection.text and dataSelection.annotation are deprecated");
        }
        if (options.dataSelection.semantics) {
          encoded |= 1 << 3;
        }
        rustOptions.data_selection = encoded;
      }
      return this.renderer.render_page_to_canvas(sessionRef[kObject], options.canvas || void 0, rustOptions);
    });
  }
  // async renderPdf(artifactContent: string): Promise<Uint8Array> {
  // return this.renderer.render_to_pdf(artifactContent);
  // }
  async inAnimationFrame(fn) {
    return new Promise((resolve, reject) => {
      requestAnimationFrame(() => {
        try {
          resolve(fn());
        } catch (e) {
          reject(e);
        }
      });
    });
  }
  async renderDisplayLayer(session, container, canvasList, options) {
    const pages_info = session[kObject].pages_info;
    const page_count = pages_info.page_count;
    const doRender = async (i, page_off) => {
      const canvas = canvasList[i];
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        throw new Error("canvas context is null");
      }
      return await this.renderCanvas({
        canvas: ctx,
        renderSession: session,
        pageOffset: page_off
      });
    };
    return this.inAnimationFrame(async () => {
      const t = performance.now();
      const textContentList = (await Promise.all(
        //   canvasList.map(async (canvas, i) => {
        //     await this.renderImageInSession(session, {
        //       page_off: i,
        //     });
        //     console.log(cyrb53(renderResult.data));
        //     let ctx = canvas.getContext('2d');
        //     if (ctx) {
        //       ctx.putImageData(renderResult, 0, 0);
        //     }
        //     return {
        //       width: renderResult.width,
        //       height: renderResult.height,
        //     };
        //   }),
        // )
        /// seq
        [
          (async () => {
            const results = [];
            for (let i = 0; i < page_count; i++) {
              results.push(await doRender(i, i));
            }
            return results;
          })()
        ]
      ))[0];
      const t3 = performance.now();
      console.log(`display layer used: render = ${(t3 - t).toFixed(1)}ms`);
      return textContentList;
    });
  }
  renderTextLayer(layerList, textSourceList) {
    const t2 = performance.now();
    layerList.forEach((layer, i) => {
      layer.innerHTML = textSourceList[i].htmlSemantics[0];
    });
    const t3 = performance.now();
    console.log(`text layer used: render = ${(t3 - t2).toFixed(1)}ms`);
  }
  async render(options) {
    if ("format" in options) {
      if (options.format !== "vector") {
        const artifactFormats = ["serde_json", "js", "ir"];
        if (artifactFormats.includes(options.format)) {
          throw new Error(`deprecated format ${options.format}, please use vector format`);
        }
      }
    }
    return this.renderToCanvas(options);
  }
  async renderDom(options) {
    if ("format" in options) {
      if (options.format !== "vector") {
        const artifactFormats = ["serde_json", "js", "ir"];
        if (artifactFormats.includes(options.format)) {
          throw new Error(`deprecated format ${options.format}, please use vector format`);
        }
      }
    }
    return this.withinOptionSession(options, async (sessionRef) => {
      const t = new TypstDomDocument({
        ...options,
        renderMode: "dom",
        hookedElem: options.container,
        kModule: sessionRef,
        renderer: this
      });
      await t.impl.mountDom(options.pixelPerPt);
      return t;
    });
  }
  async renderToCanvas(options) {
    let session;
    let renderPageResults;
    const mountContainer = options.container;
    mountContainer.style.visibility = "hidden";
    const doRenderDisplayLayer = async (canvasList, resetLayout) => {
      try {
        renderPageResults = await this.renderDisplayLayer(session, mountContainer, canvasList, options);
        resetLayout();
      } finally {
        mountContainer.style.visibility = "visible";
      }
    };
    return this.withinOptionSession(options, async (sessionRef) => {
      session = sessionRef;
      if (session[kObject].pages_info.page_count === 0) {
        throw new Error(`No page found in session`);
      }
      if (options.pixelPerPt !== void 0 && options.pixelPerPt <= 0) {
        throw new Error("Invalid typst.RenderOptions.pixelPerPt, should be a positive number " + options.pixelPerPt);
      }
      let backgroundColor = options.backgroundColor;
      if (backgroundColor !== void 0) {
        if (!/^#[0-9a-f]{6}$/.test(backgroundColor)) {
          throw new Error("Invalid typst.backgroundColor color for matching ^#?[0-9a-f]{6}$ " + backgroundColor);
        }
      }
      session.pixelPerPt = options.pixelPerPt ?? TypstDefaultParams.PIXEL_PER_PT;
      session.backgroundColor = backgroundColor ?? "#ffffff";
      const t = performance.now();
      const pageView = new RenderView(this.retrievePagesInfoFromSession(session), mountContainer, options);
      const t2 = performance.now();
      console.log(`layer used: retieve = ${(t2 - t).toFixed(1)}ms`);
      await doRenderDisplayLayer(pageView.canvasList, () => pageView.resetLayout());
      this.renderTextLayer(pageView.textLayerList, renderPageResults);
      return;
    });
  }
  createModule(b) {
    return Promise.resolve(new RenderSession$1(this, this.renderer.create_session(b && this.createOptionsToRust({
      format: "vector",
      artifactContent: b
    }))));
  }
  renderSvg(options, container) {
    if (options instanceof RenderSession$1 || container) {
      throw new Error("removed api, please use renderToSvg({ renderSession, container }) instead");
    }
    return this.withinOptionSession(options, async (sessionRef) => {
      let parts = void 0;
      if (options.data_selection) {
        parts = 0;
        if (options.data_selection.body) {
          parts |= 1 << 0;
        }
        if (options.data_selection.defs) {
          parts |= 1 << 1;
        }
        if (options.data_selection.css) {
          parts |= 1 << 2;
        }
        if (options.data_selection.js) {
          parts |= 1 << 3;
        }
      }
      return Promise.resolve(this.renderer.svg_data(sessionRef[kObject], parts));
    });
  }
  renderSvgDiff(options) {
    if (!options.window) {
      return this.renderer.render_svg_diff(options.renderSession[kObject], 0, 0, 1e33, 1e33);
    }
    return this.renderer.render_svg_diff(options.renderSession[kObject], options.window.lo.x, options.window.lo.y, options.window.hi.x, options.window.hi.y);
  }
  renderToSvg(options) {
    return this.withinOptionSession(options, async (sessionRef) => {
      return Promise.resolve(this.renderer.render_svg(sessionRef[kObject], options.container));
    });
  }
  getCustomV1(options) {
    return Promise.resolve(this.renderer.get_customs(options.renderSession[kObject]));
  }
  resetSession(session) {
    return this.renderer.reset(session[kObject]);
  }
  manipulateData(opts) {
    return this.renderer.manipulate_data(opts.renderSession[kObject], opts.action ?? "reset", opts.data);
  }
  withinOptionSession(options, fn) {
    function isRenderByContentOption(options2) {
      return "artifactContent" in options2;
    }
    if ("renderSession" in options) {
      return fn(options.renderSession);
    }
    if (isRenderByContentOption(options)) {
      return this.runWithSession(options, fn);
    }
    throw new Error("Invalid render options, should be one of RenderByContentOptions|RenderBySessionOptions");
  }
  async runWithSession(arg1, arg2) {
    let options = arg1;
    let fn = arg2;
    if (!arg2) {
      options = void 0;
      fn = arg1;
    }
    const session = this.renderer.create_session(
      /* moved */
      options && this.createOptionsToRust(options)
    );
    try {
      const res = await fn(new RenderSession$1(this, session));
      session.free();
      return res;
    } catch (e) {
      session.free();
      throw e;
    }
  }
}
window.TypstRenderModule = {
  createTypstRenderer
};
let initialRender = true;
let jumppedCrossLink = false;
function postProcessCrossLinks(appElem, reEnters) {
  const links = appElem.querySelectorAll(".typst-content-link");
  if (links.length === 0) {
    console.log("no links found, probe after a while");
    setTimeout(() => postProcessCrossLinks(appElem, reEnters * 1.5), reEnters);
    return;
  }
  links.forEach((a) => {
    if (origin) {
      const onclick = a.getAttribute("onclick");
      if (onclick === null) {
        let target = a.getAttribute("target");
        if (target === "_blank") {
          a.removeAttribute("target");
        }
      } else if (globalSemaLabels) {
        if (onclick.startsWith("handleTypstLocation")) {
          const [u, x, y] = onclick.split("(")[1].split(")")[0].split(",").slice(1).map((s) => Number.parseFloat(s.trim()));
          for (const [label, _dom, pos] of globalSemaLabels) {
            const [u1, x1, y1] = pos;
            if (u === u1 && Math.abs(x - x1) < 0.01 && Math.abs(y - y1) < 0.01) {
              a.id = `typst-label-${label}`;
              a.setAttribute("href", `#label-${label}`);
              a.setAttribute("xlink:href", `#label-${label}`);
              break;
            }
          }
        }
      }
    }
    const decodeTypstUrlc = (s) => s.split("-").map((s2) => {
      const n = Number.parseInt(s2);
      if (Number.isNaN(n)) {
        return s2;
      } else {
        return String.fromCharCode(n);
      }
    }).join("");
    const href = a.getAttribute("href") || a.getAttribute("xlink:href");
    if (href.startsWith("cross-link")) {
      const url = new URL(href);
      const pathLabelUnicodes = url.searchParams.get("path-label");
      const labelUnicodes = url.searchParams.get("label");
      const plb = decodeTypstUrlc(pathLabelUnicodes).replace(".typ", ".html").replace(/^\//g, "");
      let absolutePath = window.typstPathToRoot ? window.typstPathToRoot.replace(/\/$/g, "") : "";
      absolutePath = new URL(`${absolutePath}/${plb}`, window.location.href).href;
      if (labelUnicodes) {
        absolutePath += "#label-" + encodeURIComponent(decodeTypstUrlc(labelUnicodes));
      }
      a.setAttribute("href", absolutePath);
      a.setAttribute("xlink:href", absolutePath);
    }
  });
  if (window.location.hash && !jumppedCrossLink) {
    const hash = window.location.hash;
    const firstSep = hash.indexOf("-");
    if (firstSep != -1 && hash.slice(0, firstSep) === "#label") {
      const labelTarget = hash.slice(firstSep + 1);
      for (const [label, dom, pos] of globalSemaLabels) {
        if (label === labelTarget) {
          const [_, x, y] = pos;
          window.handleTypstLocation(dom, 1, x, y, {
            behavior: initialRender ? "smooth" : "instant"
          });
          initialRender = false;
          jumppedCrossLink = true;
          break;
        }
      }
    }
  }
}
let prevHovers = void 0;
function updateHovers(elems) {
  if (prevHovers) {
    for (const h of prevHovers) {
      h.classList.remove("focus");
    }
  }
  prevHovers = elems;
}
let globalSemaLabels = [];
function findLinkInSvg(r, xy) {
  const bbox = r.getBoundingClientRect();
  if (xy[0] < bbox.left - 1 || xy[0] > bbox.right + 1 || xy[1] < bbox.top - 1 || xy[1] > bbox.bottom + 1) {
    return;
  }
  if (r.classList.contains("pseudo-link")) {
    return r;
  }
  for (let i = 0; i < r.children.length; i++) {
    const a = findLinkInSvg(r.children[i], xy);
    if (a) {
      return a;
    }
  }
  return void 0;
}
const findAncestor = (el, cls) => {
  while (el && !el.classList.contains(cls))
    el = el.parentElement;
  return el;
};
window.typstBookRenderPage = function(plugin, relPath, appContainer) {
  const getTheme = () => window.getTypstTheme();
  let currTheme = getTheme();
  let session = void 0;
  let dom = void 0;
  let disposeSession = () => {
  };
  const appElem = document.createElement("div");
  if (appElem && appContainer) {
    appElem.className = "typst-app";
    appContainer.appendChild(appElem);
  }
  const dec = new TextDecoder();
  window.typstBindSvgDom = async (_elem, _dom) => {
  };
  let runningSemantics = {};
  const typstBindCustomSemantics = async (root, svg, semantics) => {
    const index = root == null ? void 0 : root.getAttribute("data-index");
    const key = `${index}`;
    const width = root == null ? void 0 : root.getAttribute("data-width");
    const keyResolving = `${width}`;
    if (runningSemantics[key] === keyResolving) {
      return;
    }
    runningSemantics[key] = keyResolving;
    console.log("bind custom semantics", key, keyResolving, svg == null ? void 0 : svg.viewBox);
    const customs = await plugin.getCustomV1({
      renderSession: session
    });
    const semaLabel = customs.find((k) => k[0] === "sema-label");
    if (semaLabel) {
      const labelBin = semaLabel[1];
      const labels = JSON.parse(dec.decode(labelBin));
      globalSemaLabels = labels.map(([label, pos]) => {
        const [_, u, x, y] = pos.split(/[pxy]/).map(Number.parseFloat);
        return [encodeURIComponent(label), svg, [u, x, y]];
      });
    }
    postProcessCrossLinks(semantics, 100);
  };
  let semanticHandlers = [];
  window.typstBindCustomSemantics = (root, svg, semantics) => setTimeout(() => {
    const semanticHandler = () => {
      typstBindCustomSemantics(root, svg, semantics);
    };
    semanticHandler();
    semanticHandlers.push(semanticHandler);
  }, 0);
  const baseHandleTypstLocation = window.handleTypstLocation;
  window.handleTypstLocation = (elem, page, x, y, options) => {
    const docRoot = findAncestor(elem, "typst-app");
    if (!docRoot) {
      console.warn("no typst-app found", elem);
      return;
    }
    console.log(docRoot);
    options = options || {};
    options.isDom = true;
    for (const h of docRoot.children) {
      if (h.classList.contains("typst-dom-page")) {
        const idx = Number.parseInt(h.getAttribute("data-index"));
        if (idx + 1 === page) {
          const svg = h.querySelector(".typst-svg-page");
          if (svg) {
            baseHandleTypstLocation(svg, page, x, y, options);
          }
          return;
        }
      }
    }
  };
  window.assignSemaHash = (u, x, y) => {
    var _a;
    for (const [label, dom2, pos] of globalSemaLabels) {
      const [u1, x1, y1] = pos;
      if (u === u1 && Math.abs(x - x1) < 0.01 && Math.abs(y - y1) < 0.01) {
        location.hash = `label-${label}`;
        (_a = window.typstCheckAndRerender) == null ? void 0 : _a.call(window, false, new Error("assignSemaHash")).then(() => {
          const width = dom2.viewBox.baseVal.width;
          const height = dom2.viewBox.baseVal.height;
          const bbox = dom2.getBoundingClientRect();
          const domX1 = bbox.left + x1 / width * bbox.width;
          const domY1 = bbox.top + y1 / height * bbox.height;
          const lnk = findLinkInSvg(dom2, [domX1, domY1]);
          if (!lnk) {
            return;
          }
          const relatedElems = window.typstGetRelatedElements(lnk);
          for (const h of relatedElems) {
            h.classList.add("focus");
          }
          updateHovers(relatedElems);
          return;
        });
        return;
      }
    }
    updateHovers([]);
    location.hash = `loc-${u}x${x.toFixed(2)}x${y.toFixed(2)}`;
  };
  async function reloadArtifact(theme) {
    if (dom) {
      dom.dispose();
      dom = void 0;
    }
    if (session) {
      disposeSession();
      session = void 0;
    }
    appElem.innerHTML = "";
    appElem.removeAttribute("data-applied-width");
    const artifactData = await fetch(`${relPath}.${theme}.multi.sir.in`).then((response) => response.arrayBuffer()).then((buffer) => new Uint8Array(buffer));
    const t1 = performance.now();
    return new Promise((resolve) => {
      return plugin.runWithSession((sessionRef) => {
        return new Promise(async (doDisposeSession) => {
          disposeSession = doDisposeSession;
          session = sessionRef;
          const t2 = performance.now();
          jumppedCrossLink = false;
          semanticHandlers.splice(0, semanticHandlers.length);
          runningSemantics = {};
          dom = await plugin.renderDom({
            renderSession: sessionRef,
            container: appElem,
            pixelPerPt: 4.5
          });
          const mod = dom.impl.modes.find(([k, _]) => k == "dom");
          const postRender = mod[1].postRender;
          mod[1].postRender = function() {
            console.log("hack run semantic handlers");
            postRender.apply(this);
            for (const h of semanticHandlers) {
              h();
            }
            return;
          };
          console.log(
            `theme = ${theme}, load artifact took ${t2 - t1} milliseconds, parse artifact took ${t2 - t1} milliseconds`
          );
          dom.addChangement(["new", artifactData]);
          resolve(dom);
        });
      });
    });
  }
  reloadArtifact(currTheme).then((dom2) => {
    let base = Promise.resolve();
    window.typstChangeTheme = () => {
      const nextTheme = getTheme();
      if (nextTheme === currTheme) {
        return base;
      }
      currTheme = nextTheme;
      return reloadArtifact(currTheme);
    };
    const viewportHandler = () => dom2.addViewportChange();
    window.addEventListener("resize", viewportHandler);
    window.addEventListener("scroll", viewportHandler);
    dom2.impl.disposeList.push(() => {
      window.removeEventListener("resize", viewportHandler);
      window.removeEventListener("scroll", viewportHandler);
    });
    window.typstRerender = viewportHandler;
    window.typstChangeTheme();
  });
};
let wasm;
const heap = new Array(128).fill(void 0);
heap.push(void 0, null, true, false);
function getObject(idx) {
  return heap[idx];
}
let heap_next = heap.length;
function dropObject(idx) {
  if (idx < 132)
    return;
  heap[idx] = heap_next;
  heap_next = idx;
}
function takeObject(idx) {
  const ret = getObject(idx);
  dropObject(idx);
  return ret;
}
function addHeapObject(obj) {
  if (heap_next === heap.length)
    heap.push(heap.length + 1);
  const idx = heap_next;
  heap_next = heap[idx];
  if (typeof heap_next !== "number")
    throw new Error("corrupt heap");
  heap[idx] = obj;
  return idx;
}
const cachedTextDecoder = typeof TextDecoder !== "undefined" ? new TextDecoder("utf-8", { ignoreBOM: true, fatal: true }) : { decode: () => {
  throw Error("TextDecoder not available");
} };
if (typeof TextDecoder !== "undefined") {
  cachedTextDecoder.decode();
}
let cachedUint8Memory0 = null;
function getUint8Memory0() {
  if (cachedUint8Memory0 === null || cachedUint8Memory0.byteLength === 0) {
    cachedUint8Memory0 = new Uint8Array(wasm.memory.buffer);
  }
  return cachedUint8Memory0;
}
function getStringFromWasm0(ptr, len) {
  ptr = ptr >>> 0;
  return cachedTextDecoder.decode(getUint8Memory0().subarray(ptr, ptr + len));
}
function _assertBoolean(n) {
  if (typeof n !== "boolean") {
    throw new Error(`expected a boolean argument, found ${typeof n}`);
  }
}
let WASM_VECTOR_LEN = 0;
const cachedTextEncoder = typeof TextEncoder !== "undefined" ? new TextEncoder("utf-8") : { encode: () => {
  throw Error("TextEncoder not available");
} };
const encodeString = typeof cachedTextEncoder.encodeInto === "function" ? function(arg, view) {
  return cachedTextEncoder.encodeInto(arg, view);
} : function(arg, view) {
  const buf = cachedTextEncoder.encode(arg);
  view.set(buf);
  return {
    read: arg.length,
    written: buf.length
  };
};
function passStringToWasm0(arg, malloc, realloc) {
  if (typeof arg !== "string")
    throw new Error(`expected a string argument, found ${typeof arg}`);
  if (realloc === void 0) {
    const buf = cachedTextEncoder.encode(arg);
    const ptr2 = malloc(buf.length, 1) >>> 0;
    getUint8Memory0().subarray(ptr2, ptr2 + buf.length).set(buf);
    WASM_VECTOR_LEN = buf.length;
    return ptr2;
  }
  let len = arg.length;
  let ptr = malloc(len, 1) >>> 0;
  const mem = getUint8Memory0();
  let offset = 0;
  for (; offset < len; offset++) {
    const code = arg.charCodeAt(offset);
    if (code > 127)
      break;
    mem[ptr + offset] = code;
  }
  if (offset !== len) {
    if (offset !== 0) {
      arg = arg.slice(offset);
    }
    ptr = realloc(ptr, len, len = offset + arg.length * 3, 1) >>> 0;
    const view = getUint8Memory0().subarray(ptr + offset, ptr + len);
    const ret = encodeString(arg, view);
    if (ret.read !== arg.length)
      throw new Error("failed to pass whole string");
    offset += ret.written;
    ptr = realloc(ptr, len, offset, 1) >>> 0;
  }
  WASM_VECTOR_LEN = offset;
  return ptr;
}
function isLikeNone(x) {
  return x === void 0 || x === null;
}
let cachedInt32Memory0 = null;
function getInt32Memory0() {
  if (cachedInt32Memory0 === null || cachedInt32Memory0.byteLength === 0) {
    cachedInt32Memory0 = new Int32Array(wasm.memory.buffer);
  }
  return cachedInt32Memory0;
}
function debugString(val) {
  const type = typeof val;
  if (type == "number" || type == "boolean" || val == null) {
    return `${val}`;
  }
  if (type == "string") {
    return `"${val}"`;
  }
  if (type == "symbol") {
    const description = val.description;
    if (description == null) {
      return "Symbol";
    } else {
      return `Symbol(${description})`;
    }
  }
  if (type == "function") {
    const name = val.name;
    if (typeof name == "string" && name.length > 0) {
      return `Function(${name})`;
    } else {
      return "Function";
    }
  }
  if (Array.isArray(val)) {
    const length = val.length;
    let debug = "[";
    if (length > 0) {
      debug += debugString(val[0]);
    }
    for (let i = 1; i < length; i++) {
      debug += ", " + debugString(val[i]);
    }
    debug += "]";
    return debug;
  }
  const builtInMatches = /\[object ([^\]]+)\]/.exec(toString.call(val));
  let className;
  if (builtInMatches.length > 1) {
    className = builtInMatches[1];
  } else {
    return toString.call(val);
  }
  if (className == "Object") {
    try {
      return "Object(" + JSON.stringify(val) + ")";
    } catch (_) {
      return "Object";
    }
  }
  if (val instanceof Error) {
    return `${val.name}: ${val.message}
${val.stack}`;
  }
  return className;
}
const CLOSURE_DTORS = typeof FinalizationRegistry === "undefined" ? { register: () => {
}, unregister: () => {
} } : new FinalizationRegistry((state) => {
  wasm.__wbindgen_export_2.get(state.dtor)(state.a, state.b);
});
function makeClosure(arg0, arg1, dtor, f) {
  const state = { a: arg0, b: arg1, cnt: 1, dtor };
  const real = (...args) => {
    state.cnt++;
    try {
      return f(state.a, state.b, ...args);
    } finally {
      if (--state.cnt === 0) {
        wasm.__wbindgen_export_2.get(state.dtor)(state.a, state.b);
        state.a = 0;
        CLOSURE_DTORS.unregister(state);
      }
    }
  };
  real.original = state;
  CLOSURE_DTORS.register(real, state, state);
  return real;
}
function logError(f, args) {
  try {
    return f.apply(this, args);
  } catch (e) {
    let error = function() {
      try {
        return e instanceof Error ? `${e.message}

Stack:
${e.stack}` : e.toString();
      } catch (_) {
        return "<failed to stringify thrown value>";
      }
    }();
    console.error("wasm-bindgen: imported JS function that was not marked as `catch` threw an error:", error);
    throw e;
  }
}
function _assertNum(n) {
  if (typeof n !== "number")
    throw new Error(`expected a number argument, found ${typeof n}`);
}
function __wbg_adapter_24(arg0, arg1) {
  _assertNum(arg0);
  _assertNum(arg1);
  wasm._dyn_core__ops__function__Fn_____Output___R_as_wasm_bindgen__closure__WasmClosure___describe__invoke__hce7bf9800e751a54(arg0, arg1);
}
function __wbg_adapter_27(arg0, arg1, arg2) {
  _assertNum(arg0);
  _assertNum(arg1);
  wasm._dyn_core__ops__function__Fn__A____Output___R_as_wasm_bindgen__closure__WasmClosure___describe__invoke__h913d274527c8432d(arg0, arg1, addHeapObject(arg2));
}
function makeMutClosure(arg0, arg1, dtor, f) {
  const state = { a: arg0, b: arg1, cnt: 1, dtor };
  const real = (...args) => {
    state.cnt++;
    const a = state.a;
    state.a = 0;
    try {
      return f(a, state.b, ...args);
    } finally {
      if (--state.cnt === 0) {
        wasm.__wbindgen_export_2.get(state.dtor)(a, state.b);
        CLOSURE_DTORS.unregister(state);
      } else {
        state.a = a;
      }
    }
  };
  real.original = state;
  CLOSURE_DTORS.register(real, state, state);
  return real;
}
function __wbg_adapter_30(arg0, arg1, arg2) {
  _assertNum(arg0);
  _assertNum(arg1);
  wasm._dyn_core__ops__function__FnMut__A____Output___R_as_wasm_bindgen__closure__WasmClosure___describe__invoke__hfe2910b9a2a1745b(arg0, arg1, addHeapObject(arg2));
}
function renderer_build_info() {
  const ret = wasm.renderer_build_info();
  return takeObject(ret);
}
function _assertClass(instance, klass) {
  if (!(instance instanceof klass)) {
    throw new Error(`expected instance of ${klass.name}`);
  }
  return instance.ptr;
}
function passArray8ToWasm0(arg, malloc) {
  const ptr = malloc(arg.length * 1, 1) >>> 0;
  getUint8Memory0().set(arg, ptr / 1);
  WASM_VECTOR_LEN = arg.length;
  return ptr;
}
let cachedFloat32Memory0 = null;
function getFloat32Memory0() {
  if (cachedFloat32Memory0 === null || cachedFloat32Memory0.byteLength === 0) {
    cachedFloat32Memory0 = new Float32Array(wasm.memory.buffer);
  }
  return cachedFloat32Memory0;
}
let cachedUint32Memory0 = null;
function getUint32Memory0() {
  if (cachedUint32Memory0 === null || cachedUint32Memory0.byteLength === 0) {
    cachedUint32Memory0 = new Uint32Array(wasm.memory.buffer);
  }
  return cachedUint32Memory0;
}
function passArray32ToWasm0(arg, malloc) {
  const ptr = malloc(arg.length * 4, 4) >>> 0;
  getUint32Memory0().set(arg, ptr / 4);
  WASM_VECTOR_LEN = arg.length;
  return ptr;
}
function handleError(f, args) {
  try {
    return f.apply(this, args);
  } catch (e) {
    wasm.__wbindgen_exn_store(addHeapObject(e));
  }
}
function __wbg_adapter_109(arg0, arg1, arg2, arg3) {
  _assertNum(arg0);
  _assertNum(arg1);
  wasm.wasm_bindgen__convert__closures__invoke2_mut__h097e8552da6a2ca4(arg0, arg1, addHeapObject(arg2), addHeapObject(arg3));
}
const CreateSessionOptionsFinalization = typeof FinalizationRegistry === "undefined" ? { register: () => {
}, unregister: () => {
} } : new FinalizationRegistry((ptr) => wasm.__wbg_createsessionoptions_free(ptr >>> 0));
class CreateSessionOptions {
  __destroy_into_raw() {
    const ptr = this.__wbg_ptr;
    this.__wbg_ptr = 0;
    CreateSessionOptionsFinalization.unregister(this);
    return ptr;
  }
  free() {
    const ptr = this.__destroy_into_raw();
    wasm.__wbg_createsessionoptions_free(ptr);
  }
  /**
  */
  constructor() {
    const ret = wasm.createsessionoptions_new();
    this.__wbg_ptr = ret >>> 0;
    return this;
  }
  /**
  * @param {string} format
  */
  set format(format) {
    if (this.__wbg_ptr == 0)
      throw new Error("Attempt to use a moved value");
    _assertNum(this.__wbg_ptr);
    const ptr0 = passStringToWasm0(format, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    const len0 = WASM_VECTOR_LEN;
    wasm.createsessionoptions_set_format(this.__wbg_ptr, ptr0, len0);
  }
  /**
  * @param {Uint8Array} artifact_content
  */
  set artifact_content(artifact_content) {
    if (this.__wbg_ptr == 0)
      throw new Error("Attempt to use a moved value");
    _assertNum(this.__wbg_ptr);
    const ptr0 = passArray8ToWasm0(artifact_content, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    wasm.createsessionoptions_set_artifact_content(this.__wbg_ptr, ptr0, len0);
  }
}
const IncrDomDocClientFinalization = typeof FinalizationRegistry === "undefined" ? { register: () => {
}, unregister: () => {
} } : new FinalizationRegistry((ptr) => wasm.__wbg_incrdomdocclient_free(ptr >>> 0));
class IncrDomDocClient {
  constructor() {
    throw new Error("cannot invoke `new` directly");
  }
  static __wrap(ptr) {
    ptr = ptr >>> 0;
    const obj = Object.create(IncrDomDocClient.prototype);
    obj.__wbg_ptr = ptr;
    IncrDomDocClientFinalization.register(obj, obj.__wbg_ptr, obj);
    return obj;
  }
  __destroy_into_raw() {
    const ptr = this.__wbg_ptr;
    this.__wbg_ptr = 0;
    IncrDomDocClientFinalization.unregister(this);
    return ptr;
  }
  free() {
    const ptr = this.__destroy_into_raw();
    wasm.__wbg_incrdomdocclient_free(ptr);
  }
  /**
  * @param {any} functions
  */
  bind_functions(functions) {
    if (this.__wbg_ptr == 0)
      throw new Error("Attempt to use a moved value");
    _assertNum(this.__wbg_ptr);
    wasm.incrdomdocclient_bind_functions(this.__wbg_ptr, addHeapObject(functions));
  }
  /**
  * Relayout the document in the given window.
  * @param {number} x
  * @param {number} y
  * @param {number} w
  * @param {number} h
  * @returns {Promise<boolean>}
  */
  relayout(x, y, w, h) {
    if (this.__wbg_ptr == 0)
      throw new Error("Attempt to use a moved value");
    _assertNum(this.__wbg_ptr);
    const ret = wasm.incrdomdocclient_relayout(this.__wbg_ptr, x, y, w, h);
    return takeObject(ret);
  }
  /**
  * @param {number} page_num
  * @param {number} x
  * @param {number} y
  * @param {number} w
  * @param {number} h
  * @param {number} stage
  * @returns {boolean}
  */
  need_repaint(page_num, x, y, w, h, stage) {
    try {
      if (this.__wbg_ptr == 0)
        throw new Error("Attempt to use a moved value");
      const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
      _assertNum(this.__wbg_ptr);
      _assertNum(page_num);
      _assertNum(stage);
      wasm.incrdomdocclient_need_repaint(retptr, this.__wbg_ptr, page_num, x, y, w, h, stage);
      var r0 = getInt32Memory0()[retptr / 4 + 0];
      var r1 = getInt32Memory0()[retptr / 4 + 1];
      var r2 = getInt32Memory0()[retptr / 4 + 2];
      if (r2) {
        throw takeObject(r1);
      }
      return r0 !== 0;
    } finally {
      wasm.__wbindgen_add_to_stack_pointer(16);
    }
  }
  /**
  * @param {number} page_num
  * @param {number} x
  * @param {number} y
  * @param {number} w
  * @param {number} h
  * @param {number} stage
  * @returns {any}
  */
  repaint(page_num, x, y, w, h, stage) {
    try {
      if (this.__wbg_ptr == 0)
        throw new Error("Attempt to use a moved value");
      const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
      _assertNum(this.__wbg_ptr);
      _assertNum(page_num);
      _assertNum(stage);
      wasm.incrdomdocclient_repaint(retptr, this.__wbg_ptr, page_num, x, y, w, h, stage);
      var r0 = getInt32Memory0()[retptr / 4 + 0];
      var r1 = getInt32Memory0()[retptr / 4 + 1];
      var r2 = getInt32Memory0()[retptr / 4 + 2];
      if (r2) {
        throw takeObject(r1);
      }
      return takeObject(r0);
    } finally {
      wasm.__wbindgen_add_to_stack_pointer(16);
    }
  }
}
const PageInfoFinalization = typeof FinalizationRegistry === "undefined" ? { register: () => {
}, unregister: () => {
} } : new FinalizationRegistry((ptr) => wasm.__wbg_pageinfo_free(ptr >>> 0));
class PageInfo {
  constructor() {
    throw new Error("cannot invoke `new` directly");
  }
  static __wrap(ptr) {
    ptr = ptr >>> 0;
    const obj = Object.create(PageInfo.prototype);
    obj.__wbg_ptr = ptr;
    PageInfoFinalization.register(obj, obj.__wbg_ptr, obj);
    return obj;
  }
  __destroy_into_raw() {
    const ptr = this.__wbg_ptr;
    this.__wbg_ptr = 0;
    PageInfoFinalization.unregister(this);
    return ptr;
  }
  free() {
    const ptr = this.__destroy_into_raw();
    wasm.__wbg_pageinfo_free(ptr);
  }
  /**
  * @returns {number}
  */
  get page_off() {
    if (this.__wbg_ptr == 0)
      throw new Error("Attempt to use a moved value");
    _assertNum(this.__wbg_ptr);
    const ret = wasm.pageinfo_page_off(this.__wbg_ptr);
    return ret >>> 0;
  }
  /**
  * @returns {number}
  */
  get width_pt() {
    if (this.__wbg_ptr == 0)
      throw new Error("Attempt to use a moved value");
    _assertNum(this.__wbg_ptr);
    const ret = wasm.pageinfo_width_pt(this.__wbg_ptr);
    return ret;
  }
  /**
  * @returns {number}
  */
  get height_pt() {
    if (this.__wbg_ptr == 0)
      throw new Error("Attempt to use a moved value");
    _assertNum(this.__wbg_ptr);
    const ret = wasm.pageinfo_height_pt(this.__wbg_ptr);
    return ret;
  }
}
const PagesInfoFinalization = typeof FinalizationRegistry === "undefined" ? { register: () => {
}, unregister: () => {
} } : new FinalizationRegistry((ptr) => wasm.__wbg_pagesinfo_free(ptr >>> 0));
class PagesInfo {
  constructor() {
    throw new Error("cannot invoke `new` directly");
  }
  static __wrap(ptr) {
    ptr = ptr >>> 0;
    const obj = Object.create(PagesInfo.prototype);
    obj.__wbg_ptr = ptr;
    PagesInfoFinalization.register(obj, obj.__wbg_ptr, obj);
    return obj;
  }
  __destroy_into_raw() {
    const ptr = this.__wbg_ptr;
    this.__wbg_ptr = 0;
    PagesInfoFinalization.unregister(this);
    return ptr;
  }
  free() {
    const ptr = this.__destroy_into_raw();
    wasm.__wbg_pagesinfo_free(ptr);
  }
  /**
  * @returns {number}
  */
  get page_count() {
    if (this.__wbg_ptr == 0)
      throw new Error("Attempt to use a moved value");
    _assertNum(this.__wbg_ptr);
    const ret = wasm.pagesinfo_page_count(this.__wbg_ptr);
    return ret >>> 0;
  }
  /**
  * @param {number} num
  * @returns {PageInfo | undefined}
  */
  page_by_number(num) {
    if (this.__wbg_ptr == 0)
      throw new Error("Attempt to use a moved value");
    _assertNum(this.__wbg_ptr);
    _assertNum(num);
    const ret = wasm.pagesinfo_page_by_number(this.__wbg_ptr, num);
    return ret === 0 ? void 0 : PageInfo.__wrap(ret);
  }
  /**
  * @param {number} i
  * @returns {PageInfo}
  */
  page(i) {
    if (this.__wbg_ptr == 0)
      throw new Error("Attempt to use a moved value");
    _assertNum(this.__wbg_ptr);
    _assertNum(i);
    const ret = wasm.pagesinfo_page(this.__wbg_ptr, i);
    return PageInfo.__wrap(ret);
  }
  /**
  * @returns {number}
  */
  width() {
    if (this.__wbg_ptr == 0)
      throw new Error("Attempt to use a moved value");
    _assertNum(this.__wbg_ptr);
    const ret = wasm.pagesinfo_width(this.__wbg_ptr);
    return ret;
  }
  /**
  * @returns {number}
  */
  height() {
    if (this.__wbg_ptr == 0)
      throw new Error("Attempt to use a moved value");
    _assertNum(this.__wbg_ptr);
    const ret = wasm.pagesinfo_height(this.__wbg_ptr);
    return ret;
  }
}
const RenderPageImageOptionsFinalization = typeof FinalizationRegistry === "undefined" ? { register: () => {
}, unregister: () => {
} } : new FinalizationRegistry((ptr) => wasm.__wbg_renderpageimageoptions_free(ptr >>> 0));
class RenderPageImageOptions {
  __destroy_into_raw() {
    const ptr = this.__wbg_ptr;
    this.__wbg_ptr = 0;
    RenderPageImageOptionsFinalization.unregister(this);
    return ptr;
  }
  free() {
    const ptr = this.__destroy_into_raw();
    wasm.__wbg_renderpageimageoptions_free(ptr);
  }
  /**
  */
  constructor() {
    const ret = wasm.renderpageimageoptions_new();
    this.__wbg_ptr = ret >>> 0;
    return this;
  }
  /**
  * @returns {number | undefined}
  */
  get page_off() {
    try {
      if (this.__wbg_ptr == 0)
        throw new Error("Attempt to use a moved value");
      const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
      _assertNum(this.__wbg_ptr);
      wasm.renderpageimageoptions_page_off(retptr, this.__wbg_ptr);
      var r0 = getInt32Memory0()[retptr / 4 + 0];
      var r1 = getInt32Memory0()[retptr / 4 + 1];
      return r0 === 0 ? void 0 : r1 >>> 0;
    } finally {
      wasm.__wbindgen_add_to_stack_pointer(16);
    }
  }
  /**
  * @param {number | undefined} [page_off]
  */
  set page_off(page_off) {
    if (this.__wbg_ptr == 0)
      throw new Error("Attempt to use a moved value");
    _assertNum(this.__wbg_ptr);
    if (!isLikeNone(page_off)) {
      _assertNum(page_off);
    }
    wasm.renderpageimageoptions_set_page_off(this.__wbg_ptr, !isLikeNone(page_off), isLikeNone(page_off) ? 0 : page_off);
  }
  /**
  * @returns {string | undefined}
  */
  get cache_key() {
    try {
      if (this.__wbg_ptr == 0)
        throw new Error("Attempt to use a moved value");
      const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
      _assertNum(this.__wbg_ptr);
      wasm.renderpageimageoptions_cache_key(retptr, this.__wbg_ptr);
      var r0 = getInt32Memory0()[retptr / 4 + 0];
      var r1 = getInt32Memory0()[retptr / 4 + 1];
      let v1;
      if (r0 !== 0) {
        v1 = getStringFromWasm0(r0, r1).slice();
        wasm.__wbindgen_free(r0, r1 * 1, 1);
      }
      return v1;
    } finally {
      wasm.__wbindgen_add_to_stack_pointer(16);
    }
  }
  /**
  * @param {string | undefined} [cache_key]
  */
  set cache_key(cache_key) {
    if (this.__wbg_ptr == 0)
      throw new Error("Attempt to use a moved value");
    _assertNum(this.__wbg_ptr);
    var ptr0 = isLikeNone(cache_key) ? 0 : passStringToWasm0(cache_key, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    var len0 = WASM_VECTOR_LEN;
    wasm.renderpageimageoptions_set_cache_key(this.__wbg_ptr, ptr0, len0);
  }
  /**
  * @returns {number | undefined}
  */
  get data_selection() {
    try {
      if (this.__wbg_ptr == 0)
        throw new Error("Attempt to use a moved value");
      const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
      _assertNum(this.__wbg_ptr);
      wasm.renderpageimageoptions_data_selection(retptr, this.__wbg_ptr);
      var r0 = getInt32Memory0()[retptr / 4 + 0];
      var r1 = getInt32Memory0()[retptr / 4 + 1];
      return r0 === 0 ? void 0 : r1 >>> 0;
    } finally {
      wasm.__wbindgen_add_to_stack_pointer(16);
    }
  }
  /**
  * @param {number | undefined} [data_selection]
  */
  set data_selection(data_selection) {
    if (this.__wbg_ptr == 0)
      throw new Error("Attempt to use a moved value");
    _assertNum(this.__wbg_ptr);
    if (!isLikeNone(data_selection)) {
      _assertNum(data_selection);
    }
    wasm.renderpageimageoptions_set_data_selection(this.__wbg_ptr, !isLikeNone(data_selection), isLikeNone(data_selection) ? 0 : data_selection);
  }
}
const RenderSessionFinalization = typeof FinalizationRegistry === "undefined" ? { register: () => {
}, unregister: () => {
} } : new FinalizationRegistry((ptr) => wasm.__wbg_rendersession_free(ptr >>> 0));
class RenderSession2 {
  constructor() {
    throw new Error("cannot invoke `new` directly");
  }
  static __wrap(ptr) {
    ptr = ptr >>> 0;
    const obj = Object.create(RenderSession2.prototype);
    obj.__wbg_ptr = ptr;
    RenderSessionFinalization.register(obj, obj.__wbg_ptr, obj);
    return obj;
  }
  __destroy_into_raw() {
    const ptr = this.__wbg_ptr;
    this.__wbg_ptr = 0;
    RenderSessionFinalization.unregister(this);
    return ptr;
  }
  free() {
    const ptr = this.__destroy_into_raw();
    wasm.__wbg_rendersession_free(ptr);
  }
  /**
  * @param {number} rect_lo_x
  * @param {number} rect_lo_y
  * @param {number} rect_hi_x
  * @param {number} rect_hi_y
  * @returns {string}
  */
  render_in_window(rect_lo_x, rect_lo_y, rect_hi_x, rect_hi_y) {
    let deferred1_0;
    let deferred1_1;
    try {
      if (this.__wbg_ptr == 0)
        throw new Error("Attempt to use a moved value");
      const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
      _assertNum(this.__wbg_ptr);
      wasm.rendersession_render_in_window(retptr, this.__wbg_ptr, rect_lo_x, rect_lo_y, rect_hi_x, rect_hi_y);
      var r0 = getInt32Memory0()[retptr / 4 + 0];
      var r1 = getInt32Memory0()[retptr / 4 + 1];
      deferred1_0 = r0;
      deferred1_1 = r1;
      return getStringFromWasm0(r0, r1);
    } finally {
      wasm.__wbindgen_add_to_stack_pointer(16);
      wasm.__wbindgen_free(deferred1_0, deferred1_1, 1);
    }
  }
  /**
  * @returns {number | undefined}
  */
  get pixel_per_pt() {
    try {
      if (this.__wbg_ptr == 0)
        throw new Error("Attempt to use a moved value");
      const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
      _assertNum(this.__wbg_ptr);
      wasm.rendersession_pixel_per_pt(retptr, this.__wbg_ptr);
      var r0 = getInt32Memory0()[retptr / 4 + 0];
      var r1 = getFloat32Memory0()[retptr / 4 + 1];
      return r0 === 0 ? void 0 : r1;
    } finally {
      wasm.__wbindgen_add_to_stack_pointer(16);
    }
  }
  /**
  * @param {number} pixel_per_pt
  */
  set pixel_per_pt(pixel_per_pt) {
    if (this.__wbg_ptr == 0)
      throw new Error("Attempt to use a moved value");
    _assertNum(this.__wbg_ptr);
    wasm.rendersession_set_pixel_per_pt(this.__wbg_ptr, pixel_per_pt);
  }
  /**
  * @returns {string | undefined}
  */
  get background_color() {
    try {
      if (this.__wbg_ptr == 0)
        throw new Error("Attempt to use a moved value");
      const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
      _assertNum(this.__wbg_ptr);
      wasm.rendersession_background_color(retptr, this.__wbg_ptr);
      var r0 = getInt32Memory0()[retptr / 4 + 0];
      var r1 = getInt32Memory0()[retptr / 4 + 1];
      let v1;
      if (r0 !== 0) {
        v1 = getStringFromWasm0(r0, r1).slice();
        wasm.__wbindgen_free(r0, r1 * 1, 1);
      }
      return v1;
    } finally {
      wasm.__wbindgen_add_to_stack_pointer(16);
    }
  }
  /**
  * @param {string} background_color
  */
  set background_color(background_color) {
    if (this.__wbg_ptr == 0)
      throw new Error("Attempt to use a moved value");
    _assertNum(this.__wbg_ptr);
    const ptr0 = passStringToWasm0(background_color, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    const len0 = WASM_VECTOR_LEN;
    wasm.rendersession_set_background_color(this.__wbg_ptr, ptr0, len0);
  }
  /**
  * @returns {PagesInfo}
  */
  get pages_info() {
    if (this.__wbg_ptr == 0)
      throw new Error("Attempt to use a moved value");
    _assertNum(this.__wbg_ptr);
    const ret = wasm.rendersession_pages_info(this.__wbg_ptr);
    return PagesInfo.__wrap(ret);
  }
  /**
  * @returns {number}
  */
  get doc_width() {
    if (this.__wbg_ptr == 0)
      throw new Error("Attempt to use a moved value");
    _assertNum(this.__wbg_ptr);
    const ret = wasm.rendersession_doc_width(this.__wbg_ptr);
    return ret;
  }
  /**
  * @returns {number}
  */
  get doc_height() {
    if (this.__wbg_ptr == 0)
      throw new Error("Attempt to use a moved value");
    _assertNum(this.__wbg_ptr);
    const ret = wasm.rendersession_doc_height(this.__wbg_ptr);
    return ret;
  }
  /**
  * @param {Uint32Array} path
  * @returns {string | undefined}
  */
  source_span(path) {
    try {
      if (this.__wbg_ptr == 0)
        throw new Error("Attempt to use a moved value");
      const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
      _assertNum(this.__wbg_ptr);
      const ptr0 = passArray32ToWasm0(path, wasm.__wbindgen_malloc);
      const len0 = WASM_VECTOR_LEN;
      wasm.rendersession_source_span(retptr, this.__wbg_ptr, ptr0, len0);
      var r0 = getInt32Memory0()[retptr / 4 + 0];
      var r1 = getInt32Memory0()[retptr / 4 + 1];
      var r2 = getInt32Memory0()[retptr / 4 + 2];
      var r3 = getInt32Memory0()[retptr / 4 + 3];
      if (r3) {
        throw takeObject(r2);
      }
      let v2;
      if (r0 !== 0) {
        v2 = getStringFromWasm0(r0, r1).slice();
        wasm.__wbindgen_free(r0, r1 * 1, 1);
      }
      return v2;
    } finally {
      wasm.__wbindgen_add_to_stack_pointer(16);
    }
  }
}
const RenderSessionOptionsFinalization = typeof FinalizationRegistry === "undefined" ? { register: () => {
}, unregister: () => {
} } : new FinalizationRegistry((ptr) => wasm.__wbg_rendersessionoptions_free(ptr >>> 0));
class RenderSessionOptions {
  __destroy_into_raw() {
    const ptr = this.__wbg_ptr;
    this.__wbg_ptr = 0;
    RenderSessionOptionsFinalization.unregister(this);
    return ptr;
  }
  free() {
    const ptr = this.__destroy_into_raw();
    wasm.__wbg_rendersessionoptions_free(ptr);
  }
  /**
  */
  constructor() {
    const ret = wasm.rendersessionoptions_new();
    this.__wbg_ptr = ret >>> 0;
    return this;
  }
  /**
  * @returns {number | undefined}
  */
  get pixel_per_pt() {
    try {
      if (this.__wbg_ptr == 0)
        throw new Error("Attempt to use a moved value");
      const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
      _assertNum(this.__wbg_ptr);
      wasm.rendersession_pixel_per_pt(retptr, this.__wbg_ptr);
      var r0 = getInt32Memory0()[retptr / 4 + 0];
      var r1 = getFloat32Memory0()[retptr / 4 + 1];
      return r0 === 0 ? void 0 : r1;
    } finally {
      wasm.__wbindgen_add_to_stack_pointer(16);
    }
  }
  /**
  * @param {number} pixel_per_pt
  */
  set pixel_per_pt(pixel_per_pt) {
    if (this.__wbg_ptr == 0)
      throw new Error("Attempt to use a moved value");
    _assertNum(this.__wbg_ptr);
    wasm.rendersession_set_pixel_per_pt(this.__wbg_ptr, pixel_per_pt);
  }
  /**
  * @returns {string | undefined}
  */
  get background_color() {
    try {
      if (this.__wbg_ptr == 0)
        throw new Error("Attempt to use a moved value");
      const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
      _assertNum(this.__wbg_ptr);
      wasm.rendersessionoptions_background_color(retptr, this.__wbg_ptr);
      var r0 = getInt32Memory0()[retptr / 4 + 0];
      var r1 = getInt32Memory0()[retptr / 4 + 1];
      let v1;
      if (r0 !== 0) {
        v1 = getStringFromWasm0(r0, r1).slice();
        wasm.__wbindgen_free(r0, r1 * 1, 1);
      }
      return v1;
    } finally {
      wasm.__wbindgen_add_to_stack_pointer(16);
    }
  }
  /**
  * @param {string} background_color
  */
  set background_color(background_color) {
    if (this.__wbg_ptr == 0)
      throw new Error("Attempt to use a moved value");
    _assertNum(this.__wbg_ptr);
    const ptr0 = passStringToWasm0(background_color, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    const len0 = WASM_VECTOR_LEN;
    wasm.rendersessionoptions_set_background_color(this.__wbg_ptr, ptr0, len0);
  }
  /**
  * @returns {string | undefined}
  */
  get format() {
    try {
      if (this.__wbg_ptr == 0)
        throw new Error("Attempt to use a moved value");
      const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
      _assertNum(this.__wbg_ptr);
      wasm.rendersession_background_color(retptr, this.__wbg_ptr);
      var r0 = getInt32Memory0()[retptr / 4 + 0];
      var r1 = getInt32Memory0()[retptr / 4 + 1];
      let v1;
      if (r0 !== 0) {
        v1 = getStringFromWasm0(r0, r1).slice();
        wasm.__wbindgen_free(r0, r1 * 1, 1);
      }
      return v1;
    } finally {
      wasm.__wbindgen_add_to_stack_pointer(16);
    }
  }
  /**
  * @param {string} format
  */
  set format(format) {
    if (this.__wbg_ptr == 0)
      throw new Error("Attempt to use a moved value");
    _assertNum(this.__wbg_ptr);
    const ptr0 = passStringToWasm0(format, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    const len0 = WASM_VECTOR_LEN;
    wasm.rendersession_set_background_color(this.__wbg_ptr, ptr0, len0);
  }
}
const TypstRendererFinalization = typeof FinalizationRegistry === "undefined" ? { register: () => {
}, unregister: () => {
} } : new FinalizationRegistry((ptr) => wasm.__wbg_typstrenderer_free(ptr >>> 0));
class TypstRenderer {
  static __wrap(ptr) {
    ptr = ptr >>> 0;
    const obj = Object.create(TypstRenderer.prototype);
    obj.__wbg_ptr = ptr;
    TypstRendererFinalization.register(obj, obj.__wbg_ptr, obj);
    return obj;
  }
  __destroy_into_raw() {
    const ptr = this.__wbg_ptr;
    this.__wbg_ptr = 0;
    TypstRendererFinalization.unregister(this);
    return ptr;
  }
  free() {
    const ptr = this.__destroy_into_raw();
    wasm.__wbg_typstrenderer_free(ptr);
  }
  /**
  */
  constructor() {
    const ret = wasm.typstrenderer_new();
    this.__wbg_ptr = ret >>> 0;
    return this;
  }
  /**
  * @param {CreateSessionOptions | undefined} [options]
  * @returns {RenderSession}
  */
  create_session(options) {
    try {
      if (this.__wbg_ptr == 0)
        throw new Error("Attempt to use a moved value");
      const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
      _assertNum(this.__wbg_ptr);
      let ptr0 = 0;
      if (!isLikeNone(options)) {
        _assertClass(options, CreateSessionOptions);
        if (options.__wbg_ptr === 0) {
          throw new Error("Attempt to use a moved value");
        }
        ptr0 = options.__destroy_into_raw();
      }
      wasm.typstrenderer_create_session(retptr, this.__wbg_ptr, ptr0);
      var r0 = getInt32Memory0()[retptr / 4 + 0];
      var r1 = getInt32Memory0()[retptr / 4 + 1];
      var r2 = getInt32Memory0()[retptr / 4 + 2];
      if (r2) {
        throw takeObject(r1);
      }
      return RenderSession2.__wrap(r0);
    } finally {
      wasm.__wbindgen_add_to_stack_pointer(16);
    }
  }
  /**
  * @param {RenderSession} session
  */
  reset(session) {
    try {
      if (this.__wbg_ptr == 0)
        throw new Error("Attempt to use a moved value");
      const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
      _assertNum(this.__wbg_ptr);
      _assertClass(session, RenderSession2);
      if (session.__wbg_ptr === 0) {
        throw new Error("Attempt to use a moved value");
      }
      wasm.typstrenderer_reset(retptr, this.__wbg_ptr, session.__wbg_ptr);
      var r0 = getInt32Memory0()[retptr / 4 + 0];
      var r1 = getInt32Memory0()[retptr / 4 + 1];
      if (r1) {
        throw takeObject(r0);
      }
    } finally {
      wasm.__wbindgen_add_to_stack_pointer(16);
    }
  }
  /**
  * @param {RenderSession} session
  * @param {string} action
  * @param {Uint8Array} data
  */
  manipulate_data(session, action, data) {
    try {
      if (this.__wbg_ptr == 0)
        throw new Error("Attempt to use a moved value");
      const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
      _assertNum(this.__wbg_ptr);
      _assertClass(session, RenderSession2);
      if (session.__wbg_ptr === 0) {
        throw new Error("Attempt to use a moved value");
      }
      const ptr0 = passStringToWasm0(action, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
      const len0 = WASM_VECTOR_LEN;
      const ptr1 = passArray8ToWasm0(data, wasm.__wbindgen_malloc);
      const len1 = WASM_VECTOR_LEN;
      wasm.typstrenderer_manipulate_data(retptr, this.__wbg_ptr, session.__wbg_ptr, ptr0, len0, ptr1, len1);
      var r0 = getInt32Memory0()[retptr / 4 + 0];
      var r1 = getInt32Memory0()[retptr / 4 + 1];
      if (r1) {
        throw takeObject(r0);
      }
    } finally {
      wasm.__wbindgen_add_to_stack_pointer(16);
    }
  }
  /**
  * @param {Uint8Array} artifact_content
  * @param {string} decoder
  * @returns {RenderSession}
  */
  session_from_artifact(artifact_content, decoder) {
    try {
      if (this.__wbg_ptr == 0)
        throw new Error("Attempt to use a moved value");
      const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
      _assertNum(this.__wbg_ptr);
      const ptr0 = passArray8ToWasm0(artifact_content, wasm.__wbindgen_malloc);
      const len0 = WASM_VECTOR_LEN;
      const ptr1 = passStringToWasm0(decoder, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
      const len1 = WASM_VECTOR_LEN;
      wasm.typstrenderer_session_from_artifact(retptr, this.__wbg_ptr, ptr0, len0, ptr1, len1);
      var r0 = getInt32Memory0()[retptr / 4 + 0];
      var r1 = getInt32Memory0()[retptr / 4 + 1];
      var r2 = getInt32Memory0()[retptr / 4 + 2];
      if (r2) {
        throw takeObject(r1);
      }
      return RenderSession2.__wrap(r0);
    } finally {
      wasm.__wbindgen_add_to_stack_pointer(16);
    }
  }
  /**
  * @param {RenderSession} ses
  * @param {CanvasRenderingContext2D | undefined} [canvas]
  * @param {RenderPageImageOptions | undefined} [options]
  * @returns {Promise<any>}
  */
  render_page_to_canvas(ses, canvas, options) {
    if (this.__wbg_ptr == 0)
      throw new Error("Attempt to use a moved value");
    _assertNum(this.__wbg_ptr);
    _assertClass(ses, RenderSession2);
    if (ses.__wbg_ptr === 0) {
      throw new Error("Attempt to use a moved value");
    }
    let ptr0 = 0;
    if (!isLikeNone(options)) {
      _assertClass(options, RenderPageImageOptions);
      if (options.__wbg_ptr === 0) {
        throw new Error("Attempt to use a moved value");
      }
      ptr0 = options.__destroy_into_raw();
    }
    const ret = wasm.typstrenderer_render_page_to_canvas(this.__wbg_ptr, ses.__wbg_ptr, isLikeNone(canvas) ? 0 : addHeapObject(canvas), ptr0);
    return takeObject(ret);
  }
  /**
  * @param {RenderSession} ses
  * @param {HTMLElement} elem
  * @returns {Promise<IncrDomDocClient>}
  */
  mount_dom(ses, elem) {
    if (this.__wbg_ptr == 0)
      throw new Error("Attempt to use a moved value");
    _assertNum(this.__wbg_ptr);
    _assertClass(ses, RenderSession2);
    if (ses.__wbg_ptr === 0) {
      throw new Error("Attempt to use a moved value");
    }
    const ret = wasm.typstrenderer_mount_dom(this.__wbg_ptr, ses.__wbg_ptr, addHeapObject(elem));
    return takeObject(ret);
  }
  /**
  * @param {RenderSession} session
  * @param {number} rect_lo_x
  * @param {number} rect_lo_y
  * @param {number} rect_hi_x
  * @param {number} rect_hi_y
  * @returns {string}
  */
  render_svg_diff(session, rect_lo_x, rect_lo_y, rect_hi_x, rect_hi_y) {
    let deferred1_0;
    let deferred1_1;
    try {
      if (this.__wbg_ptr == 0)
        throw new Error("Attempt to use a moved value");
      const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
      _assertNum(this.__wbg_ptr);
      _assertClass(session, RenderSession2);
      if (session.__wbg_ptr === 0) {
        throw new Error("Attempt to use a moved value");
      }
      wasm.typstrenderer_render_svg_diff(retptr, this.__wbg_ptr, session.__wbg_ptr, rect_lo_x, rect_lo_y, rect_hi_x, rect_hi_y);
      var r0 = getInt32Memory0()[retptr / 4 + 0];
      var r1 = getInt32Memory0()[retptr / 4 + 1];
      deferred1_0 = r0;
      deferred1_1 = r1;
      return getStringFromWasm0(r0, r1);
    } finally {
      wasm.__wbindgen_add_to_stack_pointer(16);
      wasm.__wbindgen_free(deferred1_0, deferred1_1, 1);
    }
  }
  /**
  * @param {RenderSession} session
  * @param {number | undefined} [parts]
  * @returns {string}
  */
  svg_data(session, parts) {
    let deferred2_0;
    let deferred2_1;
    try {
      if (this.__wbg_ptr == 0)
        throw new Error("Attempt to use a moved value");
      const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
      _assertNum(this.__wbg_ptr);
      _assertClass(session, RenderSession2);
      if (session.__wbg_ptr === 0) {
        throw new Error("Attempt to use a moved value");
      }
      if (!isLikeNone(parts)) {
        _assertNum(parts);
      }
      wasm.typstrenderer_svg_data(retptr, this.__wbg_ptr, session.__wbg_ptr, !isLikeNone(parts), isLikeNone(parts) ? 0 : parts);
      var r0 = getInt32Memory0()[retptr / 4 + 0];
      var r1 = getInt32Memory0()[retptr / 4 + 1];
      var r2 = getInt32Memory0()[retptr / 4 + 2];
      var r3 = getInt32Memory0()[retptr / 4 + 3];
      var ptr1 = r0;
      var len1 = r1;
      if (r3) {
        ptr1 = 0;
        len1 = 0;
        throw takeObject(r2);
      }
      deferred2_0 = ptr1;
      deferred2_1 = len1;
      return getStringFromWasm0(ptr1, len1);
    } finally {
      wasm.__wbindgen_add_to_stack_pointer(16);
      wasm.__wbindgen_free(deferred2_0, deferred2_1, 1);
    }
  }
  /**
  * @param {RenderSession} session
  * @returns {Array<any> | undefined}
  */
  get_customs(session) {
    if (this.__wbg_ptr == 0)
      throw new Error("Attempt to use a moved value");
    _assertNum(this.__wbg_ptr);
    _assertClass(session, RenderSession2);
    if (session.__wbg_ptr === 0) {
      throw new Error("Attempt to use a moved value");
    }
    const ret = wasm.typstrenderer_get_customs(this.__wbg_ptr, session.__wbg_ptr);
    return takeObject(ret);
  }
  /**
  * @param {RenderSession} session
  * @param {HTMLElement} root
  * @returns {boolean}
  */
  render_svg(session, root) {
    try {
      if (this.__wbg_ptr == 0)
        throw new Error("Attempt to use a moved value");
      const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
      _assertNum(this.__wbg_ptr);
      _assertClass(session, RenderSession2);
      if (session.__wbg_ptr === 0) {
        throw new Error("Attempt to use a moved value");
      }
      wasm.typstrenderer_render_svg(retptr, this.__wbg_ptr, session.__wbg_ptr, addHeapObject(root));
      var r0 = getInt32Memory0()[retptr / 4 + 0];
      var r1 = getInt32Memory0()[retptr / 4 + 1];
      var r2 = getInt32Memory0()[retptr / 4 + 2];
      if (r2) {
        throw takeObject(r1);
      }
      return r0 !== 0;
    } finally {
      wasm.__wbindgen_add_to_stack_pointer(16);
    }
  }
  /**
  * @param {any} _v
  */
  load_glyph_pack(_v) {
    try {
      if (this.__wbg_ptr == 0)
        throw new Error("Attempt to use a moved value");
      const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
      _assertNum(this.__wbg_ptr);
      wasm.typstrenderer_load_glyph_pack(retptr, this.__wbg_ptr, addHeapObject(_v));
      var r0 = getInt32Memory0()[retptr / 4 + 0];
      var r1 = getInt32Memory0()[retptr / 4 + 1];
      if (r1) {
        throw takeObject(r0);
      }
    } finally {
      wasm.__wbindgen_add_to_stack_pointer(16);
    }
  }
}
const TypstRendererBuilderFinalization = typeof FinalizationRegistry === "undefined" ? { register: () => {
}, unregister: () => {
} } : new FinalizationRegistry((ptr) => wasm.__wbg_typstrendererbuilder_free(ptr >>> 0));
class TypstRendererBuilder {
  __destroy_into_raw() {
    const ptr = this.__wbg_ptr;
    this.__wbg_ptr = 0;
    TypstRendererBuilderFinalization.unregister(this);
    return ptr;
  }
  free() {
    const ptr = this.__destroy_into_raw();
    wasm.__wbg_typstrendererbuilder_free(ptr);
  }
  /**
  */
  constructor() {
    try {
      const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
      wasm.typstrendererbuilder_new(retptr);
      var r0 = getInt32Memory0()[retptr / 4 + 0];
      var r1 = getInt32Memory0()[retptr / 4 + 1];
      var r2 = getInt32Memory0()[retptr / 4 + 2];
      if (r2) {
        throw takeObject(r1);
      }
      this.__wbg_ptr = r0 >>> 0;
      return this;
    } finally {
      wasm.__wbindgen_add_to_stack_pointer(16);
    }
  }
  /**
  * @returns {Promise<TypstRenderer>}
  */
  build() {
    if (this.__wbg_ptr == 0)
      throw new Error("Attempt to use a moved value");
    const ptr = this.__destroy_into_raw();
    _assertNum(ptr);
    const ret = wasm.typstrendererbuilder_build(ptr);
    return takeObject(ret);
  }
  /**
  * @param {Uint8Array} _font_buffer
  * @returns {Promise<void>}
  */
  add_raw_font(_font_buffer) {
    if (this.__wbg_ptr == 0)
      throw new Error("Attempt to use a moved value");
    _assertNum(this.__wbg_ptr);
    const ret = wasm.typstrendererbuilder_add_raw_font(this.__wbg_ptr, addHeapObject(_font_buffer));
    return takeObject(ret);
  }
  /**
  * @param {Array<any>} _fonts
  * @returns {Promise<void>}
  */
  add_web_fonts(_fonts) {
    if (this.__wbg_ptr == 0)
      throw new Error("Attempt to use a moved value");
    _assertNum(this.__wbg_ptr);
    const ret = wasm.typstrendererbuilder_add_web_fonts(this.__wbg_ptr, addHeapObject(_fonts));
    return takeObject(ret);
  }
  /**
  * @param {any} _pack
  * @returns {Promise<void>}
  */
  add_glyph_pack(_pack) {
    if (this.__wbg_ptr == 0)
      throw new Error("Attempt to use a moved value");
    _assertNum(this.__wbg_ptr);
    const ret = wasm.typstrendererbuilder_add_glyph_pack(this.__wbg_ptr, addHeapObject(_pack));
    return takeObject(ret);
  }
}
async function __wbg_load(module, imports) {
  if (typeof Response === "function" && module instanceof Response) {
    if (typeof WebAssembly.instantiateStreaming === "function") {
      try {
        return await WebAssembly.instantiateStreaming(module, imports);
      } catch (e) {
        if (module.headers.get("Content-Type") != "application/wasm") {
          console.warn("`WebAssembly.instantiateStreaming` failed because your server does not serve wasm with `application/wasm` MIME type. Falling back to `WebAssembly.instantiate` which is slower. Original error:\n", e);
        } else {
          throw e;
        }
      }
    }
    const bytes = await module.arrayBuffer();
    return await WebAssembly.instantiate(bytes, imports);
  } else {
    const instance = await WebAssembly.instantiate(module, imports);
    if (instance instanceof WebAssembly.Instance) {
      return { instance, module };
    } else {
      return instance;
    }
  }
}
function __wbg_get_imports() {
  const imports = {};
  imports.wbg = {};
  imports.wbg.__wbindgen_object_drop_ref = function(arg0) {
    takeObject(arg0);
  };
  imports.wbg.__wbg_clientWidth_7ea3915573b64350 = function() {
    return logError(function(arg0) {
      const ret = getObject(arg0).clientWidth;
      _assertNum(ret);
      return ret;
    }, arguments);
  };
  imports.wbg.__wbg_getAttribute_99bddb29274b29b9 = function() {
    return logError(function(arg0, arg1, arg2, arg3) {
      const ret = getObject(arg1).getAttribute(getStringFromWasm0(arg2, arg3));
      var ptr1 = isLikeNone(ret) ? 0 : passStringToWasm0(ret, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
      var len1 = WASM_VECTOR_LEN;
      getInt32Memory0()[arg0 / 4 + 1] = len1;
      getInt32Memory0()[arg0 / 4 + 0] = ptr1;
    }, arguments);
  };
  imports.wbg.__wbg_setinnerHTML_26d69b59e1af99c7 = function() {
    return logError(function(arg0, arg1, arg2) {
      getObject(arg0).innerHTML = getStringFromWasm0(arg1, arg2);
    }, arguments);
  };
  imports.wbg.__wbindgen_object_clone_ref = function(arg0) {
    const ret = getObject(arg0);
    return addHeapObject(ret);
  };
  imports.wbg.__wbg_instanceof_Window_f401953a2cf86220 = function() {
    return logError(function(arg0) {
      let result;
      try {
        result = getObject(arg0) instanceof Window;
      } catch (_) {
        result = false;
      }
      const ret = result;
      _assertBoolean(ret);
      return ret;
    }, arguments);
  };
  imports.wbg.__wbindgen_string_new = function(arg0, arg1) {
    const ret = getStringFromWasm0(arg0, arg1);
    return addHeapObject(ret);
  };
  imports.wbg.__wbg_get_e3c254076557e348 = function() {
    return handleError(function(arg0, arg1) {
      const ret = Reflect.get(getObject(arg0), getObject(arg1));
      return addHeapObject(ret);
    }, arguments);
  };
  imports.wbg.__wbindgen_is_function = function(arg0) {
    const ret = typeof getObject(arg0) === "function";
    _assertBoolean(ret);
    return ret;
  };
  imports.wbg.__wbg_firstElementChild_c78596cd0c9b16a7 = function() {
    return logError(function(arg0) {
      const ret = getObject(arg0).firstElementChild;
      return isLikeNone(ret) ? 0 : addHeapObject(ret);
    }, arguments);
  };
  imports.wbg.__wbg_call_b3ca7c6051f9bec1 = function() {
    return handleError(function(arg0, arg1, arg2) {
      const ret = getObject(arg0).call(getObject(arg1), getObject(arg2));
      return addHeapObject(ret);
    }, arguments);
  };
  imports.wbg.__wbg_setAttribute_3c9f6c303b696daa = function() {
    return handleError(function(arg0, arg1, arg2, arg3, arg4) {
      getObject(arg0).setAttribute(getStringFromWasm0(arg1, arg2), getStringFromWasm0(arg3, arg4));
    }, arguments);
  };
  imports.wbg.__wbg_new_72fb9a18b5ae2624 = function() {
    return logError(function() {
      const ret = new Object();
      return addHeapObject(ret);
    }, arguments);
  };
  imports.wbg.__wbg_set_1f9b04f170055d33 = function() {
    return handleError(function(arg0, arg1, arg2) {
      const ret = Reflect.set(getObject(arg0), getObject(arg1), getObject(arg2));
      _assertBoolean(ret);
      return ret;
    }, arguments);
  };
  imports.wbg.__wbg_remove_49b0a5925a04b955 = function() {
    return logError(function(arg0) {
      getObject(arg0).remove();
    }, arguments);
  };
  imports.wbg.__wbg_warn_63bbae1730aead09 = function() {
    return logError(function(arg0) {
      console.warn(getObject(arg0));
    }, arguments);
  };
  imports.wbg.__wbg_document_5100775d18896c16 = function() {
    return logError(function(arg0) {
      const ret = getObject(arg0).document;
      return isLikeNone(ret) ? 0 : addHeapObject(ret);
    }, arguments);
  };
  imports.wbg.__wbg_createElement_8bae7856a4bb7411 = function() {
    return handleError(function(arg0, arg1, arg2) {
      const ret = getObject(arg0).createElement(getStringFromWasm0(arg1, arg2));
      return addHeapObject(ret);
    }, arguments);
  };
  imports.wbg.__wbg_instanceof_HtmlCanvasElement_46bdbf323b0b18d1 = function() {
    return logError(function(arg0) {
      let result;
      try {
        result = getObject(arg0) instanceof HTMLCanvasElement;
      } catch (_) {
        result = false;
      }
      const ret = result;
      _assertBoolean(ret);
      return ret;
    }, arguments);
  };
  imports.wbg.__wbg_new_16b304a2cfa7ff4a = function() {
    return logError(function() {
      const ret = new Array();
      return addHeapObject(ret);
    }, arguments);
  };
  imports.wbg.__wbg_set_d4638f722068f043 = function() {
    return logError(function(arg0, arg1, arg2) {
      getObject(arg0)[arg1 >>> 0] = takeObject(arg2);
    }, arguments);
  };
  imports.wbg.__wbg_incrdomdocclient_new = function() {
    return logError(function(arg0) {
      const ret = IncrDomDocClient.__wrap(arg0);
      return addHeapObject(ret);
    }, arguments);
  };
  imports.wbg.__wbg_new_81740750da40724f = function() {
    return logError(function(arg0, arg1) {
      try {
        var state0 = { a: arg0, b: arg1 };
        var cb0 = (arg02, arg12) => {
          const a = state0.a;
          state0.a = 0;
          try {
            return __wbg_adapter_109(a, state0.b, arg02, arg12);
          } finally {
            state0.a = a;
          }
        };
        const ret = new Promise(cb0);
        return addHeapObject(ret);
      } finally {
        state0.a = state0.b = 0;
      }
    }, arguments);
  };
  imports.wbg.__wbg_setTransform_73631293eb78bf95 = function() {
    return handleError(function(arg0, arg1, arg2, arg3, arg4, arg5, arg6) {
      getObject(arg0).setTransform(arg1, arg2, arg3, arg4, arg5, arg6);
    }, arguments);
  };
  imports.wbg.__wbg_setfillStyle_4de94b275f5761f2 = function() {
    return logError(function(arg0, arg1) {
      getObject(arg0).fillStyle = getObject(arg1);
    }, arguments);
  };
  imports.wbg.__wbg_fillRect_b5c8166281bac9df = function() {
    return logError(function(arg0, arg1, arg2, arg3, arg4) {
      getObject(arg0).fillRect(arg1, arg2, arg3, arg4);
    }, arguments);
  };
  imports.wbg.__wbg_typstrenderer_new = function() {
    return logError(function(arg0) {
      const ret = TypstRenderer.__wrap(arg0);
      return addHeapObject(ret);
    }, arguments);
  };
  imports.wbg.__wbg_push_a5b05aedc7234f9f = function() {
    return logError(function(arg0, arg1) {
      const ret = getObject(arg0).push(getObject(arg1));
      _assertNum(ret);
      return ret;
    }, arguments);
  };
  imports.wbg.__wbindgen_memory = function() {
    const ret = wasm.memory;
    return addHeapObject(ret);
  };
  imports.wbg.__wbg_buffer_12d079cc21e14bdb = function() {
    return logError(function(arg0) {
      const ret = getObject(arg0).buffer;
      return addHeapObject(ret);
    }, arguments);
  };
  imports.wbg.__wbg_newwithbyteoffsetandlength_aa4a17c33a06e5cb = function() {
    return logError(function(arg0, arg1, arg2) {
      const ret = new Uint8Array(getObject(arg0), arg1 >>> 0, arg2 >>> 0);
      return addHeapObject(ret);
    }, arguments);
  };
  imports.wbg.__wbg_new_63b92bc8671ed464 = function() {
    return logError(function(arg0) {
      const ret = new Uint8Array(getObject(arg0));
      return addHeapObject(ret);
    }, arguments);
  };
  imports.wbg.__wbg_new_abda76e883ba8a5f = function() {
    return logError(function() {
      const ret = new Error();
      return addHeapObject(ret);
    }, arguments);
  };
  imports.wbg.__wbg_stack_658279fe44541cf6 = function() {
    return logError(function(arg0, arg1) {
      const ret = getObject(arg1).stack;
      const ptr1 = passStringToWasm0(ret, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
      const len1 = WASM_VECTOR_LEN;
      getInt32Memory0()[arg0 / 4 + 1] = len1;
      getInt32Memory0()[arg0 / 4 + 0] = ptr1;
    }, arguments);
  };
  imports.wbg.__wbg_error_f851667af71bcfc6 = function() {
    return logError(function(arg0, arg1) {
      let deferred0_0;
      let deferred0_1;
      try {
        deferred0_0 = arg0;
        deferred0_1 = arg1;
        console.error(getStringFromWasm0(arg0, arg1));
      } finally {
        wasm.__wbindgen_free(deferred0_0, deferred0_1, 1);
      }
    }, arguments);
  };
  imports.wbg.__wbg_self_ce0dbfc45cf2f5be = function() {
    return handleError(function() {
      const ret = self.self;
      return addHeapObject(ret);
    }, arguments);
  };
  imports.wbg.__wbg_window_c6fb939a7f436783 = function() {
    return handleError(function() {
      const ret = window.window;
      return addHeapObject(ret);
    }, arguments);
  };
  imports.wbg.__wbg_globalThis_d1e6af4856ba331b = function() {
    return handleError(function() {
      const ret = globalThis.globalThis;
      return addHeapObject(ret);
    }, arguments);
  };
  imports.wbg.__wbg_global_207b558942527489 = function() {
    return handleError(function() {
      const ret = global.global;
      return addHeapObject(ret);
    }, arguments);
  };
  imports.wbg.__wbindgen_is_undefined = function(arg0) {
    const ret = getObject(arg0) === void 0;
    _assertBoolean(ret);
    return ret;
  };
  imports.wbg.__wbg_newnoargs_e258087cd0daa0ea = function() {
    return logError(function(arg0, arg1) {
      const ret = new Function(getStringFromWasm0(arg0, arg1));
      return addHeapObject(ret);
    }, arguments);
  };
  imports.wbg.__wbg_call_27c0f87801dedf93 = function() {
    return handleError(function(arg0, arg1) {
      const ret = getObject(arg0).call(getObject(arg1));
      return addHeapObject(ret);
    }, arguments);
  };
  imports.wbg.__wbg_new_28c511d9baebfa89 = function() {
    return logError(function(arg0, arg1) {
      const ret = new Error(getStringFromWasm0(arg0, arg1));
      return addHeapObject(ret);
    }, arguments);
  };
  imports.wbg.__wbg_call_8e7cb608789c2528 = function() {
    return handleError(function(arg0, arg1, arg2, arg3) {
      const ret = getObject(arg0).call(getObject(arg1), getObject(arg2), getObject(arg3));
      return addHeapObject(ret);
    }, arguments);
  };
  imports.wbg.__wbg_call_938992c832f74314 = function() {
    return handleError(function(arg0, arg1, arg2, arg3, arg4) {
      const ret = getObject(arg0).call(getObject(arg1), getObject(arg2), getObject(arg3), getObject(arg4));
      return addHeapObject(ret);
    }, arguments);
  };
  imports.wbg.__wbg_resolve_b0083a7967828ec8 = function() {
    return logError(function(arg0) {
      const ret = Promise.resolve(getObject(arg0));
      return addHeapObject(ret);
    }, arguments);
  };
  imports.wbg.__wbg_then_0c86a60e8fcfe9f6 = function() {
    return logError(function(arg0, arg1) {
      const ret = getObject(arg0).then(getObject(arg1));
      return addHeapObject(ret);
    }, arguments);
  };
  imports.wbg.__wbg_then_a73caa9a87991566 = function() {
    return logError(function(arg0, arg1, arg2) {
      const ret = getObject(arg0).then(getObject(arg1), getObject(arg2));
      return addHeapObject(ret);
    }, arguments);
  };
  imports.wbg.__wbg_length_c20a40f15020d68a = function() {
    return logError(function(arg0) {
      const ret = getObject(arg0).length;
      _assertNum(ret);
      return ret;
    }, arguments);
  };
  imports.wbg.__wbg_set_a47bac70306a19a7 = function() {
    return logError(function(arg0, arg1, arg2) {
      getObject(arg0).set(getObject(arg1), arg2 >>> 0);
    }, arguments);
  };
  imports.wbg.__wbg_newwithlength_e9b4878cebadb3d3 = function() {
    return logError(function(arg0) {
      const ret = new Uint8Array(arg0 >>> 0);
      return addHeapObject(ret);
    }, arguments);
  };
  imports.wbg.__wbindgen_string_get = function(arg0, arg1) {
    const obj = getObject(arg1);
    const ret = typeof obj === "string" ? obj : void 0;
    var ptr1 = isLikeNone(ret) ? 0 : passStringToWasm0(ret, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    var len1 = WASM_VECTOR_LEN;
    getInt32Memory0()[arg0 / 4 + 1] = len1;
    getInt32Memory0()[arg0 / 4 + 0] = ptr1;
  };
  imports.wbg.__wbg_stringify_8887fe74e1c50d81 = function() {
    return handleError(function(arg0) {
      const ret = JSON.stringify(getObject(arg0));
      return addHeapObject(ret);
    }, arguments);
  };
  imports.wbg.__wbindgen_cb_drop = function(arg0) {
    const obj = takeObject(arg0).original;
    if (obj.cnt-- == 1) {
      obj.a = 0;
      return true;
    }
    const ret = false;
    _assertBoolean(ret);
    return ret;
  };
  imports.wbg.__wbg_restore_b0b630dcf5875c16 = function() {
    return logError(function(arg0) {
      getObject(arg0).restore();
    }, arguments);
  };
  imports.wbg.__wbg_instanceof_HtmlImageElement_d823b10f99854a6b = function() {
    return logError(function(arg0) {
      let result;
      try {
        result = getObject(arg0) instanceof HTMLImageElement;
      } catch (_) {
        result = false;
      }
      const ret = result;
      _assertBoolean(ret);
      return ret;
    }, arguments);
  };
  imports.wbg.__wbg_save_b2ec4f4afd250d50 = function() {
    return logError(function(arg0) {
      getObject(arg0).save();
    }, arguments);
  };
  imports.wbg.__wbg_revokeObjectURL_16a2051ee9d99da9 = function() {
    return handleError(function(arg0, arg1) {
      URL.revokeObjectURL(getStringFromWasm0(arg0, arg1));
    }, arguments);
  };
  imports.wbg.__wbg_log_5bb5f88f245d7762 = function() {
    return logError(function(arg0) {
      console.log(getObject(arg0));
    }, arguments);
  };
  imports.wbg.__wbindgen_number_new = function(arg0) {
    const ret = arg0;
    return addHeapObject(ret);
  };
  imports.wbg.__wbg_newwithpathstring_eaf93999895560bf = function() {
    return handleError(function(arg0, arg1) {
      const ret = new Path2D(getStringFromWasm0(arg0, arg1));
      return addHeapObject(ret);
    }, arguments);
  };
  imports.wbg.__wbg_clip_2164a4dde3544fc7 = function() {
    return logError(function(arg0, arg1) {
      getObject(arg0).clip(getObject(arg1));
    }, arguments);
  };
  imports.wbg.__wbg_newwithu8arraysequenceandoptions_366f462e1b363808 = function() {
    return handleError(function(arg0, arg1) {
      const ret = new Blob(getObject(arg0), getObject(arg1));
      return addHeapObject(ret);
    }, arguments);
  };
  imports.wbg.__wbg_createObjectURL_ad8244759309f204 = function() {
    return handleError(function(arg0, arg1) {
      const ret = URL.createObjectURL(getObject(arg1));
      const ptr1 = passStringToWasm0(ret, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
      const len1 = WASM_VECTOR_LEN;
      getInt32Memory0()[arg0 / 4 + 1] = len1;
      getInt32Memory0()[arg0 / 4 + 0] = ptr1;
    }, arguments);
  };
  imports.wbg.__wbg_setsrc_681ceacdf6845f60 = function() {
    return logError(function(arg0, arg1, arg2) {
      getObject(arg0).src = getStringFromWasm0(arg1, arg2);
    }, arguments);
  };
  imports.wbg.__wbg_setonload_4b2d1fd60416c2dd = function() {
    return logError(function(arg0, arg1) {
      getObject(arg0).onload = getObject(arg1);
    }, arguments);
  };
  imports.wbg.__wbg_setonerror_4e3faee320602b64 = function() {
    return logError(function(arg0, arg1) {
      getObject(arg0).onerror = getObject(arg1);
    }, arguments);
  };
  imports.wbg.__wbg_drawImage_14f72ed9b8430e9d = function() {
    return handleError(function(arg0, arg1, arg2, arg3, arg4, arg5) {
      getObject(arg0).drawImage(getObject(arg1), arg2, arg3, arg4, arg5);
    }, arguments);
  };
  imports.wbg.__wbg_setlineCap_561c8efd4e48949c = function() {
    return logError(function(arg0, arg1, arg2) {
      getObject(arg0).lineCap = getStringFromWasm0(arg1, arg2);
    }, arguments);
  };
  imports.wbg.__wbg_setlineJoin_c2f314b5744d240f = function() {
    return logError(function(arg0, arg1, arg2) {
      getObject(arg0).lineJoin = getStringFromWasm0(arg1, arg2);
    }, arguments);
  };
  imports.wbg.__wbg_setmiterLimit_d1ca0274cb45b371 = function() {
    return logError(function(arg0, arg1) {
      getObject(arg0).miterLimit = arg1;
    }, arguments);
  };
  imports.wbg.__wbg_setlineDashOffset_ee14f664955fb961 = function() {
    return logError(function(arg0, arg1) {
      getObject(arg0).lineDashOffset = arg1;
    }, arguments);
  };
  imports.wbg.__wbg_setLineDash_aed2919a1550112b = function() {
    return handleError(function(arg0, arg1) {
      getObject(arg0).setLineDash(getObject(arg1));
    }, arguments);
  };
  imports.wbg.__wbg_setlineWidth_ea4c8cb72d8cdc31 = function() {
    return logError(function(arg0, arg1) {
      getObject(arg0).lineWidth = arg1;
    }, arguments);
  };
  imports.wbg.__wbg_fill_2a41be87d81e2fc6 = function() {
    return logError(function(arg0, arg1) {
      getObject(arg0).fill(getObject(arg1));
    }, arguments);
  };
  imports.wbg.__wbg_setstrokeStyle_c79ba6bc36a7f302 = function() {
    return logError(function(arg0, arg1) {
      getObject(arg0).strokeStyle = getObject(arg1);
    }, arguments);
  };
  imports.wbg.__wbg_stroke_98acc75a72e3ec2a = function() {
    return logError(function(arg0, arg1) {
      getObject(arg0).stroke(getObject(arg1));
    }, arguments);
  };
  imports.wbg.__wbg_instanceof_CanvasRenderingContext2d_20bf99ccc051643b = function() {
    return logError(function(arg0) {
      let result;
      try {
        result = getObject(arg0) instanceof CanvasRenderingContext2D;
      } catch (_) {
        result = false;
      }
      const ret = result;
      _assertBoolean(ret);
      return ret;
    }, arguments);
  };
  imports.wbg.__wbg_getContext_df50fa48a8876636 = function() {
    return handleError(function(arg0, arg1, arg2) {
      const ret = getObject(arg0).getContext(getStringFromWasm0(arg1, arg2));
      return isLikeNone(ret) ? 0 : addHeapObject(ret);
    }, arguments);
  };
  imports.wbg.__wbg_setfont_a4d031cf2c94b4db = function() {
    return logError(function(arg0, arg1, arg2) {
      getObject(arg0).font = getStringFromWasm0(arg1, arg2);
    }, arguments);
  };
  imports.wbg.__wbg_measureText_ea212ea07011bf71 = function() {
    return handleError(function(arg0, arg1, arg2) {
      const ret = getObject(arg0).measureText(getStringFromWasm0(arg1, arg2));
      return addHeapObject(ret);
    }, arguments);
  };
  imports.wbg.__wbg_width_e870de808b523851 = function() {
    return logError(function(arg0) {
      const ret = getObject(arg0).width;
      return ret;
    }, arguments);
  };
  imports.wbg.__wbg_instanceof_HtmlTemplateElement_e8ad7d7a7fc9abc2 = function() {
    return logError(function(arg0) {
      let result;
      try {
        result = getObject(arg0) instanceof HTMLTemplateElement;
      } catch (_) {
        result = false;
      }
      const ret = result;
      _assertBoolean(ret);
      return ret;
    }, arguments);
  };
  imports.wbg.__wbg_content_e05939f111e5ff5a = function() {
    return logError(function(arg0) {
      const ret = getObject(arg0).content;
      return addHeapObject(ret);
    }, arguments);
  };
  imports.wbg.__wbg_firstElementChild_92c5a0bbdcb24796 = function() {
    return logError(function(arg0) {
      const ret = getObject(arg0).firstElementChild;
      return isLikeNone(ret) ? 0 : addHeapObject(ret);
    }, arguments);
  };
  imports.wbg.__wbg_instanceof_SvgGraphicsElement_a5b95d5bb634faf8 = function() {
    return logError(function(arg0) {
      let result;
      try {
        result = getObject(arg0) instanceof SVGGraphicsElement;
      } catch (_) {
        result = false;
      }
      const ret = result;
      _assertBoolean(ret);
      return ret;
    }, arguments);
  };
  imports.wbg.__wbg_instanceof_HtmlElement_3bcc4ff70cfdcba5 = function() {
    return logError(function(arg0) {
      let result;
      try {
        result = getObject(arg0) instanceof HTMLElement;
      } catch (_) {
        result = false;
      }
      const ret = result;
      _assertBoolean(ret);
      return ret;
    }, arguments);
  };
  imports.wbg.__wbg_cloneNode_e19c313ea20d5d1d = function() {
    return handleError(function(arg0) {
      const ret = getObject(arg0).cloneNode();
      return addHeapObject(ret);
    }, arguments);
  };
  imports.wbg.__wbg_instanceof_Element_6945fc210db80ea9 = function() {
    return logError(function(arg0) {
      let result;
      try {
        result = getObject(arg0) instanceof Element;
      } catch (_) {
        result = false;
      }
      const ret = result;
      _assertBoolean(ret);
      return ret;
    }, arguments);
  };
  imports.wbg.__wbg_clearRect_05de681275dda635 = function() {
    return logError(function(arg0, arg1, arg2, arg3, arg4) {
      getObject(arg0).clearRect(arg1, arg2, arg3, arg4);
    }, arguments);
  };
  imports.wbg.__wbg_style_c3fc3dd146182a2d = function() {
    return logError(function(arg0) {
      const ret = getObject(arg0).style;
      return addHeapObject(ret);
    }, arguments);
  };
  imports.wbg.__wbg_setProperty_ea7d15a2b591aa97 = function() {
    return handleError(function(arg0, arg1, arg2, arg3, arg4) {
      getObject(arg0).setProperty(getStringFromWasm0(arg1, arg2), getStringFromWasm0(arg3, arg4));
    }, arguments);
  };
  imports.wbg.__wbg_removeProperty_fa6d48e2923dcfac = function() {
    return handleError(function(arg0, arg1, arg2, arg3) {
      const ret = getObject(arg1).removeProperty(getStringFromWasm0(arg2, arg3));
      const ptr1 = passStringToWasm0(ret, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
      const len1 = WASM_VECTOR_LEN;
      getInt32Memory0()[arg0 / 4 + 1] = len1;
      getInt32Memory0()[arg0 / 4 + 0] = ptr1;
    }, arguments);
  };
  imports.wbg.__wbg_instanceof_HtmlDivElement_31d3273633f69d96 = function() {
    return logError(function(arg0) {
      let result;
      try {
        result = getObject(arg0) instanceof HTMLDivElement;
      } catch (_) {
        result = false;
      }
      const ret = result;
      _assertBoolean(ret);
      return ret;
    }, arguments);
  };
  imports.wbg.__wbg_instanceof_SvgsvgElement_ab645292b5c30322 = function() {
    return logError(function(arg0) {
      let result;
      try {
        result = getObject(arg0) instanceof SVGSVGElement;
      } catch (_) {
        result = false;
      }
      const ret = result;
      _assertBoolean(ret);
      return ret;
    }, arguments);
  };
  imports.wbg.__wbg_nextElementSibling_72304aeb66624976 = function() {
    return logError(function(arg0) {
      const ret = getObject(arg0).nextElementSibling;
      return isLikeNone(ret) ? 0 : addHeapObject(ret);
    }, arguments);
  };
  imports.wbg.__wbg_appendChild_580ccb11a660db68 = function() {
    return handleError(function(arg0, arg1) {
      const ret = getObject(arg0).appendChild(getObject(arg1));
      return addHeapObject(ret);
    }, arguments);
  };
  imports.wbg.__wbg_log_1746d5c75ec89963 = function() {
    return logError(function(arg0, arg1) {
      console.log(getObject(arg0), getObject(arg1));
    }, arguments);
  };
  imports.wbg.__wbg_replaceWith_72e597a5990af8e0 = function() {
    return handleError(function(arg0, arg1) {
      getObject(arg0).replaceWith(getObject(arg1));
    }, arguments);
  };
  imports.wbg.__wbg_setwidth_080107476e633963 = function() {
    return logError(function(arg0, arg1) {
      getObject(arg0).width = arg1 >>> 0;
    }, arguments);
  };
  imports.wbg.__wbg_setheight_dc240617639f1f51 = function() {
    return logError(function(arg0, arg1) {
      getObject(arg0).height = arg1 >>> 0;
    }, arguments);
  };
  imports.wbg.__wbg_lastElementChild_d408eaa043927a37 = function() {
    return logError(function(arg0) {
      const ret = getObject(arg0).lastElementChild;
      return isLikeNone(ret) ? 0 : addHeapObject(ret);
    }, arguments);
  };
  imports.wbg.__wbindgen_debug_string = function(arg0, arg1) {
    const ret = debugString(getObject(arg1));
    const ptr1 = passStringToWasm0(ret, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    const len1 = WASM_VECTOR_LEN;
    getInt32Memory0()[arg0 / 4 + 1] = len1;
    getInt32Memory0()[arg0 / 4 + 0] = ptr1;
  };
  imports.wbg.__wbindgen_throw = function(arg0, arg1) {
    throw new Error(getStringFromWasm0(arg0, arg1));
  };
  imports.wbg.__wbg_queueMicrotask_481971b0d87f3dd4 = function() {
    return logError(function(arg0) {
      queueMicrotask(getObject(arg0));
    }, arguments);
  };
  imports.wbg.__wbg_queueMicrotask_3cbae2ec6b6cd3d6 = function() {
    return logError(function(arg0) {
      const ret = getObject(arg0).queueMicrotask;
      return addHeapObject(ret);
    }, arguments);
  };
  imports.wbg.__wbindgen_closure_wrapper2585 = function() {
    return logError(function(arg0, arg1, arg2) {
      const ret = makeClosure(arg0, arg1, 1260, __wbg_adapter_24);
      return addHeapObject(ret);
    }, arguments);
  };
  imports.wbg.__wbindgen_closure_wrapper2586 = function() {
    return logError(function(arg0, arg1, arg2) {
      const ret = makeClosure(arg0, arg1, 1260, __wbg_adapter_27);
      return addHeapObject(ret);
    }, arguments);
  };
  imports.wbg.__wbindgen_closure_wrapper3586 = function() {
    return logError(function(arg0, arg1, arg2) {
      const ret = makeMutClosure(arg0, arg1, 1769, __wbg_adapter_30);
      return addHeapObject(ret);
    }, arguments);
  };
  return imports;
}
function __wbg_finalize_init(instance, module) {
  wasm = instance.exports;
  __wbg_init.__wbindgen_wasm_module = module;
  cachedFloat32Memory0 = null;
  cachedInt32Memory0 = null;
  cachedUint32Memory0 = null;
  cachedUint8Memory0 = null;
  return wasm;
}
function initSync(module) {
  if (wasm !== void 0)
    return wasm;
  const imports = __wbg_get_imports();
  if (!(module instanceof WebAssembly.Module)) {
    module = new WebAssembly.Module(module);
  }
  const instance = new WebAssembly.Instance(module, imports);
  return __wbg_finalize_init(instance, module);
}
async function __wbg_init(input) {
  if (wasm !== void 0)
    return wasm;
  if (typeof input === "undefined") {
    input = importWasmModule("typst_ts_renderer_bg.wasm", import.meta.url);
  }
  const imports = __wbg_get_imports();
  if (typeof input === "string" || typeof Request === "function" && input instanceof Request || typeof URL === "function" && input instanceof URL) {
    input = fetch(input);
  }
  const { instance, module } = await __wbg_load(await input, imports);
  return __wbg_finalize_init(instance, module);
}
let importWasmModule = async function(wasm_name, url) {
  throw new Error("Cannot import wasm module without importer: " + wasm_name + " " + url);
};
function setImportWasmModule(importer) {
  importWasmModule = importer;
}
let nodeJsImportWasmModule = async function(wasm_name, url) {
  const escapeImport = new Function("m", "return import(m)");
  const path = await escapeImport("path");
  const { readFileSync } = await escapeImport("fs");
  const wasmPath = new URL(path.join(path.dirname(url), wasm_name));
  return await readFileSync(wasmPath).buffer;
};
const isNode = typeof process !== "undefined" && process.versions != null && process.versions.node != null;
if (isNode) {
  setImportWasmModule(nodeJsImportWasmModule);
}
const wasmPackShim = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  CreateSessionOptions,
  IncrDomDocClient,
  PageInfo,
  PagesInfo,
  RenderPageImageOptions,
  RenderSession: RenderSession2,
  RenderSessionOptions,
  TypstRenderer,
  TypstRendererBuilder,
  default: __wbg_init,
  initSync,
  renderer_build_info,
  setImportWasmModule
}, Symbol.toStringTag, { value: "Module" }));
