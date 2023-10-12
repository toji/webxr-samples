/**
 * @license
 * webxr-layers-polyfill
 * Version 1.0.2
 * Copyright (c) 2021 Facebook, Inc. and its affiliates.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 * 
 * http://www.apache.org/licenses/LICENSE-2.0
 * 
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
*/

/**
 * @license
 * gl-matrix 
 * Version 3.3.0
 * Copyright (c) 2015-2020, Brandon Jones, Colin MacKenzie IV.
 * 
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 * 
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 * 
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
*/ 

var XRTextureType;
(function (XRTextureType) {
    XRTextureType["texture"] = "texture";
    XRTextureType["texture-array"] = "texture-array";
})(XRTextureType || (XRTextureType = {}));
var XRLayerLayout;
(function (XRLayerLayout) {
    XRLayerLayout["default"] = "default";
    XRLayerLayout["mono"] = "mono";
    XRLayerLayout["stereo"] = "stereo";
    XRLayerLayout["stereo-left-right"] = "stereo-left-right";
    XRLayerLayout["stereo-top-bottom"] = "stereo-top-bottom";
})(XRLayerLayout || (XRLayerLayout = {}));

const isReferenceSpace = (arg) => {
    return arg && typeof arg.getOffsetReferenceSpace === 'function';
};

const getGlobal = () => {
    return typeof global !== 'undefined'
        ? global
        : typeof self !== 'undefined'
            ? self
            : typeof window !== 'undefined'
                ? window
                : {};
};

class XRCompositionLayerPolyfill {
    constructor() {
        this._hasRunDeferredInitialize = false;
        this._media = null;
    }
    initialize(session, context) {
        this.session = session;
        if (context) {
            this.context = context;
        }
        this.blendTextureSourceAlpha = true;
        this.chromaticAberrationCorrection = false;
    }
    destroy() {
        this._colorTextures = [];
        this._depthStencilTextures = [];
    }
    addEventListener(type, listener, options) { }
    dispatchEvent(event) {
        return false;
    }
    removeEventListener(type, callback, options) { }
    getContext() {
        return this.context;
    }
    getTextureType() {
        throw new Error('Unimplemented');
    }
    get colorTextures() {
        return this._colorTextures;
    }
    get depthStencilTextures() {
        return this._depthStencilTextures;
    }
    get colorTexturesMeta() {
        return this._texturesMeta;
    }
    get media() {
        if (!this.isMediaLayer()) {
            console.warn('Attempted to retrieve media from a non-media layer');
        }
        return this._media;
    }
    determineLayoutAttribute(textureType, context, layout) {
        if (!(context instanceof WebGL2RenderingContext) &&
            textureType === XRTextureType['texture-array']) {
            throw new TypeError();
        }
        if (layout === XRLayerLayout.mono) {
            return layout;
        }
        if (layout === XRLayerLayout.default) {
            if (this.session.internalViews && this.session.internalViews.length === 1) {
                return XRLayerLayout['mono'];
            }
            if (textureType === XRTextureType['texture-array']) {
                return layout;
            }
        }
        if (layout === XRLayerLayout.default || layout === XRLayerLayout.stereo) {
            return XRLayerLayout['stereo-left-right'];
        }
        return layout;
    }
    isMediaLayer() {
        return this._media !== null;
    }
    _deferredInitialize() { }
    initializeIfNeeded() {
        if (!this._hasRunDeferredInitialize) {
            this._hasRunDeferredInitialize = true;
            this._deferredInitialize();
        }
    }
    _allocateColorTexturesInternal(textureType, init) {
        let session = this.session;
        let views = session.internalViews;
        if (!views || views.length === 0) {
            console.warn("We can't allocate color textures without views");
            return;
        }
        this.initializeIfNeeded();
        if (this.layout === XRLayerLayout.mono) {
            if (textureType === XRTextureType['texture-array']) {
                const newTexture = this._createNewColorTexture(init.viewPixelWidth, init.viewPixelHeight, textureType, init.colorFormat);
                this._texturesMeta = [newTexture];
                this._colorTextures = [newTexture.texture];
                return;
            }
            else {
                const newTexture = this._createNewColorTexture(init.viewPixelWidth, init.viewPixelHeight, textureType, init.colorFormat);
                this._texturesMeta = [newTexture];
                this._colorTextures = [newTexture.texture];
                return;
            }
        }
        else if (this.layout === XRLayerLayout.stereo) {
            if (textureType === XRTextureType['texture-array']) {
                const newTexture = this._createNewColorTexture(init.viewPixelWidth, init.viewPixelHeight, textureType, init.colorFormat, 2);
                this._texturesMeta = [newTexture];
                this._colorTextures = [newTexture.texture];
                return;
            }
            else {
                const texture1 = this._createNewColorTexture(init.viewPixelWidth, init.viewPixelHeight, textureType, init.colorFormat);
                const texture2 = this._createNewColorTexture(init.viewPixelWidth, init.viewPixelHeight, textureType, init.colorFormat);
                this._texturesMeta = [texture1, texture2];
                this._colorTextures = [texture1.texture, texture2.texture];
                return;
            }
        }
        else if (this.layout === XRLayerLayout['stereo-left-right']) {
            const newTexture = this._createNewColorTexture(init.viewPixelWidth * 2, init.viewPixelHeight, textureType, init.colorFormat);
            this._texturesMeta = [newTexture];
            this._colorTextures = [newTexture.texture];
            return;
        }
        else if (this.layout === XRLayerLayout['stereo-top-bottom']) {
            const newTexture = this._createNewColorTexture(init.viewPixelWidth, init.viewPixelHeight * 2, textureType, init.colorFormat);
            this._texturesMeta = [newTexture];
            this._colorTextures = [newTexture.texture];
            return;
        }
    }
    _allocateDepthStencilTexturesInternal(textureType, init) {
        if (!init.depthFormat) {
            this._depthStencilTextures = [];
            return;
        }
        if (this._getSupportedDepthFormats().indexOf(init.depthFormat) < 0) {
            throw new Error('Depth format provided is not supported in non-projection layers.');
        }
        if (init.mipLevels < 1) {
            throw new Error('Invalid miplevel. Miplevel needs to be >= 1');
        }
        if (this.layout === XRLayerLayout.mono) {
            if (textureType === XRTextureType['texture-array']) {
                const newTexture = this._createNewDepthStencilTexture(init.viewPixelWidth, init.viewPixelHeight, textureType, init.depthFormat);
                this._depthStencilTextures = [newTexture.texture];
                return;
            }
            else {
                const newTexture = this._createNewColorTexture(init.viewPixelWidth, init.viewPixelHeight, textureType, init.depthFormat);
                this._depthStencilTextures = [newTexture.texture];
                return;
            }
        }
        else if (this.layout === XRLayerLayout.stereo) {
            if (textureType === XRTextureType['texture-array']) {
                const newTexture = this._createNewDepthStencilTexture(init.viewPixelWidth, init.viewPixelHeight, textureType, init.depthFormat, 2);
                this._depthStencilTextures = [newTexture.texture];
                return;
            }
            else {
                const texture1 = this._createNewDepthStencilTexture(init.viewPixelWidth, init.viewPixelHeight, textureType, init.depthFormat);
                const texture2 = this._createNewDepthStencilTexture(init.viewPixelWidth, init.viewPixelHeight, textureType, init.depthFormat);
                this._depthStencilTextures = [texture1.texture, texture2.texture];
                return;
            }
        }
        else if (this.layout === XRLayerLayout['stereo-left-right']) {
            const newTexture = this._createNewDepthStencilTexture(init.viewPixelWidth * 2, init.viewPixelHeight, textureType, init.depthFormat);
            this._depthStencilTextures = [newTexture.texture];
            return;
        }
        else if (this.layout === XRLayerLayout['stereo-top-bottom']) {
            const newTexture = this._createNewDepthStencilTexture(init.viewPixelWidth, init.viewPixelHeight * 2, textureType, init.depthFormat);
            this._depthStencilTextures = [newTexture.texture];
            return;
        }
    }
    _createNewColorTexture(width, height, textureType, colorFormat, layers = 1) {
        return this._createGenericPolyfillTexture(textureType, width, height, colorFormat, 0, layers);
    }
    _createNewDepthStencilTexture(width, height, textureType, depthFormat, layers = 1) {
        return this._createGenericPolyfillTexture(textureType, width, height, depthFormat, 0, layers);
    }
    _createGenericPolyfillTexture(textureType, width, height, textureFormat, mipmapLevel = 0, numLayers = 1) {
        if (textureType === XRTextureType['texture-array'] && numLayers <= 1) {
            console.warn('creating a texture array with a single layer...');
        }
        if (textureType === XRTextureType['texture-array'] &&
            this.context instanceof WebGLRenderingContext) {
            throw new Error('WebGL 1 does not support texture array');
        }
        let texture = this.context.createTexture();
        let textureMeta = {
            width,
            height,
            layers: numLayers,
            type: textureType,
            textureFormat: textureFormat,
            texture,
        };
        let internalFormat = textureFormat;
        if (this.context instanceof WebGL2RenderingContext) {
            if (internalFormat === this.context.DEPTH_COMPONENT) {
                internalFormat = this.context.DEPTH_COMPONENT24;
            }
            if (internalFormat === this.context.DEPTH_STENCIL) {
                internalFormat = this.context.DEPTH24_STENCIL8;
            }
        }
        let texImageType = this.context.UNSIGNED_BYTE;
        if (textureFormat === this.context.DEPTH_COMPONENT) {
            texImageType = this.context.UNSIGNED_INT;
        }
        if (this.context instanceof WebGL2RenderingContext) {
            if (textureFormat === this.context.DEPTH_COMPONENT24) {
                texImageType = this.context.UNSIGNED_INT;
            }
            if (textureFormat === this.context.DEPTH24_STENCIL8 ||
                textureFormat === this.context.DEPTH_STENCIL) {
                texImageType = this.context.UNSIGNED_INT_24_8;
            }
        }
        else {
            if (textureFormat === this.context.DEPTH_STENCIL) {
                texImageType = this.context.UNSIGNED_INT_24_8_WEBGL;
            }
        }
        if (textureType === XRTextureType['texture-array'] &&
            this.context instanceof WebGL2RenderingContext) {
            console.warn('texture-array layers are supported...questionably in the polyfill at the moment. Use at your own risk.');
            const existingTextureBinding = this.context.getParameter(this.context.TEXTURE_BINDING_2D_ARRAY);
            this.context.bindTexture(this.context.TEXTURE_2D_ARRAY, texture);
            if (this._getSupportedDepthFormats().indexOf(textureFormat) >= 0) {
                this.context.texStorage3D(this.context.TEXTURE_2D_ARRAY, 1, internalFormat, width, height, numLayers);
            }
            else {
                this.context.texImage3D(this.context.TEXTURE_2D_ARRAY, 0, internalFormat, width, height, numLayers, 0, textureFormat, texImageType, null);
            }
            this.context.bindTexture(this.context.TEXTURE_2D_ARRAY, existingTextureBinding);
        }
        else {
            const existingTextureBinding = this.context.getParameter(this.context.TEXTURE_BINDING_2D);
            this.context.bindTexture(this.context.TEXTURE_2D, texture);
            this.context.texImage2D(this.context.TEXTURE_2D, 0, internalFormat, width, height, 0, textureFormat, texImageType, null);
            this.context.bindTexture(this.context.TEXTURE_2D, existingTextureBinding);
        }
        return textureMeta;
    }
    _getSupportedDepthFormats() {
        const supportedDepthFormats = [];
        if (this.context instanceof WebGLRenderingContext) {
            if (!this.context.getExtension('WEBGL_depth_texture')) {
                return supportedDepthFormats;
            }
        }
        supportedDepthFormats.push(this.context.DEPTH_COMPONENT, this.context.DEPTH_STENCIL);
        if (this.context instanceof WebGL2RenderingContext) {
            supportedDepthFormats.push(this.context.DEPTH_COMPONENT24, this.context.DEPTH24_STENCIL8);
        }
        return supportedDepthFormats;
    }
}

