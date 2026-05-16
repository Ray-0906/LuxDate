import { DateTime } from 'luxon';

const TZ = 'Asia/Kolkata';

export function getTodayIST() {
  return DateTime.now().setZone(TZ).toFormat('yyyy-MM-dd');
}

export function getStartOfTomorrowIST() {
  return DateTime.now()
    .setZone(TZ)
    .plus({ days: 1 })
    .startOf('day')
    .toJSDate();
}
