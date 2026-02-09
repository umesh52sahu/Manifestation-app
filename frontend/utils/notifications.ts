import Constants from 'expo-constants';

/**
 * Safely loads expo-notifications.
 * Returns null in Expo Go (where the module was removed in SDK 53+)
 * and in any environment where the native module isn't available.
 */
export async function getNotificationsModule(): Promise<typeof import('expo-notifications') | null> {
    // Only block in Expo Go — standalone/dev builds should always proceed
    const isExpoGo = Constants.appOwnership === 'expo';
    if (isExpoGo) {
        console.log('[Notifications] Running in Expo Go — notifications disabled');
        return null;
    }

    try {
        const mod = await import('expo-notifications');
        // Verify the native module is actually available
        if (!mod || !mod.scheduleNotificationAsync) {
            console.log('[Notifications] Module imported but native methods unavailable');
            return null;
        }
        console.log('[Notifications] Module loaded successfully');
        return mod;
    } catch (e) {
        console.log('[Notifications] Failed to load module:', e);
        return null;
    }
}
