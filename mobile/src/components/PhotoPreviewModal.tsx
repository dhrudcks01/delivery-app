import { Image, Modal, Pressable, StyleSheet, Text } from 'react-native';
import { ui } from '../theme/ui';

type Props = {
  photoUrl: string | null;
  onClose: () => void;
};

export function PhotoPreviewModal({ photoUrl, onClose }: Props) {
  return (
    <Modal
      animationType="fade"
      transparent
      visible={Boolean(photoUrl)}
      onRequestClose={onClose}
    >
      <Pressable style={styles.modalBackdrop} onPress={onClose}>
        {photoUrl && (
          <Image source={{ uri: photoUrl }} style={styles.modalImage} resizeMode="contain" />
        )}
        <Text style={styles.modalHint}>탭하면 닫힙니다.</Text>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(2, 6, 23, 0.86)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    gap: 10,
  },
  modalImage: {
    width: '100%',
    height: '78%',
  },
  modalHint: {
    color: ui.colors.neutralBorderSoft,
    fontSize: 13,
  },
});


