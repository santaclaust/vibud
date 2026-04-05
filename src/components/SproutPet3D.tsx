/**
 * 心芽 - 3D悬浮植物宠物 (Three.js 分形树版)
 * 特点：纯算法生成植物，无需外部模型
 */

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { View, StyleSheet, PanResponder, Animated, Dimensions } from 'react-native';
import { WebView } from 'react-native-webview';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ==============================================
// 3D 分形树 HTML (纯算法生成，无需模型)
// ==============================================
const THREE_HTML = `
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>
body { margin:0; background:transparent; overflow:hidden; }
canvas { display:block; }
#loading { position:absolute; top:50%; left:50%; transform:translate(-50%,-50%); color:#4CAF50; font-family:system-ui; }
</style>
</head>
<body>
<div id="loading">🌱 生长中...</div>
<script src="https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.min.js"></script>
<script>
let scene, camera, renderer, controls;
let plantGroup, rootBranch;
let growLevel = 1;
let currentMood = 'calm';
let time = 0;

// 配置
const MAX_DEPTH = 8;      // 分形深度
const BRANCH_ANGLE = 0.4; // 分叉角度
const GROW_FACTOR = 0.7;   // 生长因子

// 颜色方案
const moods = {
  calm: { color: 0x228B22, leaf: 0x32CD32 },
  happy: { color: 0xFFD700, leaf: 0xFFEB3B },
  sad: { color: 0x4A5568, leaf: 0x718A96 },
  energetic: { color: 0xFF6B35, leaf: 0xFF8C00 }
};

init();
animate();

function init() {
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(50, window.innerWidth/window.innerHeight, 0.1, 100);
  camera.position.set(0, 1.5, 4);
  
  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setClearColor(0x000000, 0);
  document.body.appendChild(renderer.domElement);
  
  // 光照
  const ambient = new THREE.AmbientLight(0xffffff, 0.6);
  scene.add(ambient);
  
  const sun = new THREE.DirectionalLight(0xffffff, 0.8);
  sun.position.set(2, 3, 2);
  scene.add(sun);
  
  // 地面
  const ground = new THREE.Mesh(
    new THREE.CircleGeometry(1, 32),
    new THREE.MeshStandardMaterial({ color: 0x8B4513, roughness: 1 })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.5;
  scene.add(ground);
  
  // 花盆
  const pot = new THREE.Mesh(
    new THREE.CylinderGeometry(0.35, 0.3, 0.5, 16),
    new THREE.MeshStandardMaterial({ color: 0x5D4037 })
  );
  pot.position.y = -0.25;
  scene.add(pot);
  
  // 创建分形树
  createFractalTree();
  
  document.getElementById('loading').style.display = 'none';
  animate();
}

function createFractalTree() {
  if (plantGroup) scene.remove(plantGroup);
  plantGroup = new THREE.Group();
  
  const mood = moods[currentMood] || moods.calm;
  
  // 递归生成分形树枝
  function addBranch(parent, depth, length, thickness) {
    if (depth > MAX_DEPTH || length < 0.02) return;
    
    // 树枝
    const geometry = new THREE.CylinderGeometry(
      thickness * 0.7, thickness, length, 8
    );
    const material = new THREE.MeshStandardMaterial({ 
      color: mood.color,
      roughness: 0.8
    });
    const branch = new THREE.Mesh(geometry, material);
    branch.position.y = length / 2;
    parent.add(branch);
    
    // 叶子 (在末端)
    if (depth > MAX_DEPTH - 2) {
      const leafGeom = new THREE.SphereGeometry(0.08, 6, 6);
      leafGeom.scale(1, 0.3, 1);
      const leafMat = new THREE.MeshStandardMaterial({ color: mood.leaf });
      const leaf = new THREE.Mesh(leafGeom, leafMat);
      leaf.position.y = length;
      leaf.rotation.z = Math.random() * 0.5;
      parent.add(leaf);
    }
    
    // 分叉 (递归)
    const childCount = depth < 3 ? 3 : 2;
    for (let i = 0; i < childCount; i++) {
      const child = new THREE.Group();
      child.position.y = length;
      child.rotation.z = -BRANCH_ANGLE + (Math.random() * 0.2);
      child.rotation.x = (Math.random() - 0.5) * 0.3;
      parent.add(child);
      
      addBranch(child, depth + 1, length * GROW_FACTOR, thickness * 0.7);
    }
  }
  
  // 根
  rootBranch = new THREE.Group();
  rootBranch.position.y = 0;
  plantGroup.add(rootBranch);
  addBranch(rootBranch, 0, 0.5, 0.08);
  
  // 缩放基于生长等级
  const scale = 0.5 + (growLevel - 1) * 0.15;
  plantGroup.scale.setScalar(scale);
  plantGroup.position.y = -0.3;
  
  scene.add(plantGroup);
}

function animate() {
  requestAnimationFrame(animate);
  time += 0.01;
  
  if (plantGroup) {
    // 呼吸动画
    plantGroup.rotation.y = Math.sin(time * 0.5) * 0.1;
    
    // 情绪影响
    switch(currentMood) {
      case 'happy':
        plantGroup.position.y = -0.3 + Math.sin(time * 2) * 0.05;
        break;
      case 'sad':
        plantGroup.scale.y = 0.9 + Math.sin(time * 0.5) * 0.02;
        break;
      case 'energetic':
        plantGroup.position.x = Math.sin(time * 3) * 0.02;
        break;
    }
  }
  
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
        createFractalTree();
        break;
      case 'grow':
        growLevel = data.level;
        createFractalTree();
        break;
      case 'mood':
        currentMood = data.mood;
        createFractalTree();
        break;
    }
  } catch(err) {}
});

window.parent.postMessage(JSON.stringify({ type: 'ready' }));
</script>
</body>
</html>
`;

// ==============================================
// 组件
// ==============================================
export default function SproutPet3D({ 
  userId = 'guest',
  growLevel = 1,
  mood = 'calm',
  visible = true 
}) {
  const [loaded, setLoaded] = useState(false);
  const [show3D, setShow3D] = useState(false);
  const pan = useRef(new Animated.ValueXY({ x: SCREEN_WIDTH - 100, y: 120 })).current;
  const webViewRef = useRef(null);
  
  // 懒加载：等待启动屏结束
  useEffect(() => {
    const timer = setTimeout(() => setShow3D(true), 4000);
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
  
  // 初始化
  useEffect(() => {
    if (!show3D) return;
    setTimeout(() => {
      sendTo3D('init', { userId, growLevel, mood });
    }, 500);
  }, [show3D, userId, growLevel, mood]);
  
  if (!visible || !show3D) return null;
  
  return (
    <Animated.View
      style={[styles.container, { transform: [{ translateX: pan.x }, { translateY: pan.y }] }]}
      {...panResponder.panHandlers}
    >
      {!loaded && <View style={styles.loader} />}
      <WebView
        ref={webViewRef}
        source={{ html: THREE_HTML }}
        style={styles.webView}
        background="transparent"
        allowsTransparency={true}
        scrollEnabled={false}
        onLoadEnd={() => setLoaded(true)}
        originWhitelist={['*']}
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
    width: 150,
    height: 150,
    overflow: 'hidden',
  },
  webView: { flex: 1, backgroundColor: 'transparent' },
  loader: { 
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(255,255,255,0.9)', 
    justifyContent: 'center', alignItems: 'center' 
  },
});