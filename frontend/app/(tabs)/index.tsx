import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Modal,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Animated,
  Image,
} from 'react-native';
import { useState, useEffect, useRef } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import * as ImagePicker from 'expo-image-picker';
import { useAffirmationStore } from '../../store/affirmationStore';

// Separate component for affirmation items to avoid hooks in render functions
interface AffirmationItemProps {
  item: any;
  index: number;
  onEdit: (affirmation: any) => void;
  onDelete: (id: string) => void;
}

function AffirmationItem({ item, index, onEdit, onDelete }: AffirmationItemProps) {
  const scaleAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      delay: index * 50,
      friction: 8,
      useNativeDriver: true,
    }).start();
  }, [index, scaleAnim]);

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <View style={styles.affirmationCard}>
        {item.image && (
          <Image
            source={{ uri: item.image }}
            style={styles.thumbnailImage}
            resizeMode="cover"
          />
        )}
        <View style={styles.affirmationContent}>
          <Ionicons name="star" size={20} color="#FFD700" style={styles.starIcon} />
          <Text style={styles.affirmationText}>{item.text}</Text>
        </View>
        <View style={styles.actionButtons}>
          <TouchableOpacity
            onPress={() => onEdit(item)}
            style={styles.iconButton}
          >
            <Ionicons name="create-outline" size={22} color="#9370DB" />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => onDelete(item.id)}
            style={styles.iconButton}
          >
            <Ionicons name="trash-outline" size={22} color="#FF6B6B" />
          </TouchableOpacity>
        </View>
      </View>
    </Animated.View>
  );
}

