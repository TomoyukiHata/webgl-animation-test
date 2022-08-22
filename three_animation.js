// ---------------------------------------------------------------------------------------------
// 関数定義① webglでデータを扱いやすいように変換
// ---------------------------------------------------------------------------------------------

function ImagePixel(path, w, h, ratio) {

  // canvasの設定
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  const width = w;
  const height = h;
  canvas.width = width;
  canvas.height = height;

  // 画像データの描画
  ctx.drawImage(path, 0, 0);
  const data = ctx.getImageData(0, 0, width, height).data;

  // 座標情報
  const position = [];
  // 色情報
  const color = [];
  // 透明度
  const alpha = [];

  for (let y = 0; y < height; y += ratio) {
    for (let x = 0; x < width; x += ratio) {

      // 配列内の任意の[x、y]ピクセルの位置を取得
      const index = (y * width + x) * 4;

      // カラージェネレーターで選定した色を出現させる（出現し得る色は5種類 rgb値で指定）
      var rgb_vals = [
        [(88/255).toFixed(2), (0/255).toFixed(2), (219/255).toFixed(2)],
        [(219/255).toFixed(2), (47/255).toFixed(2), (7/255).toFixed(2)],
        [(0/255).toFixed(2), (102/255).toFixed(2), (219/255).toFixed(2)],
        [(219/255).toFixed(2), (212/255).toFixed(2), (0/255).toFixed(2)],
        [(0/255).toFixed(2), (219/255).toFixed(2), (144/255).toFixed(2)]
      ];

      const rgb_val =rgb_vals[Math.floor(Math.random() * rgb_vals.length)]

      const r = rgb_val[0];
      const g = rgb_val[1];
      const b = rgb_val[2];
      const a = data[index + 3] / 255;

      // webglは原点が中心となり、xは右がプラス左がマイナス。yは上がプラス下がマイナス。
      const pX = x - width / 2;
      const pY = -(y - height / 2);
      const pZ = 0;

      position.push(pX, pY, pZ), color.push(r, g, b), alpha.push(a);
    }
  }

  return { position, color, alpha };
}


// ---------------------------------------------------------------------------------------------
// Three.jsでの表示処理
// ---------------------------------------------------------------------------------------------

// 画像要素を生成
const img = new Image();

// 表示させる画像のパスを指定
img.src = "img/logo.png";
img.crossOrigin = "anonymous";