const defaultCylinderLayerInit = {
    colorFormat: 0x1908,
    mipLevels: 1,
    layout: XRLayerLayout.mono,
    isStatic: false,
    space: null,
    viewPixelHeight: 0,
    viewPixelWidth: 0,
    textureType: XRTextureType.texture,
    radius: 2.0,
    centralAngle: 0.78539,
    aspectRatio: 2.0,
};
const defaultMediaCylinderLayerInit = {
    layout: XRLayerLayout.mono,
    invertStereo: false,
    space: null,
    radius: 2.0,
    centralAngle: 0.78539,
};
class XRCylinderLayer extends XRCompositionLayerPolyfill {
    constructor(init, media) {
        super();
        this._media = media !== null && media !== void 0 ? media : null;
        if (this.isMediaLayer()) {
            this.init = Object.assign(Object.assign({}, defaultMediaCylinderLayerInit), init);
        }
        else {
            this.init = Object.assign(Object.assign({}, defaultCylinderLayerInit), init);
        }
        this.radius = this.init.radius;
        this.centralAngle = this.init.centralAngle;
        this.aspectRatio = this.init.aspectRatio;
        this.space = this.init.space;
        this.layout = this.init.layout;
        const _global = getGlobal();
        if (this.init.transform) {
            this.transform = new _global.XRRigidTransform(init.transform.position, init.transform.orientation);
        }
        else {
            this.transform = new _global.XRRigidTransform({
                x: 0,
                y: 0,
                z: 0,
                w: 1,
            });
        }
        if (!this.isMediaLayer()) {
            this.isStatic = init.isStatic;
        }
    }
    getTextureType() {
        if (this.isMediaLayer()) {
            return XRTextureType.texture;
        }
        return this.init.textureType;
    }
    _deferredInitialize() {
        let layout = this.determineLayoutAttribute(this.init.textureType, this.context, this.init.layout);
        this.layout = layout;
        this.needsRedraw = true;
    }
    get colorTextures() {
        if (this.isMediaLayer()) {
            throw new Error('Media layers do not have associated textures');
        }
        if (!this._colorTextures || !this._colorTextures.length) {
            this._allocateColorTexturesInternal(this.getTextureType(), this.init);
        }
        return this._colorTextures;
    }
    get depthStencilTextures() {
        if (this.isMediaLayer()) {
            throw new Error('Media layers do not have associated textures');
        }
        if (!this._depthStencilTextures || !this._depthStencilTextures.length) {
            this._allocateDepthStencilTexturesInternal(this.getTextureType(), this.init);
        }
        return this._depthStencilTextures;
    }
    get colorTexturesMeta() {
        if (this.isMediaLayer()) {
            throw new Error('Media layers do not have associated textures');
        }
        if (!this._colorTextures || !this._colorTextures.length) {
            this._allocateColorTexturesInternal(this.getTextureType(), this.init);
        }
        return this._texturesMeta;
    }
    get width() {
        const circumference = 2 * this.radius * Math.PI;
        const percentage = this.centralAngle / (2 * Math.PI);
        return circumference * percentage;
    }
    get height() {
        return this.width / this.aspectRatio;
    }
}

const defaultEquirectLayerInit = {
    colorFormat: 0x1908,
    mipLevels: 1,
    layout: XRLayerLayout.mono,
    isStatic: false,
    space: null,
    viewPixelHeight: 0,
    viewPixelWidth: 0,
    textureType: XRTextureType.texture,
    radius: 0,
    centralHorizontalAngle: 6.28318,
    upperVerticalAngle: 1.570795,
    lowerVerticalAngle: -1.570795,
};
const defaultMediaEquirectLayerInit = {
    space: null,
    layout: XRLayerLayout.mono,
    invertStereo: false,
    radius: 0,
    centralHorizontalAngle: 6.28318,
    upperVerticalAngle: 1.570795,
    lowerVerticalAngle: -1.570795,
};
class XREquirectLayer extends XRCompositionLayerPolyfill {
    constructor(init, media) {
        super();
        this._media = media !== null && media !== void 0 ? media : null;
        if (this.isMediaLayer()) {
            this.init = Object.assign(Object.assign({}, defaultMediaEquirectLayerInit), init);
        }
        else {
            this.init = Object.assign(Object.assign({}, defaultEquirectLayerInit), init);
        }
        if (!isReferenceSpace(this.init.space)) {
            throw new TypeError("Equirect layer's space needs to be an XRReferenceSpace");
        }
        this.radius = this.init.radius;
        this.centralHorizontalAngle = this.init.centralHorizontalAngle;
        this.upperVerticalAngle = this.init.upperVerticalAngle;
        this.lowerVerticalAngle = this.init.lowerVerticalAngle;
        this.space = this.init.space;
        this.layout = this.init.layout;
        const _global = getGlobal();
        if (init.transform) {
            this.transform = new _global.XRRigidTransform(init.transform.position, init.transform.orientation);
        }
        else {
            this.transform = new _global.XRRigidTransform({
                x: 0,
                y: 0,
                z: 0,
                w: 1,
            });
        }
        if (!this.isMediaLayer()) {
            this.isStatic = init.isStatic;
        }
    }
    getTextureType() {
        if (this.isMediaLayer()) {
            return XRTextureType.texture;
        }
        return this.init.textureType;
    }
    _deferredInitialize() {
        let layout = this.determineLayoutAttribute(this.init.textureType, this.context, this.init.layout);
        this.layout = layout;
        this.needsRedraw = true;
    }
    get colorTextures() {
        if (this.isMediaLayer()) {
            throw new Error('Media layers do not have associated textures');
        }
        if (!this._colorTextures || !this._colorTextures.length) {
            this._allocateColorTexturesInternal(this.getTextureType(), this.init);
        }
        return this._colorTextures;
    }
    get depthStencilTextures() {
        if (this.isMediaLayer()) {
            throw new Error('Media layers do not have associated textures');
        }
        if (!this._depthStencilTextures || !this._depthStencilTextures.length) {
            this._allocateDepthStencilTexturesInternal(this.getTextureType(), this.init);
        }
        return this._depthStencilTextures;
    }
    get colorTexturesMeta() {
        if (this.isMediaLayer()) {
            throw new Error('Media layers do not have associated textures');
        }
        if (!this._colorTextures || !this._colorTextures.length) {
            this._allocateColorTexturesInternal(this.getTextureType(), this.init);
        }
        return this._texturesMeta;
    }
}

const defaultQuadLayerInit = {
    colorFormat: 0x1908,
    mipLevels: 1,
    layout: XRLayerLayout.mono,
    isStatic: false,
    space: null,
    viewPixelHeight: 0,
    viewPixelWidth: 0,
    textureType: XRTextureType.texture,
    width: 1.0,
    height: 1.0,
};
const defaultMediaQuadLayerInit = {
    space: null,
    layout: XRLayerLayout.mono,
    invertStereo: false,
};
class XRQuadLayer extends XRCompositionLayerPolyfill {
    constructor(init, media) {
        super();
        this._media = media !== null && media !== void 0 ? media : null;
        if (this.isMediaLayer()) {
            this.init = Object.assign(Object.assign({}, defaultMediaQuadLayerInit), init);
        }
        else {
            this.init = Object.assign(Object.assign({}, defaultQuadLayerInit), init);
        }
        this.width = this.init.width;
        this.height = this.init.height;
        this.space = this.init.space;
        this.layout = this.init.layout;
        const _global = getGlobal();
        if (this.init.transform) {
            this.transform = new _global.XRRigidTransform(init.transform.position, init.transform.orientation);
        }
        else {
            this.transform = new _global.XRRigidTransform({
                x: 0,
                y: 0,
                z: 0,
                w: 1,
            });
        }
        if (!this.isMediaLayer()) {
            this.isStatic = init.isStatic;
        }
    }
    getTextureType() {
        if (this.isMediaLayer()) {
            return XRTextureType.texture;
        }
        return this.init.textureType;
    }
    _deferredInitialize() {
        let layout = this.determineLayoutAttribute(this.init.textureType, this.context, this.init.layout);
        this.layout = layout;
        this.needsRedraw = true;
    }
    get colorTextures() {
        if (this.isMediaLayer()) {
            throw new Error('Media layers do not have associated textures');
        }
        if (!this._colorTextures || !this._colorTextures.length) {
            this._allocateColorTexturesInternal(this.getTextureType(), this.init);
        }
        return this._colorTextures;
    }
    get depthStencilTextures() {
        if (this.isMediaLayer()) {
            throw new Error('Media layers do not have associated textures');
        }
        if (!this._depthStencilTextures || !this._depthStencilTextures.length) {
            this._allocateDepthStencilTexturesInternal(this.getTextureType(), this.init);
        }
        return this._depthStencilTextures;
    }
    get colorTexturesMeta() {
        if (this.isMediaLayer()) {
            throw new Error('Media layers do not have associated textures');
        }
        if (!this._colorTextures || !this._colorTextures.length) {
            this._allocateColorTexturesInternal(this.getTextureType(), this.init);
        }
        return this._texturesMeta;
    }
}

class XRMediaBindingPolyfill {
    constructor(session) {
        this.session = session;
        if (this.session.ended) {
            throw new Error('Session has ended');
        }
    }
    createQuadLayer(video, init) {
        if (this.session.ended) {
            throw new Error('Session has ended');
        }
        if (init.layout === XRLayerLayout.default) {
            throw new TypeError('Media Quad layer cannot be created with layout of default');
        }
        let aspectRatio = this.calculateAspectRatio(video, init.layout);
        if (init.width === undefined && init.height === undefined) {
            init.width = 1;
        }
        if (init.height === undefined) {
            init.height = init.width / aspectRatio;
        }
        if (init.width === undefined) {
            init.width = init.height / aspectRatio;
        }
        let layer = new XRQuadLayer(init, video);
        layer.needsRedraw = false;
        layer.initialize(this.session);
        return layer;
    }
    createCylinderLayer(video, init) {
        if (this.session.ended) {
            throw new Error('Session has ended');
        }
        if (init.layout === XRLayerLayout.default) {
            throw new TypeError('Media Cylinder layer cannot be created with layout of default');
        }
        let aspectRatio = this.calculateAspectRatio(video, init.layout);
        if (init.aspectRatio === undefined) {
            init.aspectRatio = aspectRatio;
        }
        let layer = new XRCylinderLayer(init, video);
        layer.needsRedraw = false;
        layer.initialize(this.session);
        return layer;
    }
    createEquirectLayer(video, init) {
        if (this.session.ended) {
            throw new Error('Session has ended');
        }
        if (init.layout === XRLayerLayout.default) {
            throw new TypeError('Media Equirect layer cannot be created with layout of default');
        }
        if (!isReferenceSpace(init.space)) {
            throw new Error("Media Equirect layer's space must be of type XRReferenceSpace");
        }
        let layer = new XREquirectLayer(init, video);
        layer.needsRedraw = false;
        layer.initialize(this.session);
        return layer;
    }
    calculateAspectRatio(video, layout) {
        let width = video.videoWidth;
        let height = video.videoHeight;
        if (layout === XRLayerLayout['stereo-left-right']) {
            width /= 2;
        }
        if (layout === XRLayerLayout['stereo-top-bottom']) {
            height /= 2;
        }
        return width / height;
    }
}

