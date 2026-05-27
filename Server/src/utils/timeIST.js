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

export function getStartOfTodayIST() {
  return DateTime.now()
    .setZone(TZ)
    .startOf('day')
    .toJSDate();
}

export function getEndOfTodayIST() {
  return DateTime.now()
    .setZone(TZ)
    .endOf('day')
    .toJSDate();
}

export function toISTDateKey(date) {
  return DateTime.fromJSDate(new Date(date), { zone: 'utc' })
    .setZone(TZ)
    .toFormat('yyyy-MM-dd');
}

export function toISTStartOfDay(date) {
  return DateTime.fromJSDate(new Date(date), { zone: 'utc' })
    .setZone(TZ)
    .startOf('day');
}
