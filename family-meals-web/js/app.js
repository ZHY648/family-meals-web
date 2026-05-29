const TITLES = {
  recipes: '家庭菜谱库',
  menu: '今日菜单',
  upload: '上传菜谱',
  setup: '设置 · 家人同步'
}

let currentDish = null
let pendingMealCallback = null
let selectedFile = null

initUser()

document.querySelectorAll('.tab').forEach((tab) => {
  tab.addEventListener('click', () => switchTab(tab.dataset.tab))
})

document.querySelectorAll('[data-tab]').forEach((el) => {
  if (el.classList.contains('tab')) return
  el.addEventListener('click', () => switchTab(el.dataset.tab))
})

document.getElementById('detail-close').addEventListener('click', closeDetail)
document.getElementById('detail-overlay').addEventListener('click', (e) => {
  if (e.target.id === 'detail-overlay') closeDetail()
})
document.getElementById('detail-add-menu').addEventListener('click', () => {
  if (currentDish) openMealPicker((meal) => addDishToMenu(currentDish, meal, true))
})

document.querySelectorAll('.meal-opt').forEach((btn) => {
  btn.addEventListener('click', () => {
    const meal = btn.dataset.meal
    document.getElementById('meal-modal').classList.add('hidden')
    if (pendingMealCallback) pendingMealCallback(meal)
    pendingMealCallback = null
  })
})
document.getElementById('meal-cancel').addEventListener('click', () => {
  document.getElementById('meal-modal').classList.add('hidden')
  pendingMealCallback = null
})

document.getElementById('btn-clear-all').addEventListener('click', async () => {
  if (!confirm('确定清空早/中/晚所有餐次吗？')) return
  try {
    await clearMenu()
    toast('已清空')
    renderMenu()
    renderRecipes()
  } catch (e) {
    toast(e.message || '操作失败')
  }
})

const picker = document.getElementById('image-picker')
const fileInput = document.getElementById('upload-file')
picker.addEventListener('click', () => fileInput.click())
fileInput.addEventListener('change', () => {
  const file = fileInput.files[0]
  if (!file) return
  selectedFile = file
  const url = URL.createObjectURL(file)
  const preview = document.getElementById('upload-preview')
  preview.src = url
  preview.classList.remove('hidden')
  document.getElementById('upload-placeholder').classList.add('hidden')
})

document.getElementById('upload-form').addEventListener('submit', async (e) => {
  e.preventDefault()
  if (!isConfigured()) {
    toast('请先在设置里配置 Supabase')
    switchTab('setup')
    return
  }
  const nick = document.getElementById('upload-nick').value
  updateNickName(nick)

  const name = document.getElementById('upload-name').value.trim()
  const materials = document.getElementById('upload-materials').value.trim()
  const steps = document.getElementById('upload-steps').value.trim()
  const description = document.getElementById('upload-desc').value.trim()

  if (!name || !materials || !steps) {
    toast('请填写必填项')
    return
  }
  if (!selectedFile) {
    toast('请上传菜品图片')
    return
  }

  const btn = document.getElementById('btn-submit')
  btn.disabled = true
  btn.textContent = '发布中…'
  try {
    const imageUrl = await uploadImage(selectedFile)
    await addDish({ name, imageUrl, description, materials, steps })
    toast('发布成功')
    document.getElementById('upload-form').reset()
    selectedFile = null
    document.getElementById('upload-preview').classList.add('hidden')
    document.getElementById('upload-placeholder').classList.remove('hidden')
    switchTab('recipes')
  } catch (err) {
    toast(err.message || '发布失败')
  } finally {
    btn.disabled = false
    btn.textContent = '发布菜谱'
  }
})

document.getElementById('btn-test').addEventListener('click', async () => {
  const url = document.getElementById('cfg-url').value.trim()
  const key = document.getElementById('cfg-key').value.trim()
  if (!url || !key) {
    setSetupStatus('请填写 URL 和 Key', false)
    return
  }
  saveSupabaseConfig(url, key)
  resetClient()
  setSetupStatus('测试中…', null)
  try {
    await testConnection()
    setSetupStatus('连接成功！可以保存并启用', true)
  } catch (e) {
    setSetupStatus(e.message, false)
  }
})

document.getElementById('btn-save-config').addEventListener('click', async () => {
  const url = document.getElementById('cfg-url').value.trim()
  const key = document.getElementById('cfg-key').value.trim()
  if (!url || !key) {
    setSetupStatus('请填写 URL 和 Key', false)
    return
  }
  saveSupabaseConfig(url, key)
  resetClient()
  try {
    await testConnection()
    setSetupStatus('已保存，家人同步已启用', true)
    toast('配置已保存')
    switchTab('recipes')
  } catch (e) {
    setSetupStatus(e.message, false)
  }
})

