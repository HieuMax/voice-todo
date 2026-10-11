export const FEEDBACK_TYPES = ["bug", "feature", "other"] as const;

export type FeedbackType = (typeof FEEDBACK_TYPES)[number];

export const FEEDBACK_TYPE_LABELS: Record<FeedbackType, string> = {
  bug: "Báo lỗi",
  feature: "Đề xuất",
  other: "Khác",
};

export const FEEDBACK_MESSAGE_MIN = 5;
export const FEEDBACK_MESSAGE_MAX = 2000;
export const FEEDBACK_CONTACT_MAX = 200;

export function isFeedbackType(value: unknown): value is FeedbackType {
  return (
    typeof value === "string" && (FEEDBACK_TYPES as readonly string[]).includes(value)
  );
}

export function validateFeedback(input: {
  message: string;
  contact: string;
}): string | null {
  const message = input.message.trim();
  if (message.length < FEEDBACK_MESSAGE_MIN) {
    return "Vui lòng nhập nội dung phản hồi (ít nhất 5 ký tự).";
  }
  if (message.length > FEEDBACK_MESSAGE_MAX) {
    return `Nội dung quá dài (tối đa ${FEEDBACK_MESSAGE_MAX} ký tự).`;
  }
  if (input.contact.trim().length > FEEDBACK_CONTACT_MAX) {
    return `Thông tin liên hệ quá dài (tối đa ${FEEDBACK_CONTACT_MAX} ký tự).`;
  }
  return null;
}
