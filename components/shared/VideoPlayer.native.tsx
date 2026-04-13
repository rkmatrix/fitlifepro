import React from 'react';
import { View, StyleSheet } from 'react-native';
import { WebView } from 'react-native-webview';

interface VideoPlayerProps {
  uri: string;
}

export function VideoPlayer({ uri }: VideoPlayerProps) {
  return (
    <View style={styles.container}>
      <WebView
        source={{ uri }}
        style={{ flex: 1 }}
        allowsInlineMediaPlayback
        mediaPlaybackRequiresUserAction={false}
        startInLoadingState
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
});
