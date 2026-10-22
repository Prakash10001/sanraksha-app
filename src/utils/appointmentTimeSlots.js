const SLOT_INTERVAL_MINUTES = 20;
const START_MINUTES = 9 * 60;
const END_MINUTES = 15 * 60;

function formatTime(totalMinutes) {
  const hours24 = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  const meridiem = hours24 >= 12 ? "pm" : "am";
  const hours12 = hours24 % 12 || 12;
  return `${hours12}:${String(minutes).padStart(2, "0")} ${meridiem}`;
}

const APPOINTMENT_TIME_SLOTS = Array.from(
  { length: (END_MINUTES - START_MINUTES) / SLOT_INTERVAL_MINUTES },
  (_, index) => ({
    label: formatTime(START_MINUTES + index * SLOT_INTERVAL_MINUTES),
    available: true,
  })
);

export default APPOINTMENT_TIME_SLOTS;
