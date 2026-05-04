import { Capacitor } from "@capacitor/core";
import { LocalNotifications } from "@capacitor/local-notifications";
import { KEY_EXAM_DATE } from "../mobile/pages/MOnboardingGate";

const KEY_NOTIF_SETUP = "fly_notif_setup_v1";
const KEY_NOTIF_TIME  = "fly_notif_hour"; // default 20 (8pm)
const SCHEDULE_DAYS   = 30;               // schedule 30 days ahead

const STUDY_MESSAGES = [
  { title: "📚 Giờ học PTE rồi!", body: "Chỉ 10 phút thôi – làm 3 câu Read Aloud để giữ streak nhé!" },
  { title: "🎙️ Luyện Speaking hôm nay chưa?", body: "Đang nghỉ trưa hả? Làm nhanh 3 câu Read Aloud chỉ tốn 2 phút thôi!" },
  { title: "✍️ Writing chờ bạn kìa!", body: "Một câu Summarize Written Text mỗi ngày sẽ cải thiện điểm nhanh lắm đó." },
  { title: "🎧 Nghe thử 5 phút?", body: "Một bài Listening ngắn trước khi đi ngủ giúp não xử lý ngôn ngữ tốt hơn." },
  { title: "🔥 Đừng để streak bị gãy!", body: "Hôm nay bạn chưa luyện. Làm nhanh 1 câu để giữ chuỗi ngày học liên tục." },
  { title: "📖 Reading hôm nay chưa?", body: "Đọc một đoạn văn ngắn giúp tăng tốc độ đọc hiểu cho kỳ thi PTE." },
  { title: "💪 Ngày mới, bài mới!", body: "Hệ thống AI đã chuẩn bị bài tập phù hợp với trình độ của bạn hôm nay." },
  { title: "🎯 Kiên trì là chìa khóa!", body: "Người đạt 79+ thường luyện đều đặn mỗi ngày – hôm nay bạn đã sẵn sàng chưa?" },
  { title: "⚡ 10 phút đổi thành tích", body: "Nghiên cứu cho thấy học ngắn và đều đặn hiệu quả hơn học dồn. Bắt đầu ngay!" },
  { title: "🏆 Mục tiêu đang chờ!", body: "Hãy làm ít nhất 1 câu Speaking hôm nay để tiến gần hơn đến điểm mục tiêu." },
];

const COUNTDOWN_MESSAGES = [
  (d: number) => ({ title: `⏳ Còn ${d} ngày nữa thi!`, body: "Hãy tập trung vào Speaking – kỹ năng quyết định điểm số nhất." }),
  (d: number) => ({ title: `🎯 ${d} ngày còn lại`, body: "Luyện ít nhất 2 tiếng mỗi ngày để đạt mục tiêu điểm số." }),
  (d: number) => ({ title: `📅 Còn ${d} ngày!`, body: "Đừng bỏ qua Mock Test – thi thử để quen áp lực phòng thi thật." }),
  (d: number) => ({ title: `🔥 ${d} ngày – nước rút rồi!`, body: "Ôn lại những dạng bài hay gặp nhất: Read Aloud, Repeat Sentence, Listening FIB." }),
];

export async function setupSmartNotifications(hourOfDay: number = 20): Promise<boolean> {
  try {
    const { display } = await LocalNotifications.requestPermissions();
    if (display !== "granted") return false;

    // Cancel all pending before rescheduling
    const pending = await LocalNotifications.getPending();
    if (pending.notifications.length > 0) {
      await LocalNotifications.cancel({ notifications: pending.notifications });
    }

    const now = new Date();
    const notifications: Parameters<typeof LocalNotifications.schedule>[0]["notifications"] = [];

    for (let day = 0; day < SCHEDULE_DAYS; day++) {
      const target = new Date(now);
      target.setDate(target.getDate() + day);
      target.setHours(hourOfDay, 0, 0, 0);
      if (target.getTime() <= Date.now()) continue;

      const examDate = localStorage.getItem(KEY_EXAM_DATE);
      let msg: { title: string; body: string };

      if (examDate) {
        const daysLeft = Math.ceil((new Date(examDate).getTime() - target.getTime()) / 86400000);
        if (daysLeft > 0 && daysLeft <= 30) {
          const tmpl = COUNTDOWN_MESSAGES[day % COUNTDOWN_MESSAGES.length];
          msg = tmpl(daysLeft);
        } else {
          msg = STUDY_MESSAGES[day % STUDY_MESSAGES.length];
        }
      } else {
        msg = STUDY_MESSAGES[day % STUDY_MESSAGES.length];
      }

      notifications.push({
        id: 1000 + day,
        title: msg.title,
        body: msg.body,
        schedule: { at: target },
        sound: undefined,
        actionTypeId: "OPEN_APP",
        extra: { screen: "dashboard" },
      });
    }

    if (notifications.length > 0) {
      await LocalNotifications.schedule({ notifications });
    }

    localStorage.setItem(KEY_NOTIF_SETUP, Date.now().toString());
    localStorage.setItem(KEY_NOTIF_TIME, String(hourOfDay));
    return true;
  } catch {
    return false;
  }
}

export async function cancelAllNotifications(): Promise<void> {
  try {
    const pending = await LocalNotifications.getPending();
    if (pending.notifications.length > 0) {
      await LocalNotifications.cancel({ notifications: pending.notifications });
    }
  } catch {
    // not available on web
  }
  // Always clear the setup flag so isNotifSetup() returns false immediately
  localStorage.removeItem(KEY_NOTIF_SETUP);
}

/**
 * Whether local notifications UI should be shown (native shell only).
 * Do not call LocalNotifications.checkPermissions() here — on some Android devices it crashes
 * natively (NPE inside LocalNotificationsPlugin) when the activity/bridge is not ready,
 * which took down the app when opening Profile.
 */
export async function isNotifSupported(): Promise<boolean> {
  return Capacitor.isNativePlatform();
}

export function getNotifHour(): number {
  return parseInt(localStorage.getItem(KEY_NOTIF_TIME) || "20");
}

export function isNotifSetup(): boolean {
  return !!localStorage.getItem(KEY_NOTIF_SETUP);
}

/**
 * Refresh notification schedule if it was set up but might be running out.
 * Call on app resume or cold start to ensure reminders don't expire silently.
 */
export async function refreshNotificationsIfNeeded(): Promise<void> {
  if (!isNotifSetup()) return;
  try {
    const pending = await LocalNotifications.getPending();
    // Reschedule if fewer than 7 notifications remain
    if (pending.notifications.length < 7) {
      const hour = getNotifHour();
      await setupSmartNotifications(hour);
    }
  } catch {
    // not available on web — ignore
  }
}