function switchTab(name) {
  document.querySelectorAll('.view').forEach((v) => v.classList.remove('active'))
  document.querySelectorAll('.tab').forEach((t) => t.classList.remove('active'))
  document.getElementById('view-' + name).classList.add('active')
  document.querySelector('.tab[data-tab="' + name + '"]').classList.add('active')
  document.getElementById('page-title').textContent = TITLES[name] || '家庭三餐'

  if (name === 'recipes') renderRecipes()
  if (name === 'menu') renderMenu()
  if (name === 'upload') {
    document.getElementById('upload-nick').value = getCurrentUser().nickName
  }
  if (name === 'setup') loadSetupForm()
}

function loadSetupForm() {
  const cfg = getSupabaseConfig()
  if (cfg) {
    document.getElementById('cfg-url').value = cfg.supabaseUrl || ''
    document.getElementById('cfg-key').value = cfg.supabaseAnonKey || ''
  }
  if (isConfigured()) {
    setSetupStatus('当前已配置，家人打开同一网站即可同步', true)
  }
}

async function renderRecipes() {
  const banner = document.getElementById('recipes-banner')
  const loading = document.getElementById('recipes-loading')
  const empty = document.getElementById('recipes-empty')
  const list = document.getElementById('recipes-list')

  if (!isConfigured()) {
    banner.classList.remove('hidden')
    empty.classList.add('hidden')
    list.innerHTML = ''
    loading.classList.add('hidden')
    return
  }
  banner.classList.add('hidden')
  loading.classList.remove('hidden')
  empty.classList.add('hidden')
  list.innerHTML = ''

  try {
    const [dishes, menu] = await Promise.all([getDishes(), getMenuItems()])
    loading.classList.add('hidden')
    if (!dishes.length) {
      empty.classList.remove('hidden')
      return
    }
    list.innerHTML = dishes
      .map((d) => {
        const meals = getDishMenuMeals(menu, d.id)
        const mealsText = meals.map(getMealLabel).join('、')
        return `
          <article class="dish-card card">
            <div class="dish-main" data-id="${d.id}">
              <img class="dish-image" src="${esc(d.image_url)}" alt="" loading="lazy" />
              <div class="dish-info">
                <div class="dish-name">${esc(d.name)}</div>
                <div class="dish-uploader">上传：${esc(d.uploader_nick)}</div>
                ${meals.length ? `<div class="dish-meals">已加：${esc(mealsText)}</div>` : ''}
              </div>
            </div>
            <div class="dish-actions">
              <button type="button" class="btn-add" data-add="${d.id}">+ 选餐次</button>
            </div>
          </article>`
      })
      .join('')

    list.querySelectorAll('.dish-main').forEach((el) => {
      el.addEventListener('click', () => openDetail(el.dataset.id))
    })
    list.querySelectorAll('[data-add]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation()
        const dish = dishes.find((d) => d.id === btn.dataset.add)
        if (dish) openMealPicker((meal) => addDishToMenu(dish, meal))
      })
    })
  } catch (e) {
    loading.classList.add('hidden')
    toast(e.message || '加载失败')
  }
}

async function renderMenu() {
  const loading = document.getElementById('menu-loading')
  const empty = document.getElementById('menu-empty')
  const sections = document.getElementById('menu-sections')
  const clearBtn = document.getElementById('btn-clear-all')
  const countEl = document.getElementById('menu-count')

  if (!isConfigured()) {
    empty.classList.remove('hidden')
    empty.querySelector('p').innerHTML = '请先在「设置」里配置 Supabase'
    sections.innerHTML = ''
    clearBtn.classList.add('hidden')
    return
  }

  loading.classList.remove('hidden')
  sections.innerHTML = ''
  empty.classList.add('hidden')

  try {
    const items = await getMenuItems()
    loading.classList.add('hidden')
    countEl.textContent = '共 ' + items.length + ' 道菜 · 按早/中/晚分组'

    if (!items.length) {
      empty.classList.remove('hidden')
      clearBtn.classList.add('hidden')
      return
    }
    clearBtn.classList.remove('hidden')

    const groups = groupMenuByMeal(items)
    sections.innerHTML = groups
      .map(
        (g) => `
      <div class="meal-section">
        <div class="meal-section-header">
          <div>
            <span class="meal-title">${g.icon} ${g.label}</span>
            <span class="meal-count">${g.items.length} 道</span>
          </div>
          ${
            g.items.length
              ? `<button type="button" class="btn-text" data-clear-meal="${g.key}">清空本餐</button>`
              : ''
          }
        </div>
        ${
          g.items.length
            ? g.items.map((item) => menuItemHtml(item)).join('')
            : '<div class="meal-empty">暂无菜品</div>'
        }
      </div>`
      )
      .join('')

    sections.querySelectorAll('[data-clear-meal]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const label = getMealLabel(btn.dataset.clearMeal)
        if (!confirm('确定清空' + label + '中的所有菜品吗？')) return
        try {
          await clearMeal(btn.dataset.clearMeal)
          toast('已清空')
          renderMenu()
          renderRecipes()
        } catch (e) {
          toast(e.message || '失败')
        }
      })
    })

    bindMenuItemEvents(sections)
  } catch (e) {
    loading.classList.add('hidden')
    toast(e.message || '加载失败')
  }
}