const defaultXRProjectionLayerInit = {
    textureType: XRTextureType.texture,
    colorFormat: 0x1908,
    depthFormat: 0x1902,
    scaleFactor: 1.0,
};
class XRProjectionLayer extends XRCompositionLayerPolyfill {
    constructor(init = defaultXRProjectionLayerInit) {
        super();
        this.init = Object.assign(Object.assign({}, defaultXRProjectionLayerInit), init);
    }
    _allocateProjectionColorTextures() {
        let array = [];
        let polyFillArray = [];
        const createTextureArray = () => {
            array = [];
            for (let tex of polyFillArray) {
                array.push(tex.texture);
            }
        };
        let session = this.session;
        let views = session.internalViews;
        if (!views || views.length === 0) {
            console.warn("We can't allocate color textures without views");
            return;
        }
        this.initializeIfNeeded();
        let baseLayer = session.getBaseLayer();
        let numViews = views.length;
        let width = baseLayer.framebufferWidth * this.init.scaleFactor;
        let height = baseLayer.framebufferHeight * this.init.scaleFactor;
        if (this.layout === XRLayerLayout.mono || this.layout === XRLayerLayout.default) {
            if (this.init.textureType === XRTextureType['texture-array']) {
                let texture = this._createNewColorTexture(width, height, XRTextureType['texture-array'], this.init.colorFormat, numViews);
                polyFillArray = [texture];
            }
            else {
                for (let view of views) {
                    let texture = this._createNewColorTexture(width, height, XRTextureType.texture, this.init.colorFormat);
                    polyFillArray.push(texture);
                }
            }
            createTextureArray();
            this._colorTexturesMeta = polyFillArray;
            this._colorTextures = array;
            return;
        }
        if (this.layout === XRLayerLayout['stereo-left-right']) {
            let texture = this._createNewColorTexture(width * numViews, height, this.init.textureType, this.init.colorFormat);
            polyFillArray = [texture];
        }
        else if (this.layout === XRLayerLayout['stereo-top-bottom']) {
            let texture = this._createNewColorTexture(width, height * numViews, this.init.textureType, this.init.colorFormat);
            polyFillArray = [texture];
        }
        createTextureArray();
        this._colorTexturesMeta = polyFillArray;
        this._colorTextures = array;
        return;
    }
    _allocateProjectionDepthStencilTextures() {
        let session = this.session;
        let views = session.internalViews;
        if (!views || views.length === 0) {
            return;
        }
        if (this.init.depthFormat === 0) {
            this._depthStencilTextures = [];
            return;
        }
        if (this.context instanceof WebGLRenderingContext) {
            let depthExtension = this.context.getExtension('WEBGL_depth_texture');
            if (!depthExtension) {
                this._depthStencilTextures = [];
                return;
            }
        }
        let array = [];
        let polyFillArray = [];
        const createTextureArray = () => {
            array = [];
            for (let tex of polyFillArray) {
                array.push(tex.texture);
            }
        };
        this.initializeIfNeeded();
        let baseLayer = session.getBaseLayer();
        let numViews = views.length;
        let width = baseLayer.framebufferWidth * this.init.scaleFactor;
        let height = baseLayer.framebufferHeight * this.init.scaleFactor;
        if (this.layout === XRLayerLayout.mono || this.layout === XRLayerLayout.default) {
            if (this.init.textureType === XRTextureType['texture-array']) {
                let texture = this._createNewDepthStencilTexture(width, height, this.init.textureType, this.init.depthFormat, numViews);
                polyFillArray = [texture];
            }
            else {
                for (let view of views) {
                    let texture = this._createNewDepthStencilTexture(width, height, this.init.textureType, this.init.depthFormat);
                    polyFillArray.push(texture);
                }
            }
            createTextureArray();
            this._depthStencilTextures = array;
            return;
        }
        if (this.layout === XRLayerLayout['stereo-left-right']) {
            let texture = this._createNewDepthStencilTexture(width * numViews, height, this.init.textureType, this.init.depthFormat);
            polyFillArray = [texture];
        }
        else if (this.layout === XRLayerLayout['stereo-top-bottom']) {
            let texture = this._createNewDepthStencilTexture(width, height * numViews, this.init.textureType, this.init.depthFormat);
            polyFillArray = [texture];
        }
        createTextureArray();
        this._depthStencilTextures = array;
        return;
    }
    get colorTextures() {
        if (!this._colorTextures || !this._colorTextures.length) {
            this._allocateProjectionColorTextures();
        }
        return this._colorTextures;
    }
    get depthStencilTextures() {
        if (this._depthStencilTextures === undefined) {
            this._allocateProjectionDepthStencilTextures();
        }
        return this._depthStencilTextures || [];
    }
    get colorTexturesMeta() {
        if (!this._colorTextures || !this._colorTextures.length) {
            this._allocateProjectionColorTextures();
        }
        return this._colorTexturesMeta;
    }
    getTextureType() {
        return this.init.textureType;
    }
    _deferredInitialize() {
        this.isStatic = false;
        if (!this.init.depthFormat) {
            this.ignoreDepthValues = false;
        }
        else {
            this.ignoreDepthValues = true;
        }
        this.fixedFoveation = 0;
        let layout = this.determineLayoutAttribute(this.init.textureType, this.context, XRLayerLayout.default);
        this.layout = layout;
        this.needsRedraw = true;
        let maxScaleFactor = this.determineMaximumScaleFactor();
        let scaleFactor = Math.min(this.init.scaleFactor, maxScaleFactor);
        this.init.scaleFactor = scaleFactor;
    }
    determineMaximumScaleFactor() {
        let baseLayer = this.session.getBaseLayer(this.context);
        let largestWidth = baseLayer.framebufferWidth;
        let largestHeight = baseLayer.framebufferHeight;
        if (this.layout === XRLayerLayout['stereo-left-right']) {
            largestWidth *= 2;
        }
        if (this.layout === XRLayerLayout['stereo-top-bottom']) {
            largestHeight *= 2;
        }
        let largestViewDimension = Math.max(largestWidth, largestHeight);
        let largestTextureDimension = this.context.getParameter(this.context.MAX_TEXTURE_SIZE);
        return largestTextureDimension / largestViewDimension;
    }
}

const initializeViewport = (viewport, texture, layout, offset, numViews) => {
    let x = 0;
    let y = 0;
    let width = texture.width;
    let height = texture.height;
    if (layout === XRLayerLayout['stereo-left-right']) {
        x = (texture.width * offset) / numViews;
        width = texture.width / numViews;
    }
    else if (layout === XRLayerLayout['stereo-top-bottom']) {
        y = (texture.height * offset) / numViews;
        height = texture.height / numViews;
    }
    viewport.x = x;
    viewport.y = y;
    viewport.width = width;
    viewport.height = height;
};

const compileShader = (gl, shaderSource, shaderType) => {
    var shader = gl.createShader(shaderType);
    gl.shaderSource(shader, shaderSource);
    gl.compileShader(shader);
    var success = gl.getShaderParameter(shader, gl.COMPILE_STATUS);
    if (!success) {
        throw 'could not compile shader:' + gl.getShaderInfoLog(shader);
    }
    return shader;
};
const createProgram = (gl, vertexShader, fragmentShader) => {
    const program = gl.createProgram();
    const compiledVS = compileShader(gl, vertexShader, gl.VERTEX_SHADER);
    const compiledFS = compileShader(gl, fragmentShader, gl.FRAGMENT_SHADER);
    gl.attachShader(program, compiledVS);
    gl.attachShader(program, compiledFS);
    gl.deleteShader(compiledVS);
    gl.deleteShader(compiledFS);
    gl.linkProgram(program);
    var success = gl.getProgramParameter(program, gl.LINK_STATUS);
    if (!success) {
        throw 'program failed to link:' + gl.getProgramInfoLog(program);
    }
    return program;
};
const setRectangle = (gl, x, y, width, height) => {
    var x1 = x;
    var x2 = x + width;
    var y1 = y;
    var y2 = y + height;
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([x1, y1, x2, y1, x1, y2, x1, y2, x2, y1, x2, y2]), gl.DYNAMIC_DRAW);
};
const applyVAOExtension = (gl) => {
    if (gl instanceof WebGL2RenderingContext) {
        return gl;
    }
    const ext = gl.getExtension('OES_vertex_array_object');
    if (!ext) {
        throw new Error('Cannot use VAOs.');
    }
    return {
        bindVertexArray: ext.bindVertexArrayOES.bind(ext),
        createVertexArray: ext.createVertexArrayOES.bind(ext),
        deleteVertexArray: ext.deleteVertexArrayOES.bind(ext),
        isVertexArray: ext.isVertexArrayOES.bind(ext),
    };
};