// 画像が読み込まれた後に処理を実行
img.addEventListener("load", () => {
  
  // シーンの作成
  var scene = new THREE.Scene();


  // カメラの作成
  var camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 0.1, 1000 );


  // カメラ位置設定
  camera.position.z = 450;
  camera.position.x = 0;
  camera.position.y = 0;


  // レンダラーの作成
  var renderer = new THREE.WebGLRenderer();


  // レンダラーが描画するキャンバスサイズの設定
  renderer.setSize( window.innerWidth, window.innerHeight );


  // キャンバスをDOMツリーに追加
  document.body.appendChild( renderer.domElement );


  var raycaster = new THREE.Raycaster();
  var mouse = new THREE.Vector2();
  var point = new THREE.Vector2();
  var time = 0; 
  var move = 0;

  const clock = new THREE.Clock();

  // ジオメトリーの作成
  const geometry = new THREE.BufferGeometry();

  // 画像の変換（ImagePixel関数）
  var pixcel_img = ImagePixel(img, img.width, img.height, 2.0);

  // 変換後の画像の頂点座標情報抽出
  const position = new THREE.BufferAttribute(
    new Float32Array(pixcel_img.position),
    3
  );
  // 変換後の画像の色情報抽出
  const color = new THREE.BufferAttribute(
    new Float32Array(pixcel_img.color),
    3
  );
  // 変換後の画像の透明度情報抽出
  const alpha = new THREE.BufferAttribute(
    new Float32Array(pixcel_img.alpha),
    1
  );

  // ランダム値の生成
  const rand = [];
  const vertces = pixcel_img.position.length / 3;  // 頂点の数
  for (let i = 0; i < vertces; i++) {
    rand.push((Math.random() - 1.0) * 2.0, (Math.random() - 1.0) * 2.0);
  }
  const rands = new THREE.BufferAttribute(new Float32Array(rand), 2);

  function random(a, b) {
    return a + (b - a) * Math.random();
  }

  const speed = [];
  for (let i = 0; i < vertces; i++) {
    speed.push(random(-1000, 1000));
  }
  const speeds = new THREE.BufferAttribute(new Float32Array(speed), 1);

  const offset = [];
  for (let i = 0; i < vertces; i++) {
    offset.push(random(0.4, 1));
  }
  const offsets = new THREE.BufferAttribute(new Float32Array(offset), 1);

  const press = [];
  for (let i = 0; i < vertces; i++) {
    press.push(random(0.4, 1));
  }
  const presses = new THREE.BufferAttribute(new Float32Array(offset), 1);

  // 各パラメータをジオメトリーに登録
  geometry.setAttribute("position", position);
  geometry.setAttribute("color", color);
  geometry.setAttribute("alpha", alpha);
  geometry.setAttribute("rand", rands);

  geometry.setAttribute("aSpeed", speeds);
  geometry.setAttribute("aOffset", offsets);
  geometry.setAttribute("aPress", presses); 
  

  // マテリアルの作成
  const material = new THREE.RawShaderMaterial({

    // シェーダーの設定
    vertexShader: document.querySelector("#js-vertex-shader").textContent,
    fragmentShader: document.querySelector("#js-fragment-shader").textContent,
    uniforms: {
      u_ratio: { type: "f", value: 0.0 },
      u_time: { type: "f", value: 0.0 },
      spark: {type: "t", value: new THREE.TextureLoader().load('img/spark.png')},
      move_param: { type: "i", value: 0 },
      mouse: {type: "v2", value: null},
      mousePressed: {type: "f", value: 0},
      move: {type: "f", value: 0},
      time: {type: "f", value: 0},
      mousePressed: {type: "f", value: 0},
    },
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthTest: false
  });
  
  // オブジェクトの作成
  var mesh = new THREE.Points(geometry, material);
  

  // オブジェクトの位置調整
  mesh.position.x = 0.0;
  
  
  // オブジェクトをシーンに追加
  scene.add( mesh );

  
  var test = new THREE.Mesh(
    new THREE.PlaneBufferGeometry(2000, 2000),
    new THREE.MeshBasicMaterial()
  );
  
  window.addEventListener('mousedown', (e) => {
      gsap.to(material.uniforms.mousePressed, {
          duration: 1,
          value: 1,
          ease: "ease.out(1, 0.3)"
      })
  });

  window.addEventListener('mouseup', (e) => {
      gsap.to(material.uniforms.mousePressed, {
          duration: 1,
          value: 0,
          ease: "ease.out(1, 0.3)"
      })
  });

  window.addEventListener('mousewheel', (e) => {
      move += e.wheelDeltaY/4000;
  });

  window.addEventListener('mousemove', (event) => {
    mouse.x = ( event.clientX / window.innerWidth ) * 2 - 1;
    mouse.y = - ( event.clientY / window.innerHeight ) * 2 + 1;

    raycaster.setFromCamera( mouse, camera );

    let intersects = raycaster.intersectObjects( [test] );

    point.x = intersects[0].point.x;
    point.y = intersects[0].point.y;

  }, false);

  // ---------------------------------------------------------------------------------------------
  // 関数定義② アニメーションの設定
  // ---------------------------------------------------------------------------------------------

  function animate() {
    // 画面の描画毎にanimate関数を呼び出す
    requestAnimationFrame( animate );

    // レンダラーにシーンとカメラを追加
    renderer.render( scene, camera );
    
    // パーティクル移動速度
    var getDeltaTime = clock.getDelta();
    mesh.material.uniforms.u_time.value += (2.0 * getDeltaTime);

    
    mesh.geometry.attributes.position.needsUpdate = true;

    time++;
    material.uniforms.mouse.value = point;
    material.uniforms.time.value = time;
    material.uniforms.move.value = move;

  }
  

  // アニメーションの実行
  animate();
});
