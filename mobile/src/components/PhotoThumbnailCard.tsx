import { useState } from 'react';
import type { ImageStyle, StyleProp, ViewStyle } from 'react-native';
import { ActivityIndicator, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { ui } from '../theme/ui';

type Props = {
  photoUrl: string;
  label: string;
  onPress?: () => void;
  onRemove?: () => void;
  containerStyle?: StyleProp<ViewStyle>;
  imageStyle?: StyleProp<ImageStyle>;
};

export function PhotoThumbnailCard({
  photoUrl,
  label,
  onPress,
  onRemove,
  containerStyle,
  imageStyle,
}: Props) {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  const handleRetryLoad = () => {
    setHasError(false);
    setIsLoading(true);
    setReloadKey((prev) => prev + 1);
  };

  return (
    <View style={[styles.card, containerStyle]}>
      <Pressable disabled={!onPress} onPress={onPress} style={styles.imageWrap}>
        {!hasError && (
          <Image
            key={`${photoUrl}-${reloadKey}`}
            source={{ uri: photoUrl }}
            style={[styles.image, imageStyle]}
            resizeMode="cover"
            onLoadStart={() => {
              setIsLoading(true);
              setHasError(false);
            }}
            onLoadEnd={() => setIsLoading(false)}
            onError={() => {
              setIsLoading(false);
              setHasError(true);
            }}
          />
        )}
        {isLoading && !hasError && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="small" color={ui.colors.primary} />
          </View>
        )}
        {hasError && (
          <View style={styles.errorFallback}>
            <Text style={styles.errorFallbackText}>이미지 로딩 실패</Text>
            <Pressable style={styles.retryButton} onPress={handleRetryLoad}>
              <Text style={styles.retryButtonText}>다시 시도</Text>
            </Pressable>
          </View>
        )}
      </Pressable>
      <View style={styles.footer}>
        <Text style={styles.label}>{label}</Text>
        {onRemove && (
          <Pressable style={styles.removeButton} onPress={onRemove}>
            <Text style={styles.removeButtonText}>삭제</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: '48%',
    borderWidth: 1,
    borderColor: ui.colors.cardBorder,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: ui.colors.surfaceMuted,
  },
  imageWrap: {
    width: '100%',
    minHeight: 120,
    backgroundColor: ui.colors.neutralGrayBorder,
  },
  image: {
    width: '100%',
    height: 120,
    backgroundColor: ui.colors.neutralGrayBorder,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(248, 250, 252, 0.55)',
  },
  errorFallback: {
    minHeight: 120,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 10,
    gap: 6,
    backgroundColor: ui.colors.neutralBorderSoft,
  },
  errorFallbackText: {
    fontSize: 11,
    color: ui.colors.textSecondary,
    fontWeight: '600',
  },
  retryButton: {
    borderWidth: 1,
    borderColor: ui.colors.caption,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  retryButtonText: {
    fontSize: 11,
    color: ui.colors.text,
    fontWeight: '700',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  label: {
    color: ui.colors.text,
    fontSize: 12,
    flexShrink: 1,
  },
  removeButton: {
    borderWidth: 1,
    borderColor: ui.colors.errorAccent,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  removeButtonText: {
    color: ui.colors.errorAccent,
    fontSize: 12,
    fontWeight: '600',
  },
});