const glsl = (x) => x;
const vertexShader = glsl `
attribute vec2 a_position;
attribute vec2 a_texCoord;

varying vec2 v_texCoord;

void main() {
   // convert the rectangle from pixels to 0.0 to 1.0
   vec2 zeroToOne = a_position;

   // convert from 0->1 to 0->2
   vec2 zeroToTwo = zeroToOne * 2.0;

   // convert from 0->2 to -1->+1 (clipspace)
   vec2 clipSpace = zeroToTwo - 1.0;

   gl_Position = vec4(clipSpace * vec2(1, 1), 0, 1);

   // pass the texCoord to the fragment shader
   // The GPU will interpolate this value between points.
   v_texCoord = a_texCoord;
}
`;
const fragmentShader = glsl `
precision mediump float;

// our texture
uniform sampler2D u_image;

// the texCoords passed in from the vertex shader.
varying vec2 v_texCoord;

void main() {
   	vec4 tex = texture2D(u_image, v_texCoord);
	gl_FragColor = vec4(tex.rgb, tex.a);
}
`;
class ProjectionRenderer {
    constructor(layer, context) {
        this.gl = context;
        this.layer = layer;
        this.program = createProgram(this.gl, vertexShader, fragmentShader);
        this.programInfo = {
            attribLocations: {
                a_position: this.gl.getAttribLocation(this.program, 'a_position'),
                a_texCoord: this.gl.getAttribLocation(this.program, 'a_texCoord'),
            },
        };
        this._createVAOs();
    }
    render(session) {
        let gl = this.gl;
        let baseLayer = session.getBaseLayer();
        gl.viewport(0, 0, baseLayer.framebufferWidth, baseLayer.framebufferHeight);
        const textureType = this.layer.getTextureType();
        const existingTextureBinding = gl.getParameter(gl.TEXTURE_BINDING_2D);
        if (textureType === XRTextureType.texture) {
            gl.bindTexture(gl.TEXTURE_2D, this.layer.colorTextures[0]);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        }
        else {
            throw new Error(`Created a texture projection renderer instead of a texture-array projection renderer for a texture-array layer. 
This is probably an error with the polyfill itself; please file an issue on Github if you run into this.`);
        }
        for (let view of session.internalViews) {
            let viewport = baseLayer.getViewport(view);
            gl.viewport(viewport.x, viewport.y, viewport.width, viewport.height);
            if (this._shouldUseStereoTexturePoints()) {
                this._renderInternalStereo(view);
            }
            else {
                this._renderInternal();
            }
        }
        gl.bindTexture(gl.TEXTURE_2D, existingTextureBinding);
    }
    _renderInternal() {
        let gl = this.gl;
        const existingProgram = gl.getParameter(gl.CURRENT_PROGRAM);
        gl.useProgram(this.program);
        this.vaoGl.bindVertexArray(this.vao);
        var primitiveType = gl.TRIANGLES;
        var offset = 0;
        var count = 6;
        gl.drawArrays(primitiveType, offset, count);
        this.vaoGl.bindVertexArray(null);
        gl.useProgram(existingProgram);
    }
    _renderInternalStereo(view) {
        if (view.eye === 'none') {
            return this._renderInternal();
        }
        let gl = this.gl;
        this.vaoGl.bindVertexArray(this.vao);
        const existingProgram = gl.getParameter(gl.CURRENT_PROGRAM);
        gl.useProgram(this.program);
        this._setStereoTextureBuffer(view.eye === 'right' ? 1 : 0);
        var primitiveType = gl.TRIANGLES;
        var offset = 0;
        var count = 6;
        gl.drawArrays(primitiveType, offset, count);
        this.vaoGl.bindVertexArray(null);
        gl.useProgram(existingProgram);
    }
    _createVAOs() {
        this._createTextureUVs();
        let gl = this.gl;
        this.vaoGl = applyVAOExtension(gl);
        let positionBuffer = gl.createBuffer();
        this.vao = this.vaoGl.createVertexArray();
        this.vaoGl.bindVertexArray(this.vao);
        gl.enableVertexAttribArray(this.programInfo.attribLocations.a_position);
        gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
        setRectangle(gl, 0, 0, 1.0, 1.0);
        let size = 2;
        let type = gl.FLOAT;
        let normalize = false;
        let stride = 0;
        let offset = 0;
        gl.vertexAttribPointer(this.programInfo.attribLocations.a_position, size, type, normalize, stride, offset);
        this.texcoordBuffer = gl.createBuffer();
        gl.enableVertexAttribArray(this.programInfo.attribLocations.a_texCoord);
        gl.bindBuffer(gl.ARRAY_BUFFER, this.texcoordBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, this.texturePoints, gl.DYNAMIC_DRAW);
        gl.vertexAttribPointer(this.programInfo.attribLocations.a_texCoord, size, type, normalize, stride, offset);
        this.vaoGl.bindVertexArray(null);
        gl.bindBuffer(gl.ARRAY_BUFFER, null);
    }
    _setStereoTextureBuffer(index) {
        let gl = this.gl;
        gl.enableVertexAttribArray(this.programInfo.attribLocations.a_texCoord);
        gl.bindBuffer(gl.ARRAY_BUFFER, this.texcoordBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, this.stereoTexturePoints[index], gl.STATIC_DRAW);
        var size = 2;
        var type = gl.FLOAT;
        var normalize = false;
        var stride = 0;
        var offset = 0;
        gl.vertexAttribPointer(this.programInfo.attribLocations.a_texCoord, size, type, normalize, stride, offset);
        gl.bindBuffer(gl.ARRAY_BUFFER, null);
    }
    _createTextureUVs() {
        this.texturePoints = new Float32Array([
            0.0,
            0.0,
            1.0,
            0.0,
            0.0,
            1.0,
            0.0,
            1.0,
            1.0,
            0.0,
            1.0,
            1.0,
        ]);
        const viewport = {
            x: 0,
            y: 0,
            width: 1,
            height: 1,
        };
        if (this._shouldUseStereoTexturePoints()) {
            this.stereoTexturePoints = [];
            initializeViewport(viewport, this.layer.colorTexturesMeta[0], this.layer.layout, 0, 2);
            this.stereoTexturePoints[0] = this._offsetTextureUVsByRect(this.layer.colorTexturesMeta[0], this.texturePoints, viewport);
            initializeViewport(viewport, this.layer.colorTexturesMeta[0], this.layer.layout, 1, 2);
            this.stereoTexturePoints[1] = this._offsetTextureUVsByRect(this.layer.colorTexturesMeta[0], this.texturePoints, viewport);
        }
    }
    _offsetTextureUVsByRect(texture, inArray, textureRect) {
        textureRect = textureRect !== null && textureRect !== void 0 ? textureRect : {
            x: 0,
            y: 0,
            width: texture.width,
            height: texture.height,
        };
        const uX = textureRect.x / texture.width;
        const vY = textureRect.y / texture.height;
        const uW = textureRect.width / texture.width;
        const vH = textureRect.height / texture.height;
        const outArray = [];
        for (let i = 0; i < inArray.length; i += 2) {
            let u = inArray[i];
            let v = inArray[i + 1];
            let newU = u * uW + uX;
            let newV = v * vH + vY;
            outArray[i] = newU;
            outArray[i + 1] = newV;
        }
        return new Float32Array(outArray);
    }
    _shouldUseStereoTexturePoints() {
        return (this.layer.layout === XRLayerLayout['stereo-left-right'] ||
            this.layer.layout === XRLayerLayout['stereo-top-bottom']);
    }
}
const texArrayVertexShader = glsl `#version 300 es

in vec2 a_position;
in vec2 a_texCoord;

out vec2 v_texCoord;

void main() {
	// convert the rectangle from pixels to 0.0 to 1.0
	vec2 zeroToOne = a_position;

	// convert from 0->1 to 0->2
	vec2 zeroToTwo = zeroToOne * 2.0;
 
	// convert from 0->2 to -1->+1 (clipspace)
	vec2 clipSpace = zeroToTwo - 1.0;
 
	gl_Position = vec4(clipSpace * vec2(1, 1), 0, 1);
 
	// pass the texCoord to the fragment shader
	// The GPU will interpolate this value between points.
	v_texCoord = a_texCoord;
}
`;
const texArrayFragmentShader = glsl `#version 300 es
precision mediump float;
precision mediump int;
precision mediump sampler2DArray;

uniform sampler2DArray u_image;
uniform int u_layer;

in vec2 v_texCoord;

out vec4 fragColor;

void main() {
	vec4 tex = texture(u_image, vec3(v_texCoord.x, v_texCoord.y, u_layer));
 	fragColor = vec4(tex.rgb, tex.a);
}

`;
class ProjectionTextureArrayRenderer extends ProjectionRenderer {
    constructor(layer, context) {
        super(layer, context);
        this.program = createProgram(this.gl, texArrayVertexShader, texArrayFragmentShader);
        this._createVAOs();
        this.u_layerInfo = this.gl.getUniformLocation(this.program, 'u_layer');
    }
    render(session) {
        let gl = this.gl;
        let textureType = this.layer.getTextureType();
        if (textureType === XRTextureType.texture) {
            throw new Error('Using texture array projection renderer on a layer without texture array.');
        }
        let baseLayer = session.getBaseLayer();
        const existingTextureBinding = gl.getParameter(gl.TEXTURE_BINDING_2D_ARRAY);
        gl.bindTexture(gl.TEXTURE_2D_ARRAY, this.layer.colorTextures[0]);
        gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        for (let view of session.internalViews) {
            let index = session.getViewIndex(view);
            let viewport = baseLayer.getViewport(view);
            gl.viewport(viewport.x, viewport.y, viewport.width, viewport.height);
            this._renderInternal(index);
        }
        gl.bindTexture(gl.TEXTURE_2D_ARRAY, existingTextureBinding);
    }
    _renderInternal(layer = 0) {
        let gl = this.gl;
        const existingProgram = gl.getParameter(gl.CURRENT_PROGRAM);
        gl.useProgram(this.program);
        gl.bindVertexArray(this.vao);
        gl.uniform1i(this.u_layerInfo, layer);
        var primitiveType = gl.TRIANGLES;
        var offset = 0;
        var count = 6;
        gl.drawArrays(primitiveType, offset, count);
        gl.bindVertexArray(null);
        gl.useProgram(existingProgram);
    }
}
const createProjectionRenderer = (layer, context) => {
    if (layer.getTextureType() === XRTextureType['texture-array']) {
        if (context instanceof WebGL2RenderingContext) {
            return new ProjectionTextureArrayRenderer(layer, context);
        }
    }
    return new ProjectionRenderer(layer, context);
};

var ARRAY_TYPE = typeof Float32Array !== 'undefined' ? Float32Array : Array;
if (!Math.hypot) Math.hypot = function () {
  var y = 0,
      i = arguments.length;
  while (i--) {
    y += arguments[i] * arguments[i];
  }
  return Math.sqrt(y);
};

function create() {
  var out = new ARRAY_TYPE(16);
  if (ARRAY_TYPE != Float32Array) {
    out[1] = 0;
    out[2] = 0;
    out[3] = 0;
    out[4] = 0;
    out[6] = 0;
    out[7] = 0;
    out[8] = 0;
    out[9] = 0;
    out[11] = 0;
    out[12] = 0;
    out[13] = 0;
    out[14] = 0;
  }
  out[0] = 1;
  out[5] = 1;
  out[10] = 1;
  out[15] = 1;
  return out;
}
function multiply(out, a, b) {
  var a00 = a[0],
      a01 = a[1],
      a02 = a[2],
      a03 = a[3];
  var a10 = a[4],
      a11 = a[5],
      a12 = a[6],
      a13 = a[7];
  var a20 = a[8],
      a21 = a[9],
      a22 = a[10],
      a23 = a[11];
  var a30 = a[12],
      a31 = a[13],
      a32 = a[14],
      a33 = a[15];
  var b0 = b[0],
      b1 = b[1],
      b2 = b[2],
      b3 = b[3];
  out[0] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30;
  out[1] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31;
  out[2] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32;
  out[3] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33;
  b0 = b[4];
  b1 = b[5];
  b2 = b[6];
  b3 = b[7];
  out[4] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30;
  out[5] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31;
  out[6] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32;
  out[7] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33;
  b0 = b[8];
  b1 = b[9];
  b2 = b[10];
  b3 = b[11];
  out[8] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30;
  out[9] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31;
  out[10] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32;
  out[11] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33;
  b0 = b[12];
  b1 = b[13];
  b2 = b[14];
  b3 = b[15];
  out[12] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30;
  out[13] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31;
  out[14] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32;
  out[15] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33;
  return out;
}
function fromQuat(out, q) {
  var x = q[0],
      y = q[1],
      z = q[2],
      w = q[3];
  var x2 = x + x;
  var y2 = y + y;
  var z2 = z + z;
  var xx = x * x2;
  var yx = y * x2;
  var yy = y * y2;
  var zx = z * x2;
  var zy = z * y2;
  var zz = z * z2;
  var wx = w * x2;
  var wy = w * y2;
  var wz = w * z2;
  out[0] = 1 - yy - zz;
  out[1] = yx + wz;
  out[2] = zx - wy;
  out[3] = 0;
  out[4] = yx - wz;
  out[5] = 1 - xx - zz;
  out[6] = zy + wx;
  out[7] = 0;
  out[8] = zx + wy;
  out[9] = zy - wx;
  out[10] = 1 - xx - yy;
  out[11] = 0;
  out[12] = 0;
  out[13] = 0;
  out[14] = 0;
  out[15] = 1;
  return out;
}

function create$1() {
  var out = new ARRAY_TYPE(2);
  if (ARRAY_TYPE != Float32Array) {
    out[0] = 0;
    out[1] = 0;
  }
  return out;
}
(function () {
  var vec = create$1();
  return function (a, stride, offset, count, fn, arg) {
    var i, l;
    if (!stride) {
      stride = 2;
    }
    if (!offset) {
      offset = 0;
    }
    if (count) {
      l = Math.min(count * stride + offset, a.length);
    } else {
      l = a.length;
    }
    for (i = offset; i < l; i += stride) {
      vec[0] = a[i];
      vec[1] = a[i + 1];
      fn(vec, vec, arg);
      a[i] = vec[0];
      a[i + 1] = vec[1];
    }
    return a;
  };
})();

