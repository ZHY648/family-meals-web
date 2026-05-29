const MEAL_LIST = [
  { key: 'breakfast', label: '早餐', icon: '🌅' },
  { key: 'lunch', label: '午餐', icon: '☀️' },
  { key: 'dinner', label: '晚餐', icon: '🌙' }
]

const MEAL_MAP = Object.fromEntries(MEAL_LIST.map((m) => [m.key, m]))

function getMealLabel(key) {
  return MEAL_MAP[key]?.label || '未分类'
}

function groupMenuByMeal(items) {
  return MEAL_LIST.map((meal) => ({
    ...meal,
    items: items.filter((i) => i.meal_type === meal.key)
  }))
}

function formatTime(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  const p = (n) => (n < 10 ? '0' + n : '' + n)
  return (
    d.getFullYear() +
    '-' +
    p(d.getMonth() + 1) +
    '-' +
    p(d.getDate()) +
    ' ' +
    p(d.getHours()) +
    ':' +
    p(d.getMinutes())
  )
}
