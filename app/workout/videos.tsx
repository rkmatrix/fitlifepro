import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput,
  Alert, Image, Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import YoutubeIframe from 'react-native-youtube-iframe';
import { Colors, Spacing, FontSize, BorderRadius } from '../../constants/theme';
import { Card } from '../../components/shared/Card';
import { Button } from '../../components/shared/Button';
import { router } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { createCustomVideoFromUrl, extractYouTubeId, getYouTubeThumbnail } from '../../lib/youtube';
import { useUserStore } from '../../stores/userStore';
import { CustomVideo, VideoTag } from '../../types';

const ALL_TAGS: VideoTag[] = ['yoga', 'zumba', 'strength', 'cardio', 'meditation', 'mobility', 'hiit', 'warmup', 'cooldown'];

export default function VideoLibraryScreen() {
  const { profile } = useUserStore();
  const [videos, setVideos] = useState<CustomVideo[]>([]);
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [playerVideoId, setPlayerVideoId] = useState<string | null>(null);
  const [newUrl, setNewUrl] = useState('');
  const [newTags, setNewTags] = useState<VideoTag[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [filterTag, setFilterTag] = useState<VideoTag | null>(null);

  useEffect(() => {
    if (profile) loadVideos();
  }, [profile]);

  const loadVideos = async () => {
    if (!profile) return;
    const { data } = await supabase
      .from('custom_videos')
      .select('*')
      .eq('user_id', profile.id)
      .order('added_at', { ascending: false });
    setVideos((data ?? []) as CustomVideo[]);
  };

  const handleAddVideo = async () => {
    if (!newUrl.trim() || !profile) return;
    setIsAdding(true);
    try {
      const videoData = await createCustomVideoFromUrl(newUrl.trim(), profile.id, newTags);
      if (!videoData) {
        Alert.alert('Invalid URL', 'Please paste a valid YouTube URL.');
        return;
      }
      const { data } = await supabase.from('custom_videos').insert(videoData).select().single();
      if (data) {
        setVideos((prev) => [data as CustomVideo, ...prev]);
        setAddModalVisible(false);
        setNewUrl('');
        setNewTags([]);
      }
    } finally {
      setIsAdding(false);
    }
  };

  const handleDeleteVideo = async (id: string) => {
    Alert.alert('Remove Video', 'Remove this video from your library?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          await supabase.from('custom_videos').delete().eq('id', id);
          setVideos((prev) => prev.filter((v) => v.id !== id));
        },
      },
    ]);
  };

  const toggleTag = (tag: VideoTag) => {
    setNewTags((prev) => prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]);
  };

  const filteredVideos = filterTag ? videos.filter((v) => v.tags.includes(filterTag)) : videos;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Video Library</Text>
          <Text style={styles.subtitle}>{videos.length} custom videos</Text>
        </View>
        <Button title="+ Add Video" onPress={() => setAddModalVisible(true)} size="sm" />
      </View>

      {/* Tag filter */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterBar} contentContainerStyle={styles.filterContent}>
        <TouchableOpacity
          style={[styles.filterChip, !filterTag && styles.filterChipActive]}
          onPress={() => setFilterTag(null)}
        >
          <Text style={[styles.filterLabel, !filterTag && styles.filterLabelActive]}>All</Text>
        </TouchableOpacity>
        {ALL_TAGS.map((tag) => (
          <TouchableOpacity
            key={tag}
            style={[styles.filterChip, filterTag === tag && styles.filterChipActive]}
            onPress={() => setFilterTag(filterTag === tag ? null : tag)}
          >
            <Text style={[styles.filterLabel, filterTag === tag && styles.filterLabelActive]}>
              {tag}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Player */}
      {playerVideoId && (
        <View style={styles.player}>
          <YoutubeIframe height={220} videoId={playerVideoId} play={true} />
          <TouchableOpacity style={styles.closePlayer} onPress={() => setPlayerVideoId(null)}>
            <Text style={styles.closePlayerText}>✕ Close Player</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Video grid */}
      <ScrollView showsVerticalScrollIndicator={false} style={styles.list}>
        {filteredVideos.length === 0 && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>🎬</Text>
            <Text style={styles.emptyTitle}>No videos yet</Text>
            <Text style={styles.emptyText}>
              Add YouTube workout videos you love — yoga flows, Zumba sessions, strength tutorials — and they'll live here forever.
            </Text>
            <Button title="Add Your First Video" onPress={() => setAddModalVisible(true)} style={styles.emptyBtn} />
          </View>
        )}
        {filteredVideos.map((video) => (
          <Card key={video.id} style={styles.videoCard}>
            <TouchableOpacity onPress={() => setPlayerVideoId(video.youtube_id)}>
              <View style={styles.thumbnailContainer}>
                {video.thumbnail ? (
                  <Image source={{ uri: video.thumbnail }} style={styles.thumbnail} resizeMode="cover" />
                ) : (
                  <View style={styles.thumbnailPlaceholder}>
                    <Text style={styles.thumbnailIcon}>▶</Text>
                  </View>
                )}
                <View style={styles.playOverlay}>
                  <Text style={styles.playBtn}>▶</Text>
                </View>
              </View>
            </TouchableOpacity>
            <View style={styles.videoInfo}>
              <Text style={styles.videoTitle} numberOfLines={2}>{video.title}</Text>
              {video.channel_name && (
                <Text style={styles.channelName}>{video.channel_name}</Text>
              )}
              <View style={styles.tagRow}>
                {video.tags.map((tag, i) => (
                  <View key={i} style={styles.tagChip}>
                    <Text style={styles.tagText}>{tag}</Text>
                  </View>
                ))}
              </View>
              <View style={styles.videoActions}>
                <Text style={styles.watchCount}>Watched {video.watch_count}×</Text>
                <TouchableOpacity onPress={() => handleDeleteVideo(video.id)}>
                  <Text style={styles.deleteBtn}>Remove</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Card>
        ))}
        <View style={{ height: Spacing.xxl }} />
      </ScrollView>

      {/* Add Video Modal */}
      <Modal visible={addModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>Add YouTube Video</Text>
            <Text style={styles.modalLabel}>YouTube URL</Text>
            <TextInput
              style={styles.urlInput}
              value={newUrl}
              onChangeText={setNewUrl}
              placeholder="https://www.youtube.com/watch?v=..."
              placeholderTextColor={Colors.textTertiary}
              autoCapitalize="none"
              autoCorrect={false}
            />

            <Text style={styles.modalLabel}>Tags (select all that apply)</Text>
            <View style={styles.tagGrid}>
              {ALL_TAGS.map((tag) => (
                <TouchableOpacity
                  key={tag}
                  style={[styles.tagToggle, newTags.includes(tag) && styles.tagToggleActive]}
                  onPress={() => toggleTag(tag)}
                >
                  <Text style={[styles.tagToggleText, newTags.includes(tag) && styles.tagToggleTextActive]}>
                    {tag}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.modalBtns}>
              <Button title="Cancel" onPress={() => setAddModalVisible(false)} variant="ghost" size="md" style={styles.modalBtn} />
              <Button title="Add to Library" onPress={handleAddVideo} loading={isAdding} disabled={!newUrl.trim()} size="md" style={styles.modalBtn} />
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: Spacing.lg, paddingTop: Spacing.md, paddingBottom: Spacing.sm },
  title: { fontSize: FontSize.xxl, fontWeight: '800', color: Colors.textPrimary },
  subtitle: { fontSize: FontSize.sm, color: Colors.textSecondary, marginTop: 2 },
  filterBar: { flexGrow: 0, marginBottom: Spacing.sm },
  filterContent: { paddingHorizontal: Spacing.lg, gap: Spacing.xs },
  filterChip: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs, borderRadius: BorderRadius.full, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border },
  filterChipActive: { backgroundColor: 'rgba(255,107,53,0.15)', borderColor: Colors.primary },
  filterLabel: { fontSize: FontSize.xs, color: Colors.textSecondary, fontWeight: '600', textTransform: 'capitalize' },
  filterLabelActive: { color: Colors.primary },
  player: { marginHorizontal: Spacing.lg, marginBottom: Spacing.sm },
  closePlayer: { alignItems: 'center', paddingVertical: Spacing.xs, backgroundColor: Colors.surface, borderBottomLeftRadius: BorderRadius.md, borderBottomRightRadius: BorderRadius.md },
  closePlayerText: { fontSize: FontSize.sm, color: Colors.textSecondary, fontWeight: '600' },
  list: { flex: 1, paddingHorizontal: Spacing.lg },
  emptyState: { alignItems: 'center', paddingTop: Spacing.xxl, paddingHorizontal: Spacing.xl },
  emptyIcon: { fontSize: 64, marginBottom: Spacing.lg },
  emptyTitle: { fontSize: FontSize.xl, fontWeight: '800', color: Colors.textPrimary, marginBottom: Spacing.xs },
  emptyText: { fontSize: FontSize.sm, color: Colors.textSecondary, textAlign: 'center', lineHeight: 22, marginBottom: Spacing.lg },
  emptyBtn: {},
  videoCard: { marginBottom: Spacing.md, overflow: 'hidden', padding: 0 },
  thumbnailContainer: { position: 'relative', height: 180 },
  thumbnail: { width: '100%', height: '100%' },
  thumbnailPlaceholder: { width: '100%', height: '100%', backgroundColor: Colors.surfaceElevated, justifyContent: 'center', alignItems: 'center' },
  thumbnailIcon: { fontSize: 48, color: Colors.textTertiary },
  playOverlay: { position: 'absolute', top: '50%', left: '50%', marginTop: -24, marginLeft: -24, width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' },
  playBtn: { fontSize: 20, color: '#fff' },
  videoInfo: { padding: Spacing.md },
  videoTitle: { fontSize: FontSize.md, fontWeight: '700', color: Colors.textPrimary, marginBottom: 4 },
  channelName: { fontSize: FontSize.xs, color: Colors.textSecondary, marginBottom: Spacing.xs },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginBottom: Spacing.sm },
  tagChip: { backgroundColor: 'rgba(255,107,53,0.1)', paddingHorizontal: Spacing.xs, paddingVertical: 2, borderRadius: BorderRadius.full },
  tagText: { fontSize: FontSize.xs, color: Colors.primary, fontWeight: '600', textTransform: 'capitalize' },
  videoActions: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  watchCount: { fontSize: FontSize.xs, color: Colors.textTertiary },
  deleteBtn: { fontSize: FontSize.xs, color: Colors.skipped, fontWeight: '600' },
  modalOverlay: { flex: 1, backgroundColor: Colors.overlay, justifyContent: 'flex-end' },
  modal: { backgroundColor: Colors.surfaceElevated, borderTopLeftRadius: BorderRadius.xl, borderTopRightRadius: BorderRadius.xl, padding: Spacing.xl },
  modalTitle: { fontSize: FontSize.xl, fontWeight: '800', color: Colors.textPrimary, marginBottom: Spacing.lg },
  modalLabel: { fontSize: FontSize.sm, color: Colors.textSecondary, fontWeight: '600', marginBottom: 6 },
  urlInput: { backgroundColor: Colors.surface, borderRadius: BorderRadius.md, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, color: Colors.textPrimary, fontSize: FontSize.md, borderWidth: 1, borderColor: Colors.border, marginBottom: Spacing.lg },
  tagGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xs, marginBottom: Spacing.lg },
  tagToggle: { paddingHorizontal: Spacing.sm, paddingVertical: Spacing.xs, borderRadius: BorderRadius.full, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border },
  tagToggleActive: { backgroundColor: 'rgba(255,107,53,0.15)', borderColor: Colors.primary },
  tagToggleText: { fontSize: FontSize.xs, color: Colors.textSecondary, fontWeight: '600', textTransform: 'capitalize' },
  tagToggleTextActive: { color: Colors.primary },
  modalBtns: { flexDirection: 'row', gap: Spacing.sm },
  modalBtn: { flex: 1 },
});