const glsl$1 = (x) => x;
const vertexShader$1 = glsl$1 `
attribute vec4 a_position;
attribute vec2 a_texCoord;

uniform mat4 u_matrix;
uniform mat4 u_projectionMatrix;

varying vec2 v_texCoord;

void main() {
  // Multiply the position by the matrix.
  gl_Position = u_projectionMatrix * u_matrix * a_position;

   // pass the texCoord to the fragment shader
   // The GPU will interpolate this value between points.
   v_texCoord = a_texCoord;
}
`;
const fragmentShader$1 = glsl$1 `
precision mediump float;

// our texture
uniform sampler2D u_image;

// the texCoords passed in from the vertex shader.
varying vec2 v_texCoord;

void main() {
   	vec4 tex = texture2D(u_image, v_texCoord);
	gl_FragColor = vec4(tex.rgb, tex.a);
	// gl_FragColor = vec4(1.0, 0, 0, 1.0);
}
`;
const texArrayVertexShader$1 = glsl$1 `#version 300 es

in vec4 a_position;
in vec2 a_texCoord;

uniform mat4 u_matrix;
uniform mat4 u_projectionMatrix;

out vec2 v_texCoord;

void main() {
	// Multiply the position by the matrix.
    gl_Position = u_projectionMatrix * u_matrix * a_position;
 
	// pass the texCoord to the fragment shader
	// The GPU will interpolate this value between points.
	v_texCoord = a_texCoord;
}
`;
const texArrayFragmentShader$1 = glsl$1 `#version 300 es
precision mediump float;
precision mediump int;
precision mediump sampler2DArray;

uniform sampler2DArray u_image;
uniform int u_layer;

in vec2 v_texCoord;

out vec4 fragColor;

void main() {
	vec4 tex = texture(u_image, vec3(v_texCoord.x, v_texCoord.y, u_layer));
 	fragColor = vec4(tex.rgb, tex.a);
}

`;
class CompositionLayerRenderer {
    constructor(layer, context) {
        this.usesTextureArrayShaders = false;
        this.gl = context;
        this.layer = layer;
        let gl = this.gl;
        this.transformMatrix = create();
        if (context instanceof WebGL2RenderingContext &&
            this.layer.getTextureType() === XRTextureType['texture-array']) {
            this.usesTextureArrayShaders = true;
        }
        if (this.usesTextureArrayShaders) {
            this.program = createProgram(gl, texArrayVertexShader$1, texArrayFragmentShader$1);
        }
        else {
            this.program = createProgram(gl, vertexShader$1, fragmentShader$1);
        }
        this.programInfo = {
            attribLocations: {
                a_position: gl.getAttribLocation(this.program, 'a_position'),
                a_texCoord: gl.getAttribLocation(this.program, 'a_texCoord'),
            },
            uniformLocations: {
                u_matrix: gl.getUniformLocation(this.program, 'u_matrix'),
                u_projectionMatrix: gl.getUniformLocation(this.program, 'u_projectionMatrix'),
            },
        };
        if (this.usesTextureArrayShaders) {
            this.programInfo.uniformLocations.u_layer = gl.getUniformLocation(this.program, 'u_layer');
        }
    }
    initialize() {
        let gl = this.gl;
        if (this.layer.isMediaLayer()) {
            this.mediaTexture = gl.createTexture();
            this.mediaTexturePolyfill = {
                texture: this.mediaTexture,
                textureFormat: gl.RGBA,
                width: this.layer.media.videoWidth,
                height: this.layer.media.videoHeight,
                type: XRTextureType.texture,
            };
            const existingTextureBinding = gl.getParameter(gl.TEXTURE_BINDING_2D);
            gl.bindTexture(gl.TEXTURE_2D, this.mediaTexture);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, this.layer.media.videoWidth, this.layer.media.videoHeight, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
            gl.bindTexture(gl.TEXTURE_2D, existingTextureBinding);
        }
        this._createVAOs();
    }
    render(session, frame) {
        let gl = this.gl;
        let baseLayer = session.getBaseLayer();
        let basePose = frame.getViewerPose(session.getReferenceSpace());
        for (let view of basePose.views) {
            let viewport = baseLayer.getViewport(view);
            gl.viewport(viewport.x, viewport.y, viewport.width, viewport.height);
            gl.activeTexture(gl.TEXTURE0);
            if (this.usesTextureArrayShaders) {
                if (gl instanceof WebGLRenderingContext) {
                    throw new Error('This should never happen; texture-arrays only supported on WebGL2.');
                }
                if (this.layer.isMediaLayer()) {
                    throw new Error('This should never happen. Media layers should never be created with texture-array');
                }
                const existingTextureBinding = gl.getParameter(gl.TEXTURE_BINDING_2D_ARRAY);
                gl.bindTexture(gl.TEXTURE_2D_ARRAY, this.layer.colorTextures[0]);
                gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
                gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
                let layer = 0;
                if (this.layer.layout === XRLayerLayout.stereo) {
                    switch (view.eye) {
                        case 'right':
                            layer = 1;
                            break;
                    }
                }
                if (this._shouldUseStereoTexturePoints()) {
                    this._renderInternalStereo(session, frame, view, layer);
                }
                else {
                    this._renderInternal(session, frame, view, layer);
                }
                gl.bindTexture(gl.TEXTURE_2D_ARRAY, existingTextureBinding);
            }
            else {
                const existingTextureBinding = gl.getParameter(gl.TEXTURE_BINDING_2D);
                if (this.layer.isMediaLayer()) {
                    gl.bindTexture(gl.TEXTURE_2D, this.mediaTexture);
                    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
                    gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, this.layer.media.videoWidth, this.layer.media.videoHeight, gl.RGBA, gl.UNSIGNED_BYTE, this.layer.media);
                }
                else if (this.layer.layout === XRLayerLayout.stereo) {
                    switch (view.eye) {
                        case 'right':
                            gl.bindTexture(gl.TEXTURE_2D, this.layer.colorTextures[1]);
                            break;
                        default:
                            gl.bindTexture(gl.TEXTURE_2D, this.layer.colorTextures[0]);
                    }
                }
                else {
                    gl.bindTexture(gl.TEXTURE_2D, this.layer.colorTextures[0]);
                }
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
                if (this._shouldUseStereoTexturePoints()) {
                    this._renderInternalStereo(session, frame, view);
                }
                else {
                    this._renderInternal(session, frame, view);
                }
                gl.bindTexture(gl.TEXTURE_2D, existingTextureBinding);
            }
        }
    }
    createPositionPoints() {
        return new Float32Array([]);
    }
    createTextureUVs() {
        return new Float32Array([]);
    }
    _offsetTextureUVsByRect(texture, inArray, textureRect) {
        textureRect = textureRect !== null && textureRect !== void 0 ? textureRect : {
            x: 0,
            y: 0,
            width: texture.width,
            height: texture.height,
        };
        const uX = textureRect.x / texture.width;
        const vY = textureRect.y / texture.height;
        const uW = textureRect.width / texture.width;
        const vH = textureRect.height / texture.height;
        const outArray = [];
        for (let i = 0; i < inArray.length; i += 2) {
            let u = inArray[i];
            let v = inArray[i + 1];
            let newU = u * uW + uX;
            let newV = v * vH + vY;
            outArray[i] = newU;
            outArray[i + 1] = newV;
        }
        return new Float32Array(outArray);
    }
    _shouldUseStereoTexturePoints() {
        return (this.layer.layout === XRLayerLayout['stereo-left-right'] ||
            this.layer.layout === XRLayerLayout['stereo-top-bottom']);
    }
    _setStereoTextureBuffer(index) {
        let gl = this.gl;
        gl.enableVertexAttribArray(this.programInfo.attribLocations.a_texCoord);
        gl.bindBuffer(gl.ARRAY_BUFFER, this.texcoordBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, this.stereoTexturePoints[index], gl.STATIC_DRAW);
        var size = 2;
        var type = gl.FLOAT;
        var normalize = false;
        var stride = 0;
        var offset = 0;
        gl.vertexAttribPointer(this.programInfo.attribLocations.a_texCoord, size, type, normalize, stride, offset);
        gl.bindBuffer(gl.ARRAY_BUFFER, null);
    }
    _recalculateVertices() {
        this.positionPoints = this.createPositionPoints();
        this.texturePoints = this.createTextureUVs();
        const viewport = {
            x: 0,
            y: 0,
            width: 1,
            height: 1,
        };
        if (this._shouldUseStereoTexturePoints()) {
            this.stereoTexturePoints = [];
            if (this.layer.isMediaLayer()) {
                initializeViewport(viewport, this.mediaTexturePolyfill, this.layer.layout, 0, 2);
                this.stereoTexturePoints[0] = this._offsetTextureUVsByRect(this.mediaTexturePolyfill, this.texturePoints, viewport);
                initializeViewport(viewport, this.mediaTexturePolyfill, this.layer.layout, 1, 2);
                this.stereoTexturePoints[1] = this._offsetTextureUVsByRect(this.mediaTexturePolyfill, this.texturePoints, viewport);
                if (this.layer.layout === XRLayerLayout['stereo-top-bottom']) {
                    [this.stereoTexturePoints[0], this.stereoTexturePoints[1]] = [
                        this.stereoTexturePoints[1],
                        this.stereoTexturePoints[0],
                    ];
                }
                return;
            }
            initializeViewport(viewport, this.layer.colorTexturesMeta[0], this.layer.layout, 0, 2);
            this.stereoTexturePoints[0] = this._offsetTextureUVsByRect(this.layer.colorTexturesMeta[0], this.texturePoints, viewport);
            initializeViewport(viewport, this.layer.colorTexturesMeta[0], this.layer.layout, 1, 2);
            this.stereoTexturePoints[1] = this._offsetTextureUVsByRect(this.layer.colorTexturesMeta[0], this.texturePoints, viewport);
            if (this.layer.layout === XRLayerLayout['stereo-top-bottom']) {
                [this.stereoTexturePoints[0], this.stereoTexturePoints[1]] = [
                    this.stereoTexturePoints[1],
                    this.stereoTexturePoints[0],
                ];
            }
        }
    }
    _createVAOs() {
        this._recalculateVertices();
        let gl = this.gl;
        this.vaoGl = applyVAOExtension(gl);
        let positionBuffer = gl.createBuffer();
        this.vao = this.vaoGl.createVertexArray();
        this.vaoGl.bindVertexArray(this.vao);
        gl.enableVertexAttribArray(this.programInfo.attribLocations.a_position);
        gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
        const positions = this.positionPoints;
        gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);
        var size = 3;
        var type = gl.FLOAT;
        var normalize = false;
        var stride = 0;
        var offset = 0;
        gl.vertexAttribPointer(this.programInfo.attribLocations.a_position, size, type, normalize, stride, offset);
        gl.enableVertexAttribArray(this.programInfo.attribLocations.a_texCoord);
        this.texcoordBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.texcoordBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, this.texturePoints, gl.STATIC_DRAW);
        var size = 2;
        var type = gl.FLOAT;
        var normalize = false;
        var stride = 0;
        var offset = 0;
        gl.vertexAttribPointer(this.programInfo.attribLocations.a_texCoord, size, type, normalize, stride, offset);
        this.vaoGl.bindVertexArray(null);
        gl.bindBuffer(gl.ARRAY_BUFFER, null);
    }
    _renderInternal(session, frame, view, layer) {
        let gl = this.gl;
        const existingProgram = gl.getParameter(gl.CURRENT_PROGRAM);
        gl.useProgram(this.program);
        this.vaoGl.bindVertexArray(this.vao);
        if (this.usesTextureArrayShaders) {
            gl.uniform1i(this.programInfo.uniformLocations.u_layer, layer);
        }
        this._setTransformMatrix(session, frame, view);
        gl.uniformMatrix4fv(this.programInfo.uniformLocations.u_matrix, false, this.transformMatrix);
        gl.uniformMatrix4fv(this.programInfo.uniformLocations.u_projectionMatrix, false, view.projectionMatrix);
        var primitiveType = gl.TRIANGLES;
        var offset = 0;
        var count = this.positionPoints.length / 3;
        gl.drawArrays(primitiveType, offset, count);
        this.vaoGl.bindVertexArray(null);
        gl.useProgram(existingProgram);
    }
    _renderInternalStereo(session, frame, view, layer) {
        if (view.eye === 'none') {
            return this._renderInternal(session, frame, view);
        }
        let gl = this.gl;
        this.vaoGl.bindVertexArray(this.vao);
        const existingProgram = gl.getParameter(gl.CURRENT_PROGRAM);
        gl.useProgram(this.program);
        this._setStereoTextureBuffer(view.eye === 'right' ? 1 : 0);
        if (this.usesTextureArrayShaders) {
            gl.uniform1i(this.programInfo.uniformLocations.u_layer, layer);
        }
        this._setTransformMatrix(session, frame, view);
        gl.uniformMatrix4fv(this.programInfo.uniformLocations.u_matrix, false, this.transformMatrix);
        gl.uniformMatrix4fv(this.programInfo.uniformLocations.u_projectionMatrix, false, view.projectionMatrix);
        var primitiveType = gl.TRIANGLES;
        var offset = 0;
        var count = this.positionPoints.length / 3;
        gl.drawArrays(primitiveType, offset, count);
        this.vaoGl.bindVertexArray(null);
        gl.useProgram(existingProgram);
    }
    _setTransformMatrix(session, frame, view) {
        let objPose = frame.getPose(this.layer.space, session.getReferenceSpace());
        multiply(this.transformMatrix, objPose.transform.matrix, this.layer.transform.matrix);
        multiply(this.transformMatrix, view.transform.inverse.matrix, this.transformMatrix);
    }
}

class QuadRenderer extends CompositionLayerRenderer {
    constructor(layer, context) {
        super(layer, context);
        this.initialize();
    }
    createPositionPoints() {
        const width = this.layer.width;
        const height = this.layer.height;
        const z = 0;
        const positions = [
            -width,
            -height,
            z,
            width,
            -height,
            z,
            -width,
            height,
            z,
            -width,
            height,
            z,
            width,
            -height,
            z,
            width,
            height,
            z,
        ];
        return new Float32Array(positions);
    }
    createTextureUVs() {
        return new Float32Array([0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 1.0, 1.0, 0.0, 1.0, 1.0]);
    }
}

