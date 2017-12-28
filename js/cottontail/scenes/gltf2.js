// Copyright 2017 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import { Scene } from './scene.js'
import { GLTF2Loader } from '../loaders/gltf2.js'

export class GLTF2Scene extends Scene {
  constructor(url) {
    super();

    this.url = url;
    this.gltf_node = null;
    this._loader = null;
  }

  onLoadScene(renderer) {
    this._loader = new GLTF2Loader(renderer);

    return this._loader.loadFromUrl(this.url).then((scene_node) => {
      this.gltf_node = scene_node;
      this.addNode(this.gltf_node);
      return this.waitForComplete();
    });
  }

  onDrawViews(renderer, timestamp, views) {
    renderer.drawViews(views, this);
  }
}