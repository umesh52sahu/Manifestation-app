import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Platform,
  Modal,
  TextInput,
  Alert,
} from 'react-native';
import { useState, useEffect } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useAffirmationStore } from '../../store/affirmationStore';
import { getNotificationsModule } from '../../utils/notifications';

let Notifications: any = null;

interface NotificationTime {
  id: string;
  time: string;
  label: string;
  enabled: boolean;
}

export default function SettingsScreen() {
  const { settings, fetchSettings, updateSettings } = useAffirmationStore();
  const [loading, setLoading] = useState(true);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [notificationTimes, setNotificationTimes] = useState<NotificationTime[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [newLabel, setNewLabel] = useState('');
  const [selectedTime, setSelectedTime] = useState(new Date());
  const [notificationsReady, setNotificationsReady] = useState(false);

  useEffect(() => {
    const init = async () => {
      Notifications = await getNotificationsModule();
      setNotificationsReady(!!Notifications);
      if (Notifications) {
        console.log('[Settings] Notifications module loaded');
      } else {
        console.log('[Settings] Notifications module NOT available');
      }
      await loadSettings();
      await checkNotificationPermissions();
    };
    init();
  }, []);

  useEffect(() => {
    if (settings) {
      setNotificationsEnabled(settings.notifications_enabled || false);
      setNotificationTimes(settings.notification_times || []);
    }
  }, [settings]);

  const loadSettings = async () => {
    await fetchSettings();
    setLoading(false);
  };

  const checkNotificationPermissions = async () => {
    if (!Notifications) {
      setNotificationsEnabled(false);
      return;
    }
    const { status } = await Notifications.getPermissionsAsync();
    console.log('[Settings] Current permission status:', status);
    if (status !== 'granted') {
      setNotificationsEnabled(false);
    }
  };

  const handleToggleNotifications = async (value: boolean) => {
    if (!Notifications) {
      Alert.alert(
        'Not Available',
        'Push notifications are not supported in Expo Go. Please use a development build.'
      );
      return;
    }

    if (value) {
      const { status } = await Notifications.requestPermissionsAsync();
      console.log('[Settings] Permission request result:', status);
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Notification permissions are required to set reminders.');
        return;
      }
    }

    setNotificationsEnabled(value);
    await updateSettings({ notifications_enabled: value });

    if (value) {
      await scheduleAllNotifications(notificationTimes);
    } else {
      await Notifications.cancelAllScheduledNotificationsAsync();
      console.log('[Settings] All notifications cancelled');
    }
  };

  const scheduleAllNotifications = async (timesToSchedule?: NotificationTime[]) => {
    if (!Notifications) {
      console.log('[Settings] Notifications module not available, skipping schedule');
      return;
    }

    const times = timesToSchedule || notificationTimes;

    // Cancel all existing scheduled notifications
    await Notifications.cancelAllScheduledNotificationsAsync();
    console.log('[Settings] Cancelled all existing notifications');

    // Schedule each enabled notification time
    for (const notifTime of times) {
      if (notifTime.enabled) {
        const [hour, minute] = notifTime.time.split(':').map(Number);

        try {
          // Build notification content — title is the user's label name
          const notificationContent: any = {
            title: `${notifTime.label}`,
            body: 'Time for your daily affirmations practice! ✨',
            sound: 'default',
            sticky: false,
            autoDismiss: true,
          };

          // Android-specific: set priority and data
          if (Platform.OS === 'android') {
            notificationContent.priority = Notifications.AndroidNotificationPriority?.HIGH ?? 'high';
            // Setting the notification category helps Android display it correctly
            notificationContent.categoryIdentifier = 'reminder';
          }

          // Build trigger
          const trigger: any = {
            hour,
            minute,
            repeats: true,
          };

          // Android: channelId MUST be in the trigger
          if (Platform.OS === 'android') {
            trigger.channelId = 'daily-reminders';
          }

          const id = await Notifications.scheduleNotificationAsync({
            content: notificationContent,
            trigger,
          });

          console.log(`[Settings] Scheduled "${notifTime.label}" at ${hour}:${String(minute).padStart(2, '0')}, id: ${id}`);
        } catch (error) {
          console.error(`[Settings] Failed to schedule "${notifTime.label}":`, error);
        }
      }
    }

    // Debug: log all scheduled notifications
    try {
      const scheduled = await Notifications.getAllScheduledNotificationsAsync();
      console.log(`[Settings] Total scheduled notifications: ${scheduled.length}`);
      scheduled.forEach((n: any, i: number) => {
        console.log(`  [${i}] id=${n.identifier}, title="${n.content?.title}", body="${n.content?.body}", trigger=`, JSON.stringify(n.trigger));
      });
    } catch (e) {
      console.log('[Settings] Could not list scheduled notifications:', e);
    }
  };

  const handleToggleNotificationTime = async (id: string) => {
    const updatedTimes = notificationTimes.map((nt) =>
      nt.id === id ? { ...nt, enabled: !nt.enabled } : nt
    );
    setNotificationTimes(updatedTimes);
    await updateSettings({ notification_times: updatedTimes });

    if (notificationsEnabled) {
      await scheduleAllNotifications(updatedTimes);
    }
  };

  const handleDeleteNotificationTime = async (id: string) => {
    Alert.alert(
      'Delete Notification',
      'Are you sure you want to delete this notification time?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const updatedTimes = notificationTimes.filter((nt) => nt.id !== id);
            setNotificationTimes(updatedTimes);
            await updateSettings({ notification_times: updatedTimes });

            if (notificationsEnabled) {
              await scheduleAllNotifications(updatedTimes);
            }
          },
        },
      ]
    );
  };

  const handleAddNotificationTime = async () => {
    if (!newLabel.trim()) {
      Alert.alert('Error', 'Please enter a label for this notification');
      return;
    }

    const hour = selectedTime.getHours().toString().padStart(2, '0');
    const minute = selectedTime.getMinutes().toString().padStart(2, '0');
    const timeString = `${hour}:${minute}`;

    const newNotification: NotificationTime = {
      id: `notif_${Date.now()}`,
      time: timeString,
      label: newLabel.trim(),
      enabled: true,
    };

    const updatedTimes = [...notificationTimes, newNotification];
    setNotificationTimes(updatedTimes);
    await updateSettings({ notification_times: updatedTimes });

    if (notificationsEnabled) {
      await scheduleAllNotifications(updatedTimes);
    }

    setShowAddModal(false);
    setNewLabel('');
    setSelectedTime(new Date());
  };

  const openAddModal = () => {
    setNewLabel('');
    setSelectedTime(new Date());
    setShowAddModal(true);
  };

  const onTimeChange = (event: any, selectedDate?: Date) => {
    const currentDate = selectedDate || selectedTime;
    setShowTimePicker(Platform.OS === 'ios');
    setSelectedTime(currentDate);
  };

  const formatTime = (time: string) => {
    const [hour, minute] = time.split(':');
    const hourNum = parseInt(hour, 10);
    const ampm = hourNum >= 12 ? 'PM' : 'AM';
    const hour12 = hourNum % 12 || 12;
    return `${hour12}:${minute} ${ampm}`;
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Settings</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Notifications Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="notifications" size={24} color="#9370DB" />
            <Text style={styles.sectionTitle}>Notifications</Text>
          </View>

          <View style={styles.card}>
            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>Daily Reminders</Text>
                <Text style={styles.settingDescription}>
                  Receive notifications for your practice
                </Text>
              </View>
              <Switch
                value={notificationsEnabled}
                onValueChange={handleToggleNotifications}
                trackColor={{ false: '#E0E0E0', true: '#D4C4F9' }}
                thumbColor={notificationsEnabled ? '#9370DB' : '#f4f3f4'}
              />
            </View>

            {notificationsEnabled && (
              <>
                <View style={styles.divider} />

                {/* Notification Times List */}
                {notificationTimes.map((notifTime) => (
                  <View key={notifTime.id}>
                    <View style={styles.notificationTimeRow}>
                      <View style={styles.timeContent}>
                        <Ionicons
                          name={notifTime.enabled ? "notifications" : "notifications-off"}
                          size={24}
                          color={notifTime.enabled ? "#9370DB" : "#CCC"}
                        />
                        <View style={styles.timeInfo}>
                          <Text style={styles.timeLabel}>{notifTime.label}</Text>
                          <Text style={styles.timeValue}>{formatTime(notifTime.time)}</Text>
                        </View>
                      </View>
                      <View style={styles.timeActions}>
                        <TouchableOpacity
                          onPress={() => handleToggleNotificationTime(notifTime.id)}
                          style={styles.timeActionButton}
                        >
                          <Ionicons
                            name={notifTime.enabled ? "checkmark-circle" : "checkmark-circle-outline"}
                            size={24}
                            color={notifTime.enabled ? "#4CAF50" : "#CCC"}
                          />
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={() => handleDeleteNotificationTime(notifTime.id)}
                          style={styles.timeActionButton}
                        >
                          <Ionicons name="trash-outline" size={22} color="#FF6B6B" />
                        </TouchableOpacity>
                      </View>
                    </View>
                    <View style={styles.divider} />
                  </View>
                ))}

                {/* Add Notification Button */}
                <TouchableOpacity
                  style={styles.addNotificationButton}
                  onPress={openAddModal}
                >
                  <Ionicons name="add-circle" size={24} color="#9370DB" />
                  <Text style={styles.addNotificationText}>Add Notification Time</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>

        {/* Stats Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="stats-chart" size={24} color="#4CAF50" />
            <Text style={styles.sectionTitle}>Your Stats</Text>
          </View>

          <View style={styles.card}>
            <View style={styles.statRow}>
              <View style={styles.statIconContainer}>
                <Ionicons name="flame" size={28} color="#FF6B6B" />
              </View>
              <View style={styles.statInfo}>
                <Text style={styles.statLabel}>Current Streak</Text>
                <Text style={styles.statValue}>{settings?.current_streak || 0} days</Text>
              </View>
            </View>

            <View style={styles.divider} />
            <View style={styles.statRow}>
              <View style={styles.statIconContainer}>
                <Ionicons name="trophy" size={28} color="#FFD700" />
              </View>
              <View style={styles.statInfo}>
                <Text style={styles.statLabel}>Longest Streak</Text>
                <Text style={styles.statValue}>{settings?.longest_streak || 0} days</Text>
              </View>
            </View>

            <View style={styles.divider} />
            <View style={styles.statRow}>
              <View style={styles.statIconContainer}>
                <Ionicons name="calendar" size={28} color="#9370DB" />
              </View>
              <View style={styles.statInfo}>
                <Text style={styles.statLabel}>Last Practice</Text>
                <Text style={styles.statValue}>
                  {settings?.last_practice_date || 'Not yet'}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* About Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="information-circle" size={24} color="#2196F3" />
            <Text style={styles.sectionTitle}>About</Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.aboutText}>
              Manifest is designed to help you build a daily affirmation practice,
              track your consistency, and manifest positive change in your life.
            </Text>
            <View style={styles.versionContainer}>
              <Text style={styles.versionText}>Version 1.0.0</Text>
            </View>
          </View>
        </View>

        {/* Inspirational Quote */}
        <View style={styles.quoteCard}>
          <Ionicons name="chatbubble-outline" size={32} color="#9370DB" />
          <Text style={styles.quoteText}>
            &quot;What you think, you become. What you feel, you attract.
            What you imagine, you create.&quot;
          </Text>
          <Text style={styles.quoteAuthor}>- Buddha</Text>
        </View>
      </ScrollView>

      {/* Add Notification Modal */}
      <Modal
        visible={showAddModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowAddModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Notification</Text>
              <TouchableOpacity onPress={() => setShowAddModal(false)}>
                <Ionicons name="close" size={28} color="#666" />
              </TouchableOpacity>
            </View>

            <TextInput
              style={styles.input}
              placeholder="Label (e.g., Afternoon, Bedtime)"
              value={newLabel}
              onChangeText={setNewLabel}
            />

            <TouchableOpacity
              style={styles.timePickerButton}
              onPress={() => setShowTimePicker(true)}
            >
              <Ionicons name="time" size={24} color="#9370DB" />
              <Text style={styles.timePickerText}>
                {selectedTime.getHours().toString().padStart(2, '0')}:
                {selectedTime.getMinutes().toString().padStart(2, '0')}
              </Text>
            </TouchableOpacity>

            {showTimePicker && (
              <DateTimePicker
                value={selectedTime}
                mode="time"
                is24Hour={true}
                display="default"
                onChange={onTimeChange}
              />
            )}

            <TouchableOpacity
              style={styles.saveButton}
              onPress={handleAddNotificationTime}
            >
              <Text style={styles.saveButtonText}>Add Notification</Text>
            </TouchableOpacity>
          </View>
        </View>
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
  scrollContent: {
    padding: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
    paddingHorizontal: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  settingInfo: {
    flex: 1,
    marginRight: 16,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  settingDescription: {
    fontSize: 14,
    color: '#999',
  },
  divider: {
    height: 1,
    backgroundColor: '#E0E0E0',
    marginVertical: 16,
  },
  notificationTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  timeContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    flex: 1,
  },
  timeInfo: {
    flex: 1,
  },
  timeLabel: {
    fontSize: 14,
    color: '#999',
    marginBottom: 4,
  },
  timeValue: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  timeActions: {
    flexDirection: 'row',
    gap: 12,
  },
  timeActionButton: {
    padding: 4,
  },
  addNotificationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
  },
  addNotificationText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#9370DB',
  },
  statRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  statIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F5F0FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statInfo: {
    flex: 1,
  },
  statLabel: {
    fontSize: 14,
    color: '#999',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  aboutText: {
    fontSize: 15,
    color: '#666',
    lineHeight: 22,
  },
  versionContainer: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  versionText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
  quoteCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#E6E6FA',
  },
  quoteText: {
    fontSize: 16,
    color: '#333',
    textAlign: 'center',
    fontStyle: 'italic',
    lineHeight: 24,
    marginTop: 16,
  },
  quoteAuthor: {
    fontSize: 14,
    color: '#9370DB',
    fontWeight: '600',
    marginTop: 12,
  },
  loadingText: {
    fontSize: 16,
    color: '#999',
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
    minHeight: 350,
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
    marginBottom: 16,
  },
  timePickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#F5F0FF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
  },
  timePickerText: {
    fontSize: 24,
    fontWeight: '600',
    color: '#333',
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