export default function HomeScreen() {
  const { affirmations, fetchAffirmations, addAffirmation, updateAffirmation, deleteAffirmation } = useAffirmationStore();
  const [modalVisible, setModalVisible] = useState(false);
  const [editingAffirmation, setEditingAffirmation] = useState<any>(null);
  const [affirmationText, setAffirmationText] = useState('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadAffirmations();
    requestPermissions();
  }, []);

  const requestPermissions = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'We need camera roll permissions to let you add images to affirmations.');
    }
  };

  const loadAffirmations = async () => {
    setLoading(true);
    await fetchAffirmations();
    setLoading(false);
  };

  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [16, 9],
        quality: 0.5,
        base64: true,
      });

      if (!result.canceled && result.assets[0].base64) {
        const base64Image = `data:image/jpeg;base64,${result.assets[0].base64}`;
        setSelectedImage(base64Image);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  const removeImage = () => {
    setSelectedImage(null);
  };

  const handleAddAffirmation = async () => {
    if (!affirmationText.trim()) {
      Alert.alert('Error', 'Please enter an affirmation');
      return;
    }

    try {
      if (editingAffirmation) {
        await updateAffirmation(editingAffirmation.id, {
          text: affirmationText,
          image: selectedImage || undefined
        });
      } else {
        await addAffirmation(affirmationText, selectedImage || undefined);
      }
      setModalVisible(false);
      setAffirmationText('');
      setSelectedImage(null);
      setEditingAffirmation(null);
    } catch (error) {
      Alert.alert('Error', 'Failed to save affirmation');
    }
  };

  const handleEditAffirmation = (affirmation: any) => {
    setEditingAffirmation(affirmation);
    setAffirmationText(affirmation.text);
    setSelectedImage(affirmation.image || null);
    setModalVisible(true);
  };

  const handleDeleteAffirmation = (id: string) => {
    Alert.alert(
      'Delete Affirmation',
      'Are you sure you want to delete this affirmation?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => deleteAffirmation(id),
        },
      ]
    );
  };

  const openAddModal = () => {
    setEditingAffirmation(null);
    setAffirmationText('');
    setSelectedImage(null);
    setModalVisible(true);
  };

  const renderAffirmationItem = ({ item, index }: any) => {
    return (
      <AffirmationItem
        item={item}
        index={index}
        onEdit={handleEditAffirmation}
        onDelete={handleDeleteAffirmation}
      />
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />

      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>My Affirmations</Text>
          <Text style={styles.headerSubtitle}>{affirmations.length} affirmations</Text>
        </View>
        <TouchableOpacity style={styles.addButton} onPress={openAddModal}>
          <Ionicons name="add" size={28} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Affirmations List */}
      {loading ? (
        <View style={styles.centerContent}>
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      ) : affirmations.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="flower-outline" size={80} color="#DDD" />
          <Text style={styles.emptyTitle}>No Affirmations Yet</Text>
          <Text style={styles.emptySubtitle}>Add your first affirmation to begin</Text>
        </View>
      ) : (
        <FlatList
          data={affirmations}
          renderItem={renderAffirmationItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Add/Edit Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalContainer}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingAffirmation ? 'Edit Affirmation' : 'New Affirmation'}
              </Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={28} color="#666" />
              </TouchableOpacity>
            </View>

            <TextInput
              style={styles.input}
              placeholder="Enter your affirmation..."
              value={affirmationText}
              onChangeText={setAffirmationText}
              multiline
              numberOfLines={4}
              autoFocus
            />

            {/* Image Section */}
            <View style={styles.imageSection}>
              <Text style={styles.imageSectionTitle}>Visualization Image (Optional)</Text>
              {selectedImage ? (
                <View style={styles.imagePreviewContainer}>
                  <Image
                    source={{ uri: selectedImage }}
                    style={styles.imagePreview}
                    resizeMode="cover"
                  />
                  <TouchableOpacity
                    style={styles.removeImageButton}
                    onPress={removeImage}
                  >
                    <Ionicons name="close-circle" size={32} color="#FF6B6B" />
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity style={styles.imagePickerButton} onPress={pickImage}>
                  <Ionicons name="image-outline" size={40} color="#9370DB" />
                  <Text style={styles.imagePickerText}>Add Visualization Image</Text>
                  <Text style={styles.imagePickerSubtext}>
                    Help manifest your goal with an image
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            <TouchableOpacity style={styles.saveButton} onPress={handleAddAffirmation}>
              <Text style={styles.saveButtonText}>
                {editingAffirmation ? 'Update' : 'Add'} Affirmation
              </Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F0FF',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 24,
    backgroundColor: '#fff',
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#999',
    marginTop: 4,
  },
  addButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#9370DB',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#9370DB',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  listContent: {
    padding: 16,
  },
  affirmationCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    overflow: 'hidden',
  },
  thumbnailImage: {
    width: '100%',
    height: 120,
    backgroundColor: '#F0F0F0',
  },
  affirmationContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 20,
    flex: 1,
  },
  starIcon: {
    marginRight: 12,
    marginTop: 2,
  },
  affirmationText: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    lineHeight: 24,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 20,
    paddingBottom: 16,
    justifyContent: 'flex-end',
  },
  iconButton: {
    padding: 8,
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#999',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 48,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 24,
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#999',
    marginTop: 8,
    textAlign: 'center',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  input: {
    backgroundColor: '#F5F0FF',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#333',
    minHeight: 100,
    textAlignVertical: 'top',
    marginBottom: 16,
  },
  imageSection: {
    marginBottom: 24,
  },
  imageSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  imagePickerButton: {
    backgroundColor: '#F5F0FF',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#E6E6FA',
    borderStyle: 'dashed',
  },
  imagePickerText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#9370DB',
    marginTop: 12,
  },
  imagePickerSubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 4,
  },
  imagePreviewContainer: {
    position: 'relative',
    borderRadius: 12,
    overflow: 'hidden',
  },
  imagePreview: {
    width: '100%',
    height: 200,
    borderRadius: 12,
  },
  removeImageButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 16,
  },
  saveButton: {
    backgroundColor: '#9370DB',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
});
