const USER_KEY = 'family_meals_web_user'
const CONFIG_KEY = 'family_meals_supabase_config'

function getStoredUser() {
  try {
    return JSON.parse(localStorage.getItem(USER_KEY) || 'null')
  } catch {
    return null
  }
}

function initUser() {
  let user = getStoredUser()
  if (!user || !user.id) {
    user = {
      id: 'u_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8),
      nickName: '家庭成员' + Math.random().toString(36).slice(2, 6)
    }
    localStorage.setItem(USER_KEY, JSON.stringify(user))
  }
  return user
}

function updateNickName(nickName) {
  const user = getStoredUser() || initUser()
  user.nickName = (nickName || user.nickName || '家庭成员').trim().slice(0, 20)
  localStorage.setItem(USER_KEY, JSON.stringify(user))
  return user
}

function getCurrentUser() {
  return getStoredUser() || initUser()
}

function getSupabaseConfig() {
  try {
    const stored = JSON.parse(localStorage.getItem(CONFIG_KEY) || 'null')
    if (stored && stored.supabaseUrl && stored.supabaseAnonKey) {
      return stored
    }
  } catch {
    /* ignore */
  }
  const cfg = window.APP_CONFIG || {}
  if (cfg.supabaseUrl && cfg.supabaseAnonKey) {
    return cfg
  }
  return null
}

function saveSupabaseConfig(url, key) {
  const config = {
    supabaseUrl: url.trim(),
    supabaseAnonKey: key.trim()
  }
  localStorage.setItem(CONFIG_KEY, JSON.stringify(config))
  return config
}

function isConfigured() {
  const c = getSupabaseConfig()
  return !!(c && c.supabaseUrl && c.supabaseAnonKey)
}
