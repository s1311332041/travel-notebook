// 時間轉換工具
export const timeToMinutes = (time) => {
  if (!time) return 0;
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
};

export const minutesToTime = (minutes) => {
  const h = Math.floor(minutes / 60) % 24;
  const m = Math.floor(minutes % 60);
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
};

export const formatTimeFromHour = (hour) => {
  const h = Math.floor(hour);
  return `${h.toString().padStart(2, '0')}:00`;
};

export const getDisplayDate = (startDateStr, dayOffset) => {
  if (!startDateStr) return `Day ${dayOffset + 1}`;
  const date = new Date(startDateStr);
  date.setDate(date.getDate() + dayOffset);
  const weekDays = ['日', '一', '二', '三', '四', '五', '六'];
  return `${date.getMonth() + 1}/${date.getDate()} (${weekDays[date.getDay()]})`;
};

export const HOURS = Array.from({ length: 24 }, (_, i) => i);

export const TAG_COLORS = [
  { id: 'green', bg: '#e2ebe0', text: '#4a5e45', border: '#7a9e75', name: '森林綠' },
  { id: 'blue', bg: '#e0e8eb', text: '#45525e', border: '#75909e', name: '迷霧藍' },
  { id: 'yellow', bg: '#f7f0e1', text: '#7d6842', border: '#d4b06a', name: '奶茶黃' },
  { id: 'red', bg: '#ebe0e0', text: '#5e4545', border: '#9e7575', name: '乾燥玫瑰' },
  { id: 'purple', bg: '#ebe0eb', text: '#5e455c', border: '#8e759e', name: '薰衣草' },
  { id: 'gray', bg: '#ebebeb', text: '#5e5e5e', border: '#9e9e9e', name: '石墨灰' },
];

export const DEFAULT_TAGS = [
  { id: 'sightseeing', name: '景點', colorId: 'green' },
  { id: 'transport', name: '交通', colorId: 'blue' },
  { id: 'food', name: '飲食', colorId: 'yellow' }
];