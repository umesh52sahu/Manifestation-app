import { create } from 'zustand';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

// Helper to safely parse JSON responses and throw on non-OK status
async function parseJsonResponse<T>(response: Response): Promise<T> {
  const text = await response.text();
  if (!response.ok) {
    throw new Error(`Server error ${response.status}: ${text}`);
  }
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error(`Invalid JSON response: ${text.slice(0, 200)}`);
  }
}

interface Affirmation {
  id: string;
  text: string;
  order: number;
  is_example: boolean;
  created_at: string;
  image?: string | null;
}

interface DailyProgress {
  id: string;
  date: string;
  completed_affirmations: string[];
  total_affirmations: number;
  completion_percentage: number;
  practice_count: number;
}

interface Settings {
  id: string;
  morning_time: string;
  night_time: string;
  notifications_enabled: boolean;
  notification_times: Array<{
    id: string;
    time: string;
    label: string;
    enabled: boolean;
  }>;
  current_streak: number;
  longest_streak: number;
  last_practice_date: string | null;
}

interface AffirmationStore {
  affirmations: Affirmation[];
  dailyProgress: DailyProgress | null;
  settings: Settings | null;
  loading: boolean;

  // Affirmation actions
  fetchAffirmations: () => Promise<void>;
  addAffirmation: (text: string) => Promise<void>;
  updateAffirmation: (id: string, data: { text?: string; order?: number }) => Promise<void>;
  deleteAffirmation: (id: string) => Promise<void>;

  // Progress actions
  fetchTodayProgress: () => Promise<void>;
  markAffirmationComplete: (affirmationId: string) => Promise<void>;

  // Settings actions
  fetchSettings: () => Promise<void>;
  updateSettings: (data: Partial<Settings>) => Promise<void>;
}

export const useAffirmationStore = create<AffirmationStore>((set, get) => ({
  affirmations: [],
  dailyProgress: null,
  settings: null,
  loading: false,

  fetchAffirmations: async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/affirmations`);
      const data = await parseJsonResponse<Affirmation[]>(response);
      set({ affirmations: data });
    } catch (error) {
      console.error('Failed to fetch affirmations:', error);
    }
  },

  addAffirmation: async (text: string, image?: string) => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/affirmations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, image }),
      });
      const newAffirmation = await parseJsonResponse<Affirmation>(response);
      set((state) => ({
        affirmations: [...state.affirmations, newAffirmation],
      }));
    } catch (error) {
      console.error('Failed to add affirmation:', error);
      throw error;
    }
  },

  updateAffirmation: async (id: string, data: { text?: string; order?: number; image?: string }) => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/affirmations/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const updatedAffirmation = await parseJsonResponse<Affirmation>(response);
      set((state) => ({
        affirmations: state.affirmations.map((aff) =>
          aff.id === id ? updatedAffirmation : aff
        ),
      }));
    } catch (error) {
      console.error('Failed to update affirmation:', error);
      throw error;
    }
  },

  deleteAffirmation: async (id: string) => {
    try {
      await fetch(`${BACKEND_URL}/api/affirmations/${id}`, {
        method: 'DELETE',
      });
      set((state) => ({
        affirmations: state.affirmations.filter((aff) => aff.id !== id),
      }));
    } catch (error) {
      console.error('Failed to delete affirmation:', error);
      throw error;
    }
  },

  fetchTodayProgress: async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/progress/today`);
      const data = await parseJsonResponse<DailyProgress>(response);
      set({ dailyProgress: data });
    } catch (error) {
      console.error('Failed to fetch progress:', error);
    }
  },

  markAffirmationComplete: async (affirmationId: string) => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const response = await fetch(`${BACKEND_URL}/api/progress/mark-complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: today, affirmation_id: affirmationId }),
      });
      const data = await parseJsonResponse<DailyProgress>(response);
      set({ dailyProgress: data });

      // Refresh settings to update streak
      await get().fetchSettings();
    } catch (error) {
      console.error('Failed to mark affirmation complete:', error);
      throw error;
    }
  },

  fetchSettings: async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/settings`);
      const data = await parseJsonResponse<Settings>(response);
      set({ settings: data });
    } catch (error) {
      console.error('Failed to fetch settings:', error);
    }
  },

  updateSettings: async (data: Partial<Settings>) => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/settings`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const updatedSettings = await parseJsonResponse<Settings>(response);
      set({ settings: updatedSettings });
    } catch (error) {
      console.error('Failed to update settings:', error);
      throw error;
    }
  },
}));