function menuItemHtml(item) {
  return `
    <div class="menu-item card" data-menu-id="${item.id}">
      <img src="${esc(item.image_url)}" alt="" data-dish-id="${item.dish_id}" />
      <div class="menu-body" data-dish-id="${item.dish_id}">
        <span class="menu-name">${esc(item.name)}</span>
        <div class="menu-meta"><span>添加者</span><span>${esc(item.added_by_nick)}</span></div>
        <div class="menu-meta"><span>添加时间</span><span>${formatTime(item.added_time)}</span></div>
      </div>
      <span class="menu-remove" data-remove="${item.id}">×</span>
    </div>`
}

function bindMenuItemEvents(root) {
  root.querySelectorAll('[data-dish-id]').forEach((el) => {
    el.addEventListener('click', () => openDetail(el.dataset.dishId))
  })
  root.querySelectorAll('[data-remove]').forEach((el) => {
    el.addEventListener('click', async (e) => {
      e.stopPropagation()
      if (!confirm('确定从该餐次中移除这道菜吗？')) return
      try {
        await removeFromMenu(el.dataset.remove)
        toast('已移除')
        renderMenu()
        renderRecipes()
      } catch (err) {
        toast(err.message || '失败')
      }
    })
  })
}

async function openDetail(id) {
  try {
    const dish = await getDishById(id)
    if (!dish) {
      toast('菜谱不存在')
      return
    }
    currentDish = dish
    const menu = await getMenuItems()
    const meals = getDishMenuMeals(menu, id)

    document.getElementById('detail-image').src = dish.image_url
    document.getElementById('detail-name').textContent = dish.name
    document.getElementById('detail-uploader').textContent = '上传者：' + dish.uploader_nick
    document.getElementById('detail-time').textContent = formatTime(dish.create_time)

    const descBlock = document.getElementById('detail-desc-block')
    if (dish.description) {
      descBlock.classList.remove('hidden')
      document.getElementById('detail-desc').textContent = dish.description
    } else {
      descBlock.classList.add('hidden')
    }
    document.getElementById('detail-materials').textContent = dish.materials
    document.getElementById('detail-steps').textContent = dish.steps
    document.getElementById('detail-menu-status').textContent = meals.length
      ? '已加入：' + meals.map(getMealLabel).join('、')
      : ''

    document.getElementById('detail-overlay').classList.remove('hidden')
    document.body.style.overflow = 'hidden'
  } catch (e) {
    toast(e.message || '加载失败')
  }
}

function closeDetail() {
  document.getElementById('detail-overlay').classList.add('hidden')
  document.body.style.overflow = ''
  currentDish = null
}

function openMealPicker(callback) {
  pendingMealCallback = callback
  document.getElementById('meal-modal').classList.remove('hidden')
}

async function addDishToMenu(dish, mealType, fromDetail) {
  try {
    await addToMenu(dish, mealType)
    toast('已加入' + getMealLabel(mealType))
    if (fromDetail) {
      const menu = await getMenuItems()
      const meals = getDishMenuMeals(menu, dish.id)
      document.getElementById('detail-menu-status').textContent =
        '已加入：' + meals.map(getMealLabel).join('、')
    }
    renderRecipes()
    renderMenu()
  } catch (e) {
    toast(e.message || '添加失败')
  }
}

function setSetupStatus(text, ok) {
  const el = document.getElementById('setup-status')
  el.textContent = text
  el.style.color = ok === true ? '#27ae60' : ok === false ? '#e74c3c' : '#888'
}

function toast(msg) {
  const el = document.getElementById('toast')
  el.textContent = msg
  el.classList.remove('hidden')
  clearTimeout(toast._t)
  toast._t = setTimeout(() => el.classList.add('hidden'), 2500)
}

function esc(s) {
  if (!s) return ''
  const d = document.createElement('div')
  d.textContent = s
  return d.innerHTML
}

switchTab(isConfigured() ? 'recipes' : 'setup')
