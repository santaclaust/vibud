/**
 * 心芽 - 3D悬浮植物宠物
 * 方案：RN拖拽悬浮 + WebView内嵌Three.js
 * 特性：全局悬浮可拖动、真3D植物、预留生长/情绪接口
 */

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { View, StyleSheet, PanResponder, Animated, Dimensions, ActivityIndicator } from 'react-native';
import { WebView } from 'react-native-webview';

// ==============================================
// 配置
// ==============================================
const THREE_HTML = `
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>
body { margin:0; background:transparent; overflow:hidden; }
canvas { display:block; width:100%; height:100%; }
#loading { 
  position: absolute; top:50%; left:50%; 
  transform:translate(-50%, -50%);
  color: #4CAF50; font-size: 14px;
}
</style>
</head>
<body>
<div id="loading">🌱 生长中...</div>
<script src="https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.min.js"></script>
<script>
let scene, camera, renderer, controls, plant;
let growLevel = 1, currentMood = 'calm';
let isReady = false;

function init() {
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(60, window.innerWidth/window.innerHeight, 0.1, 1000);
  camera.position.set(0, 0.5, 2);
  
  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setClearColor(0x000000, 0);
  document.body.appendChild(renderer.domElement);
  
  controls = new THREE.OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  
  // 灯光
  const light = new THREE.HemisphereLight(0xffffff, 0x444444, 1.5);
  scene.add(light);
  
  // 测试：用简单的几何体代替3D模型
  createPlant();
  
  document.getElementById('loading').style.display = 'none';
  isReady = true;
  animate();
}

function createPlant() {
  // 花盆
  const pot = new THREE.Mesh(
    new THREE.CylinderGeometry(0.3, 0.25, 0.4, 16),
    new THREE.MeshStandardMaterial({ color: 0x8B4513 })
  );
  pot.position.y = -0.2;
  scene.add(pot);
  
  // 茎
  const stem = new THREE.Mesh(
    new THREE.CylinderGeometry(0.03, 0.05, 0.6, 8),
    new THREE.MeshStandardMaterial({ color: 0x228B22 })
  );
  stem.position.y = 0.1;
  plant = new THREE.Group();
  plant.add(stem);
  
  // 叶子
  const leaf = new THREE.Mesh(
    new THREE.SphereGeometry(0.12, 8, 8),
    new THREE.MeshStandardMaterial({ color: 0x32CD32 })
  );
  leaf.scale.set(1, 0.3, 0.5);
  leaf.position.set(0.1, 0.2, 0);
  plant.add(leaf);
  
  plant.position.y = 0;
  scene.add(plant);
}

function animate() {
  requestAnimationFrame(animate);
  if (plant) {
    // 呼吸动画
    plant.rotation.y += 0.005;
    plant.scale.y = 1 + Math.sin(Date.now() * 0.002) * 0.05;
  }
  controls.update();
  renderer.render(scene, camera);
}

// 接收RN消息
window.addEventListener('message', (e) => {
  try {
    const data = JSON.parse(e.data);
    switch(data.type) {
      case 'init':
        growLevel = data.growLevel || 1;
        currentMood = data.mood || 'calm';
        console.log('植物初始化:', data);
        break;
      case 'grow':
        growLevel = data.level;
        if(plant) plant.scale.setScalar(growLevel * 0.5);
        break;
      case 'mood':
        currentMood = data.mood;
        console.log('情绪变化:', currentMood);
        break;
    }
  } catch(err) {}
});

// 初始化完成通知RN
window.parent.postMessage(JSON.stringify({ type: 'ready' }));

init();
</script>
</body>
</html>
`;

// ==============================================
// 组件
// ==============================================
export default function SproutPet({ 
  userId = 'guest',
  onReady = () => {} 
}) {
  const [loaded, setLoaded] = useState(false);
  const [visible, setVisible] = useState(true); // 可配置隐藏
  const pan = useRef(new Animated.ValueXY({ x: 20, y: 120 })).current;
  const webViewRef = useRef(null);
  
  // 懒加载标志
  const [show3D, setShow3D] = useState(false);
  
  // 懒加载：首次加载后显示
  useEffect(() => {
    const timer = setTimeout(() => setShow3D(true), 3000);
    return () => clearTimeout(timer);
  }, []);
  
  // 拖拽
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderMove: Animated.event([null, { dx: pan.x, dy: pan.y }], { useNativeDriver: false }),
      onPanResponderRelease: () => pan.extractOffset(),
    })
  ).current;
  
  // 发消息给3D
  const sendTo3D = useCallback((type, data) => {
    webViewRef.current?.postMessage(JSON.stringify({ type, ...data }));
  }, []);
  
  // 初始化植物
  useEffect(() => {
    if (!show3D) return;
    setTimeout(() => {
      sendTo3D('init', {
        userId,
        plantType: 'succulent',
        character: 'sanguine',
        growLevel: 1,
        mood: 'calm'
      });
    }, 500);
  }, [show3D, userId]);
  
  if (!visible || !show3D) return null;
  
  return (
    <Animated.View
      style={[styles.container, { transform: [{ translateX: pan.x }, { translateY: pan.y }] }]}
      {...panResponder.panHandlers}
    >
      {!loaded && (
        <View style={styles.loader}>
          <ActivityIndicator color="#4CAF50" />
        </View>
      )}
      <WebView
        ref={webViewRef}
        source={{ html: THREE_HTML }}
        style={styles.webView}
        background="transparent"
        allowsTransparency={true}
        scrollEnabled={false}
        onLoadEnd={() => setLoaded(true)}
        originWhitelist={['*']}
        mixedContentMode="always"
        javaScriptEnabled={true}
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    zIndex: 9999,
    width: 100,
    height: 100,
    borderRadius: 50,
    overflow: 'hidden',
    backgroundColor: 'transparent',
  },
  webView: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  loader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.8)',
  },
});