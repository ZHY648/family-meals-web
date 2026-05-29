const BUCKET = 'dish-images'

let client = null

function getClient() {
  if (!isConfigured()) return null
  if (client) return client
  const cfg = getSupabaseConfig()
  client = supabase.createClient(cfg.supabaseUrl, cfg.supabaseAnonKey)
  return client
}

function resetClient() {
  client = null
}

async function testConnection() {
  const db = getClient()
  if (!db) throw new Error('请先填写 Supabase URL 和 Key')
  const { error } = await db.from('dishes').select('id').limit(1)
  if (error) {
    if (error.message.includes('relation') || error.code === '42P01') {
      throw new Error('表 dishes 不存在，请先在 Supabase 运行 schema.sql')
    }
    throw new Error(error.message)
  }
  return true
}

async function getDishes() {
  const db = getClient()
  const { data, error } = await db
    .from('dishes')
    .select('*')
    .order('create_time', { ascending: false })
  if (error) throw error
  return data || []
}

async function getDishById(id) {
  const db = getClient()
  const { data, error } = await db.from('dishes').select('*').eq('id', id).maybeSingle()
  if (error) throw error
  return data
}

async function uploadImage(file) {
  const db = getClient()
  const ext = file.name.split('.').pop() || 'jpg'
  const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
  const { error: upErr } = await db.storage.from(BUCKET).upload(path, file, {
    cacheControl: '3600',
    upsert: false
  })
  if (upErr) {
    if (upErr.message.includes('Bucket not found')) {
      throw new Error('请先在 Supabase 创建 public 存储桶 dish-images')
    }
    throw upErr
  }
  const { data } = db.storage.from(BUCKET).getPublicUrl(path)
  return data.publicUrl
}

async function addDish(dish) {
  const user = getCurrentUser()
  const db = getClient()
  const row = {
    name: dish.name.trim(),
    image_url: dish.imageUrl,
    description: (dish.description || '').trim(),
    materials: dish.materials.trim(),
    steps: dish.steps.trim(),
    uploader_id: user.id,
    uploader_nick: user.nickName
  }
  const { data, error } = await db.from('dishes').insert(row).select().single()
  if (error) throw error
  return data
}

async function getMenuItems() {
  const db = getClient()
  const { data, error } = await db
    .from('menu')
    .select('*')
    .order('added_time', { ascending: false })
  if (error) throw error
  return data || []
}

async function addToMenu(dish, mealType) {
  const user = getCurrentUser()
  const db = getClient()
  const row = {
    dish_id: dish.id,
    name: dish.name,
    image_url: dish.image_url,
    meal_type: mealType,
    added_by_id: user.id,
    added_by_nick: user.nickName
  }
  const { error } = await db.from('menu').insert(row)
  if (error) {
    if (error.code === '23505') {
      throw new Error('该菜已在' + getMealLabel(mealType) + '中')
    }
    throw error
  }
}

async function removeFromMenu(id) {
  const db = getClient()
  const { error } = await db.from('menu').delete().eq('id', id)
  if (error) throw error
}

async function clearMenu() {
  const items = await getMenuItems()
  const db = getClient()
  if (!items.length) return
  const { error } = await db
    .from('menu')
    .delete()
    .in(
      'id',
      items.map((i) => i.id)
    )
  if (error) throw error
}

async function clearMeal(mealType) {
  const db = getClient()
  const { error } = await db.from('menu').delete().eq('meal_type', mealType)
  if (error) throw error
}

function getDishMenuMeals(menuList, dishId) {
  return menuList.filter((m) => m.dish_id === dishId).map((m) => m.meal_type)
}