class CylinderRenderer extends CompositionLayerRenderer {
    constructor(layer, context) {
        super(layer, context);
        this.segments = 16;
        this.initialize();
    }
    createPositionPoints() {
        const positions = [];
        const angle = this.layer.centralAngle;
        const height = this.layer.height;
        const radius = this.layer.radius;
        const radiansPerSegment = angle / this.segments;
        const theta = Math.PI / 2 - angle / 2;
        const unitCirclePositions = [];
        const firstUnitPoint = create$1();
        firstUnitPoint[0] = radius * Math.cos(theta);
        firstUnitPoint[1] = -radius * Math.sin(theta);
        unitCirclePositions.push(firstUnitPoint);
        for (let i = 0; i < this.segments; i++) {
            const nextPoint = create$1();
            nextPoint[0] = radius * Math.cos(theta + radiansPerSegment * (i + 1));
            nextPoint[1] = -radius * Math.sin(theta + radiansPerSegment * (i + 1));
            unitCirclePositions.push(nextPoint);
        }
        unitCirclePositions.reverse();
        for (let i = 0; i < this.segments; i++) {
            const u = unitCirclePositions[i];
            const v = unitCirclePositions[i + 1];
            positions.push(u[0], -height / 2, u[1]);
            positions.push(v[0], -height / 2, v[1]);
            positions.push(u[0], height / 2, u[1]);
            positions.push(u[0], height / 2, u[1]);
            positions.push(v[0], -height / 2, v[1]);
            positions.push(v[0], height / 2, v[1]);
        }
        return new Float32Array(positions);
    }
    createTextureUVs() {
        let textureUVs = [];
        const texturePercent = 1.0 / this.segments;
        for (let i = 0; i < this.segments; i++) {
            let leftX = texturePercent * i;
            let rightX = texturePercent * (i + 1);
            textureUVs.push(leftX, 0);
            textureUVs.push(rightX, 0);
            textureUVs.push(leftX, 1);
            textureUVs.push(leftX, 1);
            textureUVs.push(rightX, 0);
            textureUVs.push(rightX, 1);
        }
        return new Float32Array(textureUVs);
    }
}

class EquirectRenderer extends CompositionLayerRenderer {
    constructor(layer, context) {
        super(layer, context);
        this.segmentsPerAxis = 40;
        this.initialize();
    }
    createPositionPoints() {
        const positions = [];
        const radius = this.layer.radius || 1;
        const horizAngle = this.layer.centralHorizontalAngle;
        const phi1 = this.layer.upperVerticalAngle + Math.PI / 2;
        const phi2 = this.layer.lowerVerticalAngle + Math.PI / 2;
        const startPhi = phi1;
        const endPhi = phi2;
        const startTheta = Math.PI / 2 - horizAngle / 2;
        const endTheta = startTheta + horizAngle;
        const phiRange = endPhi - startPhi;
        const thetaRange = endTheta - startTheta;
        const basePoints = [];
        for (let y = 0; y <= this.segmentsPerAxis; y++) {
            for (let x = 0; x <= this.segmentsPerAxis; x++) {
                const u = x / this.segmentsPerAxis;
                const v = y / this.segmentsPerAxis;
                let r = radius;
                let theta = endTheta - thetaRange * u;
                let phi = phiRange * v + startPhi;
                const ux = Math.cos(theta) * Math.sin(phi);
                const uy = Math.cos(phi);
                const uz = -Math.sin(theta) * Math.sin(phi);
                basePoints.push([r * ux, r * uy, r * uz]);
            }
        }
        const numVertsAround = this.segmentsPerAxis + 1;
        for (let x = 0; x < this.segmentsPerAxis; x++) {
            for (let y = 0; y < this.segmentsPerAxis; y++) {
                positions.push(...basePoints[y * numVertsAround + x]);
                positions.push(...basePoints[y * numVertsAround + x + 1]);
                positions.push(...basePoints[(y + 1) * numVertsAround + x]);
                positions.push(...basePoints[(y + 1) * numVertsAround + x]);
                positions.push(...basePoints[y * numVertsAround + x + 1]);
                positions.push(...basePoints[(y + 1) * numVertsAround + x + 1]);
            }
        }
        return new Float32Array(positions);
    }
    createTextureUVs() {
        const triUVs = [];
        const baseUVs = [];
        for (let y = 0; y <= this.segmentsPerAxis; y++) {
            for (let x = 0; x <= this.segmentsPerAxis; x++) {
                const u = x / this.segmentsPerAxis;
                const v = y / this.segmentsPerAxis;
                baseUVs.push([u, v]);
            }
        }
        const numVertsAround = this.segmentsPerAxis + 1;
        for (let x = 0; x < this.segmentsPerAxis; x++) {
            for (let y = 0; y < this.segmentsPerAxis; y++) {
                triUVs.push(...baseUVs[y * numVertsAround + x]);
                triUVs.push(...baseUVs[y * numVertsAround + x + 1]);
                triUVs.push(...baseUVs[(y + 1) * numVertsAround + x]);
                triUVs.push(...baseUVs[(y + 1) * numVertsAround + x]);
                triUVs.push(...baseUVs[y * numVertsAround + x + 1]);
                triUVs.push(...baseUVs[(y + 1) * numVertsAround + x + 1]);
            }
        }
        return new Float32Array(triUVs);
    }
}

const defaultCubeLayerInit = {
    colorFormat: 0x1908,
    mipLevels: 1,
    layout: XRLayerLayout.mono,
    isStatic: false,
    space: null,
    viewPixelHeight: 0,
    viewPixelWidth: 0,
};
class XRCubeLayer extends XRCompositionLayerPolyfill {
    constructor(init = defaultCubeLayerInit) {
        super();
        if (!isReferenceSpace(init.space)) {
            throw new TypeError("XRCubeLayer's space needs to be an XRReferenceSpace");
        }
        this.init = Object.assign(Object.assign({}, defaultCubeLayerInit), init);
        this.space = this.init.space;
        this.isStatic = this.init.isStatic;
        if (this.init.orientation) {
            this.orientation = DOMPointReadOnly.fromPoint(this.init.orientation);
        }
        else {
            this.orientation = new DOMPointReadOnly();
        }
        switch (this.init.layout) {
            case XRLayerLayout.default:
            case XRLayerLayout['stereo-left-right']:
            case XRLayerLayout['stereo-top-bottom']:
                throw new TypeError('Invalid layout format for XRCubeLayer');
        }
        this.layout = this.init.layout;
        this.needsRedraw = true;
    }
    initialize(session, context) {
        super.initialize(session, context);
        this._allocateColorTexturesInternal();
        this._allocateDepthStencilTexturesInternal();
    }
    _allocateColorTexturesInternal() {
        this._colorTextures = [];
        this._texturesMeta = [];
        if (this.layout === XRLayerLayout.mono) {
            const colorTexture = this._createCubeColorTexture();
            this._texturesMeta.push(colorTexture);
            this._colorTextures.push(colorTexture.texture);
            return;
        }
        else {
            const texture1 = this._createCubeColorTexture();
            const texture2 = this._createCubeColorTexture();
            this._texturesMeta.push(texture1, texture2);
            this._colorTextures.push(texture1.texture, texture2.texture);
            return;
        }
    }
    _allocateDepthStencilTexturesInternal() {
        this._depthStencilTextures = [];
        if (!this.init.depthFormat) {
            return;
        }
        if (this.context instanceof WebGLRenderingContext) {
            let depthExtension = this.context.getExtension('WEBGL_depth_texture');
            if (!depthExtension) {
                throw new TypeError('Depth textures not supported in the current context');
            }
        }
        if (this.layout === XRLayerLayout.mono) {
            const depthTexture = this._createCubeDepthTexture();
            this._depthStencilTextures.push(depthTexture.texture);
            return;
        }
        else {
            const texture1 = this._createCubeDepthTexture();
            const texture2 = this._createCubeDepthTexture();
            this._depthStencilTextures.push(texture1.texture, texture2.texture);
            return;
        }
    }
    _createCubeColorTexture() {
        let texture = this.context.createTexture();
        let textureMeta = {
            width: this.init.viewPixelWidth,
            height: this.init.viewPixelHeight,
            layers: 1,
            type: XRTextureType.texture,
            textureFormat: this.init.colorFormat,
            texture,
        };
        const existingTextureBinding = this.context.getParameter(this.context.TEXTURE_BINDING_CUBE_MAP);
        this.context.bindTexture(this.context.TEXTURE_CUBE_MAP, texture);
        for (let i = 0; i < 6; i++) {
            this.context.texImage2D(this.context.TEXTURE_CUBE_MAP_POSITIVE_X + i, 0, textureMeta.textureFormat, textureMeta.width, textureMeta.height, 0, textureMeta.textureFormat, this.context.UNSIGNED_BYTE, null);
        }
        this.context.bindTexture(this.context.TEXTURE_CUBE_MAP, existingTextureBinding);
        return textureMeta;
    }
    _createCubeDepthTexture() {
        let texture = this.context.createTexture();
        let textureMeta = {
            width: this.init.viewPixelWidth,
            height: this.init.viewPixelHeight,
            layers: 1,
            type: XRTextureType.texture,
            textureFormat: this.init.depthFormat,
            texture,
        };
        const existingTextureBinding = this.context.getParameter(this.context.TEXTURE_BINDING_CUBE_MAP);
        this.context.bindTexture(this.context.TEXTURE_CUBE_MAP, texture);
        let internalFormat = this.init.depthFormat;
        if (this.context instanceof WebGL2RenderingContext) {
            if (internalFormat === this.context.DEPTH_COMPONENT) {
                internalFormat = this.context.DEPTH_COMPONENT24;
            }
            if (internalFormat === this.context.DEPTH_STENCIL) {
                internalFormat = this.context.DEPTH24_STENCIL8;
            }
        }
        for (let i = 0; i < 6; i++) {
            this.context.texImage2D(this.context.TEXTURE_CUBE_MAP_POSITIVE_X + i, 0, internalFormat, textureMeta.width, textureMeta.height, 0, textureMeta.textureFormat, this.context.UNSIGNED_INT, null);
        }
        this.context.bindTexture(this.context.TEXTURE_CUBE_MAP, existingTextureBinding);
        return textureMeta;
    }
    getTextureType() {
        return XRTextureType.texture;
    }
}

