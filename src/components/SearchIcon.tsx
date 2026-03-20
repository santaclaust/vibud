import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';

// 镜大柄小的放大镜 - 实心版
export function MagnifierSolid({ size = 24, color = '#666' }: { size?: number; color?: string }) {
  const lensSize = size * 0.7;
  const handleWidth = size * 0.4;
  const handleHeight = size * 0.08;
  
  const containerStyle: ViewStyle = {
    width: size,
    height: size,
    position: 'relative' as const,
  };
  
  const lensStyle: ViewStyle = {
    position: 'absolute' as const,
    top: 0,
    left: 0,
    width: lensSize,
    height: lensSize,
    backgroundColor: color,
    borderRadius: lensSize / 2,
    opacity: 0.3,
  };
  
  const handleStyle: ViewStyle = {
    position: 'absolute' as const,
    bottom: size * 0.05,
    right: 0,
    width: handleWidth,
    height: handleHeight,
    backgroundColor: color,
    transform: [{ rotate: '45deg' }],
    borderRadius: 2,
  };
  
  return (
    <View style={containerStyle}>
      <View style={lensStyle} />
      <View style={handleStyle} />
    </View>
  );
}

export default MagnifierSolid;
