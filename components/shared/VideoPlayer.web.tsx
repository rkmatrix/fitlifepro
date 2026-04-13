import React from 'react';
import { View, StyleSheet } from 'react-native';

interface VideoPlayerProps {
  uri: string;
}

export function VideoPlayer({ uri }: VideoPlayerProps) {
  return (
    <View style={styles.container}>
      {/* @ts-ignore – JSX iframe is valid in react-native-web */}
      <iframe
        src={uri}
        style={{ width: '100%', height: '100%', border: 'none' }}
        allowFullScreen
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
});