const glsl$2 = (x) => x;
const vertexShader$2 = glsl$2 `
attribute vec4 a_position;
uniform mat4 u_projectionMatrix;
uniform mat4 u_matrix;
varying vec3 v_normal;

void main() {
   gl_Position = u_projectionMatrix * u_matrix * a_position;

   v_normal = normalize(a_position.xyz);
}
`;
const fragmentShader$2 = glsl$2 `
precision mediump float;

varying vec3 v_normal;

uniform samplerCube u_texture;

void main() {
   gl_FragColor = textureCube(u_texture, normalize(v_normal));
}
`;
class CubeRenderer {
    constructor(layer, gl) {
        this.layer = layer;
        this.gl = gl;
        this.transformMatrix = create();
        this.program = createProgram(gl, vertexShader$2, fragmentShader$2);
        this.programInfo = {
            attribLocations: {
                a_position: gl.getAttribLocation(this.program, 'a_position'),
            },
            uniformLocations: {
                u_matrix: gl.getUniformLocation(this.program, 'u_matrix'),
                u_texture: gl.getUniformLocation(this.program, 'u_texture'),
                u_projectionMatrix: gl.getUniformLocation(this.program, 'u_projectionMatrix'),
            },
        };
        this._createVAOs();
    }
    render(session, frame) {
        let gl = this.gl;
        let baseLayer = session.getBaseLayer();
        let basePose = frame.getViewerPose(session.getReferenceSpace());
        for (let view of basePose.views) {
            let viewport = baseLayer.getViewport(view);
            gl.viewport(viewport.x, viewport.y, viewport.width, viewport.height);
            gl.activeTexture(gl.TEXTURE0);
            const existingTextureBinding = gl.getParameter(gl.TEXTURE_BINDING_CUBE_MAP);
            if (this.layer.layout === XRLayerLayout.stereo) {
                const index = view.eye === 'right' ? 1 : 0;
                gl.bindTexture(gl.TEXTURE_CUBE_MAP, this.layer.colorTextures[index]);
            }
            else {
                gl.bindTexture(gl.TEXTURE_CUBE_MAP, this.layer.colorTextures[0]);
            }
            gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
            gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
            this._renderInternal(this.layer.orientation, view);
            gl.bindTexture(gl.TEXTURE_CUBE_MAP, existingTextureBinding);
        }
    }
    createPositionPoints() {
        const w = 0.5;
        const positions = [
            -w, -w, -w,
            -w, w, -w,
            w, -w, -w,
            -w, w, -w,
            w, w, -w,
            w, -w, -w,
            -w, -w, w,
            w, -w, w,
            -w, w, w,
            -w, w, w,
            w, -w, w,
            w, w, w,
            -w, w, -w,
            -w, w, w,
            w, w, -w,
            -w, w, w,
            w, w, w,
            w, w, -w,
            -w, -w, -w,
            w, -w, -w,
            -w, -w, w,
            -w, -w, w,
            w, -w, -w,
            w, -w, w,
            -w, -w, -w,
            -w, -w, w,
            -w, w, -w,
            -w, -w, w,
            -w, w, w,
            -w, w, -w,
            w, -w, -w,
            w, w, -w,
            w, -w, w,
            w, -w, w,
            w, w, -w,
            w, w, w,
        ];
        return new Float32Array(positions);
    }
    _renderInternal(orientation, view) {
        let gl = this.gl;
        const existingProgram = gl.getParameter(gl.CURRENT_PROGRAM);
        gl.useProgram(this.program);
        this.vaoGl.bindVertexArray(this.vao);
        fromQuat(this.transformMatrix, [
            orientation.x,
            orientation.y,
            orientation.z,
            orientation.w,
        ]);
        if (!this._poseOrientationMatrix) {
            this._poseOrientationMatrix = create();
        }
        fromQuat(this._poseOrientationMatrix, [
            view.transform.inverse.orientation.x,
            view.transform.inverse.orientation.y,
            view.transform.inverse.orientation.z,
            view.transform.inverse.orientation.w,
        ]);
        multiply(this.transformMatrix, this.transformMatrix, this._poseOrientationMatrix);
        gl.uniformMatrix4fv(this.programInfo.uniformLocations.u_matrix, false, this.transformMatrix);
        gl.uniformMatrix4fv(this.programInfo.uniformLocations.u_projectionMatrix, false, view.projectionMatrix);
        gl.uniform1i(this.programInfo.uniformLocations.u_texture, 0);
        var primitiveType = gl.TRIANGLES;
        var offset = 0;
        var count = this.positionPoints.length / 3;
        gl.drawArrays(primitiveType, offset, count);
        this.vaoGl.bindVertexArray(null);
        gl.useProgram(existingProgram);
    }
    _recalculateVertices() {
        this.positionPoints = this.createPositionPoints();
    }
    _createVAOs() {
        this._recalculateVertices();
        let gl = this.gl;
        this.vaoGl = applyVAOExtension(gl);
        let positionBuffer = gl.createBuffer();
        this.vao = this.vaoGl.createVertexArray();
        this.vaoGl.bindVertexArray(this.vao);
        gl.enableVertexAttribArray(this.programInfo.attribLocations.a_position);
        gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
        const positions = this.positionPoints;
        gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);
        var size = 3;
        var type = gl.FLOAT;
        var normalize = false;
        var stride = 0;
        var offset = 0;
        gl.vertexAttribPointer(this.programInfo.attribLocations.a_position, size, type, normalize, stride, offset);
        this.vaoGl.bindVertexArray(null);
        gl.bindBuffer(gl.ARRAY_BUFFER, null);
    }
}

class XRSessionWithLayer {
    constructor() {
        this.mode = 'inline';
        this.layers = [];
        this.views = [];
        this.initializedViews = false;
        this.isPolyfillActive = false;
        this.taskQueue = [];
    }
    requestAnimationFrame(animationFrameCallback) {
        if (!this.injectedFrameCallback) {
            this.injectedFrameCallback = (time, frame) => {
                let gl = this.context;
                if (!this.initializedViews && this.referenceSpace) {
                    let pose = frame.getViewerPose(this.referenceSpace);
                    if (pose) {
                        this.views = pose.views;
                        this.initializedViews = true;
                    }
                }
                if (this.isPolyfillActive) {
                    if (!this.tempFramebuffer) {
                        this.tempFramebuffer = gl.createFramebuffer();
                    }
                    gl.bindFramebuffer(gl.FRAMEBUFFER, this.tempFramebuffer);
                    const existingClearColor = gl.getParameter(gl.COLOR_CLEAR_VALUE);
                    gl.clearColor(0, 0, 0, 0);
                    for (let layer of this.layers) {
                        if (!(layer instanceof XRProjectionLayer)) {
                            continue;
                        }
                        for (let i = 0; i < layer.colorTextures.length; i++) {
                            let textureType = layer.colorTexturesMeta[i].type;
                            if (textureType === XRTextureType['texture-array']) ;
                            else {
                                gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, layer.colorTextures[i], 0);
                                if (layer.depthStencilTextures && i < layer.depthStencilTextures.length) {
                                    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.TEXTURE_2D, layer.depthStencilTextures[i], 0);
                                }
                                else {
                                    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.TEXTURE_2D, null, 0);
                                }
                                gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
                            }
                        }
                    }
                    gl.bindFramebuffer(gl.FRAMEBUFFER, this.getBaseLayer().framebuffer);
                    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
                    gl.clearColor(existingClearColor[0], existingClearColor[1], existingClearColor[2], existingClearColor[3]);
                }
                animationFrameCallback(time, frame);
                if (this.isPolyfillActive && this.initializedViews) {
                    let prevBlend = gl.isEnabled(gl.BLEND);
                    let prevDepthTest = gl.isEnabled(gl.DEPTH_TEST);
                    let prevCullFace = gl.isEnabled(gl.CULL_FACE);
                    gl.bindFramebuffer(gl.FRAMEBUFFER, this.getBaseLayer().framebuffer);
                    gl.enable(gl.BLEND);
                    gl.disable(gl.DEPTH_TEST);
                    gl.disable(gl.CULL_FACE);
                    let prevBlendSrcRGB = gl.getParameter(gl.BLEND_SRC_RGB);
                    let prevBlendSrcAlpha = gl.getParameter(gl.BLEND_SRC_ALPHA);
                    let prevBlendDestRGB = gl.getParameter(gl.BLEND_DST_RGB);
                    let prevBlendDestAlpha = gl.getParameter(gl.BLEND_DST_ALPHA);
                    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
                    for (let layer of this.layers) {
                        if (!this.renderers) {
                            this.renderers = new WeakMap();
                        }
                        if (layer instanceof XRProjectionLayer) {
                            if (!this.renderers.has(layer)) {
                                this.renderers.set(layer, createProjectionRenderer(layer, this.context));
                            }
                            const renderer = this.renderers.get(layer);
                            renderer.render(this);
                        }
                        else if (layer instanceof XRQuadLayer) {
                            if (!this.renderers.has(layer)) {
                                this.renderers.set(layer, new QuadRenderer(layer, this.context));
                            }
                            const renderer = this.renderers.get(layer);
                            renderer.render(this, frame);
                        }
                        else if (layer instanceof XRCylinderLayer) {
                            if (!this.renderers.has(layer)) {
                                this.renderers.set(layer, new CylinderRenderer(layer, this.context));
                            }
                            const renderer = this.renderers.get(layer);
                            renderer.render(this, frame);
                        }
                        else if (layer instanceof XREquirectLayer) {
                            if (!this.renderers.has(layer)) {
                                this.renderers.set(layer, new EquirectRenderer(layer, this.context));
                            }
                            const renderer = this.renderers.get(layer);
                            renderer.render(this, frame);
                        }
                        else if (layer instanceof XRCubeLayer) {
                            if (!this.renderers.has(layer)) {
                                this.renderers.set(layer, new CubeRenderer(layer, this.context));
                            }
                            const renderer = this.renderers.get(layer);
                            renderer.render(this, frame);
                        }
                        else {
                            const webglLayer = layer;
                            if (webglLayer.framebuffer === null) {
                                continue;
                            }
                            if (gl instanceof WebGL2RenderingContext) {
                                gl.bindFramebuffer(gl.READ_FRAMEBUFFER, webglLayer.framebuffer);
                                gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, this.getBaseLayer().framebuffer);
                                gl.blitFramebuffer(0, 0, webglLayer.framebufferWidth, webglLayer.framebufferHeight, 0, 0, this.getBaseLayer().framebufferWidth, this.getBaseLayer().framebufferHeight, gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT, gl.LINEAR);
                            }
                            else {
                                console.warn('GL blitFramebuffer is not supported on WebGL1, so XRWebGLLayers may not show up properly when polyfilled.');
                            }
                        }
                    }
                    if (!prevBlend) {
                        gl.disable(gl.BLEND);
                    }
                    if (prevDepthTest) {
                        gl.enable(gl.DEPTH_TEST);
                    }
                    if (prevCullFace) {
                        gl.enable(gl.CULL_FACE);
                    }
                    gl.blendFuncSeparate(prevBlendSrcRGB, prevBlendDestRGB, prevBlendSrcAlpha, prevBlendDestAlpha);
                    while (this.taskQueue.length > 0) {
                        const task = this.taskQueue.shift();
                        task();
                    }
                }
            };
        }
        this._requestAnimationFrame(this.injectedFrameCallback);
    }
    updateRenderState(XRRenderStateInit) {
        this.existingBaseLayer = XRRenderStateInit.baseLayer;
        this.layers = XRRenderStateInit.layers || [];
        if (!this.activeRenderState) {
            this.createActiveRenderState();
        }
        this.activeRenderState = Object.assign(Object.assign({}, this.activeRenderState), XRRenderStateInit);
        if (!XRRenderStateInit.layers) {
            this._updateRenderState(XRRenderStateInit);
            return;
        }
        let layerRenderStateInit = Object.assign({}, XRRenderStateInit);
        delete layerRenderStateInit.layers;
        let context = undefined;
        for (let layer of this.layers) {
            if (layer instanceof XRCompositionLayerPolyfill) {
                context = layer.getContext();
                break;
            }
        }
        if (!context && !this.context) {
            console.log('No existing context! Have the session make one');
            const canvas = document.createElement('canvas');
            context = canvas.getContext('webgl2', { xrCompatible: true });
            if (!context) {
                context = canvas.getContext('webgl', { xrCompatible: true });
            }
            if (!context) {
                throw new Error('No webGL support detected.');
            }
            document.body.appendChild(context.canvas);
            function onResize() {
                context.canvas.width = context.canvas.clientWidth * window.devicePixelRatio;
                context.canvas.height = context.canvas.clientHeight * window.devicePixelRatio;
            }
            window.addEventListener('resize', onResize);
            onResize();
        }
        this.createInternalLayer(context);
        this.isPolyfillActive = true;
        this._updateRenderState(Object.assign(Object.assign({}, layerRenderStateInit), { baseLayer: this.internalLayer }));
    }
    initializeSession(mode) {
        this.mode = mode;
        this
            .requestReferenceSpace('local')
            .then((refSpace) => {
            this.referenceSpace = refSpace;
        })
            .catch((e) => {
        });
        this.requestReferenceSpace('viewer').then((viewerSpace) => {
            this.viewerSpace = viewerSpace;
        });
    }
    getBaseLayer(context) {
        if (!this.internalLayer && !this.existingBaseLayer && context) {
            this.createInternalLayer(context);
        }
        return this.internalLayer || this.existingBaseLayer;
    }
    getReferenceSpace() {
        return !this.referenceSpace ? this.viewerSpace : this.referenceSpace;
    }
    getViewerSpace() {
        return this.viewerSpace;
    }
    queueTask(task) {
        this.taskQueue.push(task);
    }
    get renderState() {
        if (!this.activeRenderState) {
            this.createActiveRenderState();
        }
        return this.activeRenderState;
    }
    get internalViews() {
        return this.views;
    }
    getViewIndex(view) {
        for (let i = 0; i < this.views.length; i++) {
            let testView = this.views[i];
            if (view.eye === testView.eye &&
                view.recommendedViewportScale === testView.recommendedViewportScale) {
                return i;
            }
        }
        return -1;
    }
    createInternalLayer(context) {
        if (!context && this.internalLayer) {
            return this.internalLayer;
        }
        if (context === this.context && this.internalLayer) {
            return this.internalLayer;
        }
        const _global = getGlobal();
        this.internalLayer = new _global.XRWebGLLayer(this, context);
        this.setContext(context);
        return this.internalLayer;
    }
    setContext(context) {
        this.context = context;
        this.tempFramebuffer = context.createFramebuffer();
        this.renderers = new WeakMap();
    }
    createActiveRenderState() {
        const _global = getGlobal();
        let prototypeNames = Object.getOwnPropertyNames(_global.XRRenderState.prototype);
        const renderStateClone = {};
        for (let item of prototypeNames) {
            renderStateClone[item] = this._renderState[item];
        }
        renderStateClone.layers = [];
        this.activeRenderState = renderStateClone;
    }
}

