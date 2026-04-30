import { LocalNotifications } from "@capacitor/local-notifications";
import { KEY_EXAM_DATE } from "../mobile/pages/MOnboardingGate";

const KEY_NOTIF_SETUP = "fly_notif_setup_v1";
const KEY_NOTIF_TIME = "fly_notif_hour"; // default 20 (8pm)

const STUDY_MESSAGES = [
  { title: "📚 Giờ học PTE rồi!", body: "Chỉ 10 phút thôi – làm 3 câu Read Aloud để giữ streak nhé!" },
  { title: "🎙️ Luyện Speaking hôm nay chưa?", body: "Đang nghỉ trưa hả? Làm nhanh 3 câu Read Aloud chỉ tốn 2 phút thôi!" },
  { title: "✍️ Writing chờ bạn kìa!", body: "Một câu Summarize Written Text mỗi ngày sẽ cải thiện điểm nhanh lắm đó." },
  { title: "🎧 Nghe thử 5 phút?", body: "Một bài Listening ngắn trước khi đi ngủ giúp não xử lý ngôn ngữ tốt hơn." },
  { title: "🔥 Đừng để streak bị gãy!", body: "Hôm nay bạn chưa luyện. Làm nhanh 1 câu để giữ chuỗi ngày học liên tục." },
  { title: "📖 Reading hôm nay chưa?", body: "Đọc một đoạn văn ngắn giúp tăng tốc độ đọc hiểu cho kỳ thi PTE." },
  { title: "💪 Ngày mới, bài mới!", body: "Hệ thống AI đã chuẩn bị bài tập phù hợp với trình độ của bạn hôm nay." },
];

const COUNTDOWN_MESSAGES = [
  (d: number) => ({ title: `⏳ Còn ${d} ngày nữa thi!`, body: "Hãy tập trung vào Speaking – kỹ năng quyết định điểm số nhất." }),
  (d: number) => ({ title: `🎯 ${d} ngày còn lại`, body: "Luyện ít nhất 2 tiếng mỗi ngày để đạt mục tiêu điểm số." }),
  (d: number) => ({ title: `📅 Còn ${d} ngày!`, body: "Đừng bỏ qua Mock Test – thi thử để quen áp lực phòng thi thật." }),
];

export async function setupSmartNotifications(hourOfDay: number = 20) {
  try {
    const { display } = await LocalNotifications.requestPermissions();
    if (display !== "granted") return false;

    await LocalNotifications.cancel({ notifications: [] });

    const now = new Date();
    const notifications: Parameters<typeof LocalNotifications.schedule>[0]["notifications"] = [];

    // Schedule 14 days of smart daily reminders
    for (let day = 0; day < 14; day++) {
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

export async function cancelAllNotifications() {
  try {
    const pending = await LocalNotifications.getPending();
    if (pending.notifications.length > 0) {
      await LocalNotifications.cancel({ notifications: pending.notifications });
    }
  } catch {
    // not available on web
  }
}

export async function isNotifSupported() {
  try {
    await LocalNotifications.checkPermissions();
    return true;
  } catch {
    return false;
  }
}

export function getNotifHour() {
  return parseInt(localStorage.getItem(KEY_NOTIF_TIME) || "20");
}

export function isNotifSetup() {
  return !!localStorage.getItem(KEY_NOTIF_SETUP);
}
