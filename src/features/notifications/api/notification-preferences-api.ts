import { requireSupabaseClient } from "@/shared/utils/supabase-client";

export type NotificationPreferences = {
  weeklyReviewEnabled: boolean;
  dailyBreakfastSummaryEnabled: boolean;
  dailyLunchSummaryEnabled: boolean;
  participationReminderEnabled: boolean;
  dinnerSummaryEnabled: boolean;
};

export const defaultNotificationPreferences: NotificationPreferences = {
  weeklyReviewEnabled: true,
  dailyBreakfastSummaryEnabled: false,
  dailyLunchSummaryEnabled: true,
  participationReminderEnabled: true,
  dinnerSummaryEnabled: false,
};

export async function fetchNotificationPreferences(userId: string): Promise<NotificationPreferences> {
  const { data, error } = await requireSupabaseClient()
    .from("notification_preferences")
    .select("weekly_review_enabled,daily_breakfast_summary_enabled,daily_lunch_summary_enabled,participation_reminder_enabled,dinner_summary_enabled")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return defaultNotificationPreferences;
  return {
    weeklyReviewEnabled: data.weekly_review_enabled,
    dailyBreakfastSummaryEnabled: data.daily_breakfast_summary_enabled,
    dailyLunchSummaryEnabled: data.daily_lunch_summary_enabled,
    participationReminderEnabled: data.participation_reminder_enabled,
    dinnerSummaryEnabled: data.dinner_summary_enabled,
  };
}

export async function saveNotificationPreferences(userId: string, preferences: NotificationPreferences) {
  const { error } = await requireSupabaseClient().from("notification_preferences").upsert({
    user_id: userId,
    weekly_review_enabled: preferences.weeklyReviewEnabled,
    daily_breakfast_summary_enabled: preferences.dailyBreakfastSummaryEnabled,
    daily_lunch_summary_enabled: preferences.dailyLunchSummaryEnabled,
    participation_reminder_enabled: preferences.participationReminderEnabled,
    dinner_summary_enabled: preferences.dinnerSummaryEnabled,
  });
  if (error) throw error;
}