class XRWebGLSubImagePolyfill {
    constructor() {
        this.viewport = {
            x: 0,
            y: 0,
            width: 0,
            height: 0,
        };
    }
}

class XRWebGLBindingPolyfill {
    constructor(session, context) {
        this.session = session;
        this.context = context;
        this.subImageCache = new SubImageCache();
    }
    createProjectionLayer(init = defaultXRProjectionLayerInit) {
        const layer = new XRProjectionLayer(init);
        if (this.session.ended) {
            throw new Error('Session has ended');
        }
        if (this.context.isContextLost()) {
            throw new Error('context is lost');
        }
        layer.initialize(this.session, this.context);
        return layer;
    }
    createQuadLayer(init = defaultQuadLayerInit) {
        if (this.session.ended) {
            throw new Error('Session has ended');
        }
        if (this.context.isContextLost()) {
            throw new Error('context is lost');
        }
        if (init.layout === XRLayerLayout.default) {
            throw new TypeError('Trying to create a quad layer with default layout');
        }
        const layer = new XRQuadLayer(init);
        layer.initialize(this.session, this.context);
        return layer;
    }
    createCylinderLayer(init = defaultCylinderLayerInit) {
        if (this.session.ended) {
            throw new Error('Session has ended');
        }
        if (this.context.isContextLost()) {
            throw new Error('context is lost');
        }
        if (init.layout === XRLayerLayout.default) {
            throw new TypeError('Cylinder Layer cannot have a default layout');
        }
        const layer = new XRCylinderLayer(init);
        layer.initialize(this.session, this.context);
        return layer;
    }
    createEquirectLayer(init = defaultEquirectLayerInit) {
        if (this.session.ended) {
            throw new Error('Session has ended');
        }
        if (this.context.isContextLost()) {
            throw new Error('context is lost');
        }
        if (init.layout === XRLayerLayout.default) {
            throw new TypeError('Equirect Layer cannot have a default layout');
        }
        if (!isReferenceSpace(init.space)) {
            throw new TypeError('Equirect layer requires an XRReferenceSpace');
        }
        let layer = new XREquirectLayer(init);
        layer.initialize(this.session, this.context);
        return layer;
    }
    createCubeLayer(init) {
        if (this.session.ended) {
            throw new Error('Session has ended');
        }
        if (this.context.isContextLost()) {
            throw new Error('context is lost');
        }
        if (!(this.context instanceof WebGL2RenderingContext)) {
            throw new Error('XRCubeLayer only work on WebGL2');
        }
        if (!isReferenceSpace(init.space)) {
            throw new TypeError('XRCubeLayer requires a space of type XRReferenceSpace');
        }
        let layer = new XRCubeLayer(init);
        layer.initialize(this.session, this.context);
        return layer;
    }
    getSubImage(layer, frame, eye = 'none') {
        let existingSubImage = this.subImageCache.tryGetCachedSubImage(this.context, layer, eye);
        if (existingSubImage) {
            return existingSubImage;
        }
        let subimage = new XRWebGLSubImagePolyfill();
        if (layer instanceof XRProjectionLayer) {
            throw new TypeError();
        }
        if (layer.layout === XRLayerLayout.default) {
            throw new TypeError();
        }
        if (!this.validateStateofSubImageCreation(layer, frame)) {
            throw new Error('Invalid state for subimage creation');
        }
        let index = 0;
        if (layer.layout === XRLayerLayout.stereo) {
            if (eye === 'none') {
                throw new TypeError();
            }
            if (eye === 'right') {
                index = 1;
            }
        }
        if (layer.getTextureType() === XRTextureType['texture-array']) {
            subimage.imageIndex = index;
        }
        else {
            subimage.imageIndex = 0;
        }
        let _textureIndex = 0;
        if (layer.getTextureType() === XRTextureType.texture) {
            subimage.colorTexture = layer.colorTextures[index];
            _textureIndex = index;
        }
        else {
            subimage.colorTexture = layer.colorTextures[0];
            _textureIndex = 0;
        }
        if (!layer.depthStencilTextures || !layer.depthStencilTextures.length) {
            subimage.depthStencilTexture = null;
        }
        else if (layer.getTextureType() === XRTextureType.texture) {
            subimage.depthStencilTexture = layer.depthStencilTextures[index];
        }
        else {
            subimage.depthStencilTexture = layer.depthStencilTextures[0];
        }
        const layerMeta = layer.colorTexturesMeta[_textureIndex];
        subimage.textureWidth = layerMeta.width;
        subimage.textureHeight = layerMeta.height;
        let viewsPerTexture = 1;
        if (layer.layout === XRLayerLayout['stereo-left-right'] ||
            layer.layout === XRLayerLayout['stereo-top-bottom']) {
            viewsPerTexture = 2;
        }
        initializeViewport(subimage.viewport, layerMeta, layer.layout, index, viewsPerTexture);
        this.session.queueTask(() => {
            layer.needsRedraw = false;
        });
        this.subImageCache.cacheSubImage(subimage, this.context, layer, eye);
        return subimage;
    }
    getViewSubImage(layer, view) {
        let existingSubImage = this.subImageCache.tryGetCachedViewSubImage(this.context, layer, view);
        if (existingSubImage) {
            return existingSubImage;
        }
        let subimage = new XRWebGLSubImagePolyfill();
        let session = this.session;
        if (!session.internalViews || !session.internalViews.length) {
            console.warn('Tried to get view sub image before we have any views');
            return subimage;
        }
        let index = session.getViewIndex(view);
        let _textureIndex = 0;
        if (layer.getTextureType() === XRTextureType['texture-array']) {
            subimage.imageIndex = index;
        }
        else {
            subimage.imageIndex = 0;
        }
        if (layer.layout === XRLayerLayout.default &&
            layer.getTextureType() === XRTextureType.texture) {
            subimage.colorTexture = layer.colorTextures[index];
            _textureIndex = index;
        }
        else {
            subimage.colorTexture = layer.colorTextures[0];
            _textureIndex = 0;
        }
        if (layer.depthStencilTextures.length === 0) {
            subimage.depthStencilTexture = null;
        }
        else if (layer.layout === XRLayerLayout.default &&
            layer.getTextureType() === XRTextureType.texture) {
            subimage.depthStencilTexture = layer.depthStencilTextures[index];
        }
        else {
            subimage.depthStencilTexture = layer.depthStencilTextures[0];
        }
        subimage.textureWidth = layer.colorTexturesMeta[_textureIndex].width;
        subimage.textureHeight = layer.colorTexturesMeta[_textureIndex].height;
        initializeViewport(subimage.viewport, layer.colorTexturesMeta[_textureIndex], layer.layout, index, session.internalViews.length);
        layer.needsRedraw = false;
        this.subImageCache.cacheViewSubImage(subimage, this.context, layer, view);
        return subimage;
    }
    validateStateofSubImageCreation(layer, frame) {
        if (frame.session !== layer.session) {
            return false;
        }
        if (this.session !== layer.session) {
            return false;
        }
        if (this.context !== layer.context) {
            return false;
        }
        if (!layer.colorTextures || !layer.colorTextures.length) {
            return false;
        }
        if (layer.isStatic && layer.needsRedraw === false) {
            return false;
        }
        return true;
    }
}
class SubImageCache {
    constructor() {
        this.cache = new Map();
        this.viewCache = new Map();
    }
    cacheSubImage(subimage, context, layer, eye) {
        let eyeMap = new Map();
        eyeMap.set(eye, subimage);
        let layerMap = new Map();
        layerMap.set(layer, eyeMap);
        this.cache.set(context, layerMap);
    }
    tryGetCachedSubImage(context, layer, eye) {
        var _a, _b;
        return (_b = (_a = this.cache.get(context)) === null || _a === void 0 ? void 0 : _a.get(layer)) === null || _b === void 0 ? void 0 : _b.get(eye);
    }
    cacheViewSubImage(subimage, context, layer, view) {
        let viewMap = new Map();
        viewMap.set(view, subimage);
        let layerMap = new Map();
        layerMap.set(layer, viewMap);
        this.viewCache.set(context, layerMap);
    }
    tryGetCachedViewSubImage(context, layer, view) {
        var _a, _b;
        return (_b = (_a = this.viewCache.get(context)) === null || _a === void 0 ? void 0 : _a.get(layer)) === null || _b === void 0 ? void 0 : _b.get(view);
    }
}

const isLayersNativelySupported = (global) => {
    if (!global.navigator.xr) {
        return false;
    }
    if (global.XRMediaBinding && global.XRWebGLBinding) {
        return true;
    }
    return false;
};

class WebXRLayersPolyfill {
    constructor() {
        this.injected = false;
        const _global = getGlobal();
        this._injectPolyfill(_global);
    }
    _injectPolyfill(global) {
        if (!('xr' in global.navigator)) {
            throw new Error('WebXR Layers polyfill requires WebXR support.');
        }
        if (this.injected === true) {
            console.warn('Polyfill has already been injected...');
        }
        if (isLayersNativelySupported(global)) {
            return;
        }
        this._polyfillRequiredLayersFeature(global);
        this._polyfillXRSession(global);
        global.XRWebGLBinding = XRWebGLBindingPolyfill;
        global.XRMediaBinding = XRMediaBindingPolyfill;
        this.injected = true;
        console.log('Injected Layers Polyfill');
    }
    _polyfillXRSession(global) {
        global.XRSession.prototype._updateRenderState = global.XRSession.prototype.updateRenderState;
        global.XRSession.prototype._requestAnimationFrame =
            global.XRSession.prototype.requestAnimationFrame;
        let renderStateGetter = Object.getOwnPropertyDescriptor(global.XRSession.prototype, 'renderState');
        Object.defineProperty(global.XRSession.prototype, '_renderState', renderStateGetter);
        let polyfillRenderStateGetter = Object.getOwnPropertyDescriptor(XRSessionWithLayer.prototype, 'renderState');
        Object.defineProperty(global.XRSession.prototype, 'renderState', polyfillRenderStateGetter);
        let prototypeNames = Object.getOwnPropertyNames(XRSessionWithLayer.prototype);
        for (let item of prototypeNames) {
            let propertyDescriptor = Object.getOwnPropertyDescriptor(XRSessionWithLayer.prototype, item);
            Object.defineProperty(global.XRSession.prototype, item, propertyDescriptor);
        }
    }
    _polyfillRequiredLayersFeature(global) {
        const existingRequestSession = global.navigator.xr.requestSession;
        Object.defineProperty(global.navigator.xr, 'requestSessionInternal', { writable: true });
        global.navigator.xr.requestSessionInternal = existingRequestSession;
        const newRequestSession = (sessionMode, sessionInit) => {
            const modifiedSessionPromise = (mode, init) => {
                return global.navigator.xr.requestSessionInternal(mode, init).then((session) => {
                    Object.assign(session, new XRSessionWithLayer());
                    let polyfilledSession = session;
                    polyfilledSession.initializeSession(sessionMode);
                    return Promise.resolve(polyfilledSession);
                });
            };
            if (sessionMode !== 'immersive-vr') {
                return modifiedSessionPromise(sessionMode, sessionInit);
            }
            if (!sessionInit) {
                return modifiedSessionPromise(sessionMode, sessionInit);
            }
            if (sessionInit.requiredFeatures && sessionInit.requiredFeatures.indexOf('layers') > -1) {
                const sessionInitClone = Object.assign({}, sessionInit);
                const reqFeatures = [...sessionInit.requiredFeatures];
                const layersIndex = reqFeatures.indexOf('layers');
                reqFeatures.splice(layersIndex, 1);
                sessionInitClone.requiredFeatures = reqFeatures;
                return modifiedSessionPromise(sessionMode, sessionInitClone);
            }
            return modifiedSessionPromise(sessionMode, sessionInit);
        };
        Object.defineProperty(global.navigator.xr, 'requestSession', { writable: true });
        global.navigator.xr.requestSession = newRequestSession;
    }
}

export default WebXRLayersPolyfill;
