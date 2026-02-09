import { Stack } from 'expo-router';
import { useEffect } from 'react';
import { Platform } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { getNotificationsModule } from '../utils/notifications';

export default function RootLayout() {
  useEffect(() => {
    const setupNotifications = async () => {
      try {
        const Notifications = await getNotificationsModule();
        if (!Notifications) {
          console.log('[RootLayout] Notifications module not available, skipping setup');
          return;
        }

        // Set notification handler — controls foreground behavior
        Notifications.setNotificationHandler({
          handleNotification: async () => ({
            shouldShowAlert: true,
            shouldPlaySound: true,
            shouldSetBadge: true,
            shouldShowBanner: true,
            shouldShowList: true,
          }),
        });
        console.log('[RootLayout] Notification handler set');

        // Create Android notification channel
        if (Platform.OS === 'android') {
          // Delete old channel if it exists (to reset any bad config)
          try {
            await Notifications.deleteNotificationChannelAsync('daily-reminders');
          } catch (e) {
            // Channel didn't exist, that's fine
          }

          await Notifications.setNotificationChannelAsync('daily-reminders', {
            name: 'Daily Reminders',
            description: 'Reminders for your daily affirmation practice',
            importance: Notifications.AndroidImportance.HIGH,
            vibrationPattern: [0, 250, 250, 250],
            sound: 'default',
            enableVibrate: true,
            showBadge: true,
            lockscreenVisibility: Notifications.AndroidNotificationVisibility?.PUBLIC,
            bypassDnd: false,
            enableLights: true,
            lightColor: '#9370DB',
          });
          console.log('[RootLayout] Android notification channel "daily-reminders" created');
        }
      } catch (error) {
        console.error('[RootLayout] Failed to setup notifications:', error);
      }
    };

    setupNotifications();
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: '#0a0a1a' },
        }}
      />
    </GestureHandlerRootView>
  );
}
