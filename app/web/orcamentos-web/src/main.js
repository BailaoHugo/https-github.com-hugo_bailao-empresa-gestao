import './style.css'
import 'cropperjs/dist/cropper.css'
import Cropper from 'cropperjs'

const STORAGE_CATALOG = 'orc_catalogo_v1'
const STORAGE_ORCAMENTO = 'orc_orcamento_v1'
const STORAGE_OBRAS = 'orc_obras_v1'
const STORAGE_CUSTOS = 'orc_custos_v1'

const app = document.querySelector('#app')

const defaultCondicoes = [
  '1) Validade do orcamento: 30 dias.',
  '2) Condicoes de pagamento: a acordar com o cliente.',
  '3) Prazo de execucao: a definir em funcao do planeamento.',
  '4) Exclusoes: trabalhos nao descritos no presente orcamento.',
  '5) Trabalhos a mais: sujeitos a aprovacao previa.',
].join('\n')

const state = {
  catalogo: null,
  orcamento: null,
  custos: null,
  obras: null,
}

let searchTimer = null

function todayISO() {
  const d = new Date()
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function normalizeYearInput(value) {
  const raw = String(value || '').replace(/\D/g, '')
  if (raw.length === 2) {
    const year = Number(`20${raw}`)
    return { ano: year, aa: raw.padStart(2, '0') }
  }
  if (raw.length === 4) {
    const year = Number(raw)
    return { ano: year, aa: raw.slice(-2) }
  }
  return { ano: null, aa: '' }
}

function pad3(num) {
  return String(num).padStart(3, '0')
}

function buildObraDisplay(codigo, nome) {
  return `${codigo} - ${nome}`
}

function getNextObraNumber(aa, obras) {
  const nums = obras
    .filter((o) => o.obraCodigo?.startsWith(`${aa}.`))
    .map((o) => Number(o.obraCodigo.split('.')[1]))
    .filter((n) => Number.isFinite(n))
  const max = nums.length ? Math.max(...nums) : 0
  return pad3(max + 1)
}

function loadLocal(key) {
  const raw = localStorage.getItem(key)
  return raw ? JSON.parse(raw) : null
}

function saveLocal(key, value) {
  localStorage.setItem(key, JSON.stringify(value))
}

function initCustos() {
  return {
    movimentos: [],
    ui: {
      view: 'custos',
      obraFiltro: null,
      dataInicio: null,
      dataFim: null,
      registarStep: 'foto',
      registarMsg: '',
      registarMsgOk: false,
    },
  }
}

const API_URL = import.meta.env.VITE_API_URL || ''
const photoIcon = '<svg class="icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>'
let custosDespesaRawFile = null
let custosDespesaCurrentFile = null
let custosDespesaCentros = []
let custosDespesaCropper = null

async function loadCustosCentros() {
  try {
    const r = await fetch(`${API_URL}/api/centros-custo`)
    if (r.ok) custosDespesaCentros = await r.json()
  } catch (e) {
    console.error('Erro ao carregar centros', e)
  }
}

function initOrcamento(catalogo) {
  const inputs = {}
  getCatalogItems(catalogo).forEach((art) => {
    inputs[getItemCode(art)] = { qty: 0, pu: 0 }
  })
  const capDefaults = {}
  catalogo.capitulos.forEach((cap) => {
    capDefaults[cap.id] = false
  })
  const areaDefaults = {
    A: 1.4,
    B: 1.4,
    C: 1.3,
    D: 1.25,
    E: 1.15,
    F: 1.4,
  }
  return {
    info: {
      obra: '',
      obraCodigo: '',
      obraNome: '',
      tipoObra: 'reabilitacao',
      cliente: '',
      local: '',
      data: todayISO(),
      versao: '1.0',
    },
    k: {
      global: 1.3,
      area: areaDefaults,
      cap: {},
      art: {},
    },
    ui: {
      areaCollapsed: { A: true, B: true, C: true, D: true, E: true, F: true },
      searchQuery: '',
      capCollapsed: {},
      subCollapsed: {},
      showSeco: true,
      showVenda: true,
    },
    selecao: {
      area: { A: false, B: false, C: false, D: false, E: false, F: false },
      cap: capDefaults,
      sub: {},
      art: {},
    },
    inputs,
    condicoes: defaultCondicoes,
  }
}

function normalizeNumber(value) {
  const num = Number(String(value).replace(',', '.'))
  return Number.isFinite(num) ? num : 0
}

function format2(value) {
  return Number.isFinite(value) ? value.toFixed(2) : '0.00'
}

function normalizeText(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
}

function appliesToTipo(item, tipoObra) {
  if (!tipoObra) return true
  const baseArr = Array.isArray(item.aplicaA) ? item.aplicaA : null
  if (baseArr && baseArr.length) return baseArr.includes(tipoObra)

  // Heranca: subcapitulo herda do capitulo; item herda de subcapitulo -> capitulo
  const cat = state.catalogo
  if (!cat) return true

  // Capitulo
  if (Object.prototype.hasOwnProperty.call(item, 'area') && Object.prototype.hasOwnProperty.call(item, 'ordem') && !Object.prototype.hasOwnProperty.call(item, 'capId')) {
    return true // sem aplicaA explicito = ambos
  }

  // Subcapitulo
  if (Object.prototype.hasOwnProperty.call(item, 'capId') && !Object.prototype.hasOwnProperty.call(item, 'subcapId')) {
    const cap = cat.capitulos.find((c) => c.id === item.capId)
    const fromCap = Array.isArray(cap?.aplicaA) ? cap.aplicaA : null
    if (!fromCap || !fromCap.length) return true
    return fromCap.includes(tipoObra)
  }

  // Item (artigo)
  if (Object.prototype.hasOwnProperty.call(item, 'subcapId')) {
    const sub = cat.subcapitulos.find((s) => s.id === item.subcapId)
    const cap = sub ? cat.capitulos.find((c) => c.id === sub.capId) : null
    const fromSub = Array.isArray(sub?.aplicaA) ? sub.aplicaA : null
    if (fromSub && fromSub.length) return fromSub.includes(tipoObra)
    const fromCap = Array.isArray(cap?.aplicaA) ? cap.aplicaA : null
    if (!fromCap || !fromCap.length) return true
    return fromCap.includes(tipoObra)
  }

  return true
}

function getItemCapId(item) {
  return item.cap || item.capId
}

function getItemSubId(item) {
  return item.subcap || item.subcapId
}

function getItemCode(item) {
  return item.code || item.id
}

function getCatalogItems(catalogo) {
  const base = catalogo.items && catalogo.items.length ? catalogo.items : catalogo.artigos || []
  const custom = state?.orcamento?.customItems || []
  return base.concat(custom)
}

function getSuggestedPU(item) {
  if (!item) return ''
  if (item.pu_sugerido) return item.pu_sugerido
  if (item.pu) return item.pu
  const unit = item.unit
  const fallback = {
    m2: 15,
    m: 10,
    un: 25,
    vg: 100,
    m3: 45,
    kg: 2,
    h: 15,
    l: 3,
  }[unit]
  return fallback || ''
}

function areaRank(area) {
  return { A: 1, B: 2, C: 3, D: 4, E: 5, F: 6 }[area] || 9
}

function groupCapitulos(capitulos) {
  const groups = { A: [], B: [], C: [], D: [], E: [], F: [] }
  capitulos
    .slice()
    .sort((a, b) => {
      const areaDiff = areaRank(a.area) - areaRank(b.area)
      if (areaDiff !== 0) return areaDiff
      return a.ordem - b.ordem
    })
    .forEach((cap) => {
      if (!groups[cap.area]) groups[cap.area] = []
      groups[cap.area].push(cap)
    })
  return groups
}

function countSelectedCapsByArea(catalogo, capSelection) {
  const counts = { A: 0, B: 0, C: 0, D: 0, E: 0, F: 0 }
  catalogo.capitulos.forEach((cap) => {
    if (capSelection[cap.id]) counts[cap.area] = (counts[cap.area] || 0) + 1
  })
  return counts
}

function countSelectedSubByCap(subSelection) {
  const counts = {}
  Object.entries(subSelection).forEach(([subId, selected]) => {
    if (!selected) return
    const capId = subId.split('.').slice(0, -1).join('.')
    counts[capId] = (counts[capId] || 0) + 1
  })
  return counts
}

function countSelectedArtBySub(artSelection) {
  const counts = {}
  Object.entries(artSelection).forEach(([code, selected]) => {
    if (!selected) return
    const subId = code.split('.').slice(0, -1).join('.')
    counts[subId] = (counts[subId] || 0) + 1
  })
  return counts
}

function getEffectiveK({ articleId, chapterId, areaId }) {
  const { orcamento } = state
  const kArt = normalizeNumber(orcamento.k.art[articleId])
  if (kArt > 0) return { k: kArt, origem: 'ARTIGO' }

  const kCap = normalizeNumber(orcamento.k.cap[chapterId])
  if (kCap > 0) return { k: kCap, origem: 'CAPITULO' }

  const kArea = normalizeNumber(orcamento.k.area?.[areaId])
  if (kArea > 0) return { k: kArea, origem: 'AREA' }

  return { k: normalizeNumber(orcamento.k.global) || 1, origem: 'GLOBAL' }
}

function getKForItem(itemCode) {
  const { catalogo, orcamento } = state
  const item = getCatalogItems(catalogo).find((a) => getItemCode(a) === itemCode)
  if (!item) return { k: normalizeNumber(orcamento.k.global) || 1, origem: 'GLOBAL' }

  const capId = getItemCapId(item)
  const areaId = state.catalogo.capitulos.find((c) => c.id === capId)?.area
  return getEffectiveK({ articleId: itemCode, chapterId: capId, areaId })
}

function calcVendaUnit(custoUnit, k) {
  return custoUnit * k
}

function getCapOrderMap(catalogo) {
  return new Map(catalogo.capitulos.map((c) => [c.id, c.ordem]))
}

function getSubOrderMap(catalogo) {
  return new Map(catalogo.subcapitulos.map((s) => [s.id, s.ordem]))
}

function getSelectedData() {
  const { catalogo, orcamento } = state
  const capOrder = getCapOrderMap(catalogo)
  const subOrder = getSubOrderMap(catalogo)

  const artUsar = orcamento.selecao.art || {}
  const capSel = orcamento.selecao.cap || {}
  const subSel = orcamento.selecao.sub || {}
  const areaSel = orcamento.selecao.area || {}

  // Filtrar apenas artigos dentro da hierarquia selecionada
  const selectedArtItems = getCatalogItems(catalogo).filter((a) => {
    if (!artUsar[getItemCode(a)]) return false
    const capId = getItemCapId(a)
    const subId = getItemSubId(a)
    const cap = catalogo.capitulos.find((c) => c.id === capId)
    if (!cap) return false
    // Verificar hierarquia: área → capítulo → subcapítulo → artigo
    return areaSel[cap.area] && capSel[capId] && subSel[subId]
  })

  const activeSubSetFromArts = new Set(selectedArtItems.map((a) => getItemSubId(a)))
  const activeCapSetFromArts = new Set(selectedArtItems.map((a) => getItemCapId(a)))
  const activeCapSet = new Set([
    ...activeCapSetFromArts,
    ...catalogo.capitulos.filter((c) => capSel[c.id] && areaSel[c.area]).map((c) => c.id),
  ])
  const activeSubSet = new Set([
    ...activeSubSetFromArts,
    ...catalogo.subcapitulos.filter((s) => {
      const cap = catalogo.capitulos.find((c) => c.id === s.capId)
      return subSel[s.id] && cap && capSel[s.capId] && areaSel[cap.area]
    }).map((s) => s.id),
  ])
  const activeCaps = catalogo.capitulos.filter(
    (c) => c.ativo_default && activeCapSet.has(c.id) && areaSel[c.area]
  )
  const activeSub = catalogo.subcapitulos.filter(
    (s) => {
      const cap = catalogo.capitulos.find((c) => c.id === s.capId)
      return s.ativo_default && activeSubSet.has(s.id) && cap && capSel[s.capId] && areaSel[cap.area]
    }
  )

  const artigos = selectedArtItems
    .map((a) => {
      const code = getItemCode(a)
      const input = orcamento.inputs[code] || { qty: 0, pu: 0 }
      const qty = normalizeNumber(input.qty)
      const puSeco = normalizeNumber(input.pu)
      const kInfo = getKForItem(code)
      const vendaUnit = calcVendaUnit(puSeco, kInfo.k)
      return {
        ...a,
        capId: getItemCapId(a),
        subcapId: getItemSubId(a),
        code,
        qty,
        puSeco,
        kInfo,
        vendaUnit,
        totalSeco: qty * puSeco,
        totalVenda: qty * vendaUnit,
      }
    })
    .sort((a, b) => {
      const capA = capOrder.get(a.capId) || 9999
      const capB = capOrder.get(b.capId) || 9999
      if (capA !== capB) return capA - capB
      const subA = subOrder.get(a.subcapId) || 9999
      const subB = subOrder.get(b.subcapId) || 9999
      if (subA !== subB) return subA - subB
      return a.code.localeCompare(b.code)
    })

  return { activeCaps, activeSub, artigos }
}

function calcTotais(artigos) {
  const totals = {}
  let totalGeralSeco = 0
  let totalGeralVenda = 0
  artigos.forEach((a) => {
    const capId = a.capId || a.cap || getItemCapId(a)
    if (!totals[capId]) {
      totals[capId] = { seco: 0, venda: 0 }
    }
    totals[capId].seco += a.totalSeco
    totals[capId].venda += a.totalVenda
    totalGeralSeco += a.totalSeco
    totalGeralVenda += a.totalVenda
  })
  return { totals, totalGeralSeco, totalGeralVenda }
}

function handleToggle(section, key, value) {
  const step = state.orcamento.ui?.step || 1
  if (section === 'art' && step !== 5) return
  
  state.orcamento.selecao[section][key] = value
  if (section === 'art') {
    if (value) {
      // Ativar artigo garante subcapitulo, capitulo e area ligados
      const item = getCatalogItems(state.catalogo).find((a) => getItemCode(a) === key)
      if (item) {
        const subId = getItemSubId(item)
        const capId = getItemCapId(item)
        state.orcamento.selecao.sub[subId] = true
        state.orcamento.selecao.cap[capId] = true
        const cap = state.catalogo.capitulos.find((c) => c.id === capId)
        if (cap) {
          state.orcamento.selecao.area[cap.area] = true
        }
      }
      setPendingScroll(key)
    }
    rebuildSelectionsFromArts()
  }
  saveLocal(STORAGE_ORCAMENTO, state.orcamento)
  render()
}

function rebuildSelectionsFromArts() {
  const capSel = {}
  const subSel = {}
  const areaSel = {}
  getCatalogItems(state.catalogo).forEach((item) => {
    const code = getItemCode(item)
    if (!state.orcamento.selecao.art[code]) return
    const capId = getItemCapId(item)
    const subId = getItemSubId(item)
    subSel[subId] = true
    capSel[capId] = true
    const cap = state.catalogo.capitulos.find((c) => c.id === capId)
    if (cap) {
      areaSel[cap.area] = true
    }
  })
  state.orcamento.selecao.sub = subSel
  state.orcamento.selecao.cap = capSel
  Object.keys(areaSel).forEach((area) => {
    state.orcamento.selecao.area[area] = true
  })
}

function handleInput(code, field, value) {
  if (!state.orcamento.inputs[code]) {
    state.orcamento.inputs[code] = { qty: 0, pu: 0 }
  }
  state.orcamento.inputs[code][field] = value
  saveLocal(STORAGE_ORCAMENTO, state.orcamento)
  render()
}

function handleInfo(field, value) {
  state.orcamento.info[field] = value
  saveLocal(STORAGE_ORCAMENTO, state.orcamento)
}

function handleTipoObraChange(newValue) {
  const prev = state.orcamento.info?.tipoObra || 'reabilitacao'
  const next = newValue || 'reabilitacao'
  if (prev === next) return
  const artSel = state.orcamento.selecao?.art || {}
  const hasSelected = Object.values(artSel).some(Boolean)
  if (!hasSelected) {
    state.orcamento.info.tipoObra = next
    saveLocal(STORAGE_ORCAMENTO, state.orcamento)
    render()
    return
  }
  state.orcamento.ui = state.orcamento.ui || {}
  state.orcamento.ui.tipoObraConfirm = { previous: prev, next }
  saveLocal(STORAGE_ORCAMENTO, state.orcamento)
  render()
}

function confirmTipoObraKeep() {
  const pending = state.orcamento.ui?.tipoObraConfirm
  if (!pending) return
  state.orcamento.info.tipoObra = pending.next
  state.orcamento.ui.tipoObraConfirm = null
  saveLocal(STORAGE_ORCAMENTO, state.orcamento)
  render()
}

function confirmTipoObraClear() {
  const pending = state.orcamento.ui?.tipoObraConfirm
  if (!pending) return
  const next = pending.next
  state.orcamento.info.tipoObra = next
  // limpar selecao
  state.orcamento.selecao = { cap: {}, sub: {}, art: {} }
  // manter inputs mas sem selecao; reconstruir estados derivados
  rebuildSelectionsFromArts()
  // colapsar arvore
  state.orcamento.ui.areaCollapsed = { A: true, B: true, C: true, D: true, E: true, F: true }
  state.orcamento.ui.capCollapsed = {}
  state.orcamento.ui.subCollapsed = {}
  state.orcamento.ui.tipoObraConfirm = null
  saveLocal(STORAGE_ORCAMENTO, state.orcamento)
  render()
}

function handleKGlobal(value) {
  state.orcamento.k.global = value
  saveLocal(STORAGE_ORCAMENTO, state.orcamento)
  render()
}

function handleKCap(cap, value) {
  state.orcamento.k.cap[cap] = value
  saveLocal(STORAGE_ORCAMENTO, state.orcamento)
  render()
}

function handleKArt(code, value) {
  state.orcamento.k.art[code] = value
  saveLocal(STORAGE_ORCAMENTO, state.orcamento)
  render()
}

function handleKArea(area, value) {
  state.orcamento.k.area[area] = value
  saveLocal(STORAGE_ORCAMENTO, state.orcamento)
  render()
}

function toggleShow(type) {
  if (type === 'seco') {
    state.orcamento.ui.showSeco = !state.orcamento.ui.showSeco
  }
  if (type === 'venda') {
    state.orcamento.ui.showVenda = !state.orcamento.ui.showVenda
  }
  saveLocal(STORAGE_ORCAMENTO, state.orcamento)
  render()
}

function setSearchQuery(value) {
  state.orcamento.ui.searchQuery = value
  saveLocal(STORAGE_ORCAMENTO, state.orcamento)
  render()
}

function toggleArea(area) {
  const current = state.orcamento.ui?.areaCollapsed || {}
  state.orcamento.ui.areaCollapsed = {
    ...current,
    [area]: !current[area],
  }
  saveLocal(STORAGE_ORCAMENTO, state.orcamento)
  render()
}

function toggleAddForm(subId) {
  const current = state.orcamento.ui.addingSub || {}
  state.orcamento.ui.addingSub = {
    ...current,
    [subId]: !current[subId],
  }
  saveLocal(STORAGE_ORCAMENTO, state.orcamento)
  render()
}

function setStep(step) {
  state.orcamento.ui.prevStep = state.orcamento.ui.step
  state.orcamento.ui.step = step
  // passo de trabalho de Qtd/PU & PDF passa a ser o 6
  if (step === 6 && state.orcamento.ui.prevStep !== 6) {
    state.orcamento.ui.pendingFocusStep4 = true
  }
  saveLocal(STORAGE_ORCAMENTO, state.orcamento)
  render()
}

function setFocus(type, id) {
  state.orcamento.ui.focus = type && id ? { type, id } : null
  if (type === 'article' && id) {
    setPendingScroll(id)
  }
  saveLocal(STORAGE_ORCAMENTO, state.orcamento)
  render()
}

function toggleMargins(code) {
  const current = state.orcamento.ui.showMargins || {}
  state.orcamento.ui.showMargins = {
    ...current,
    [code]: !current[code],
  }
  saveLocal(STORAGE_ORCAMENTO, state.orcamento)
  render()
}

function toggleMarginsPanel(value) {
  state.orcamento.ui.marginsOpen = value
  saveLocal(STORAGE_ORCAMENTO, state.orcamento)
  render()
}

function setPendingScroll(articleId) {
  state.orcamento.ui.pendingScroll = articleId
}

function scrollToPreviewArticle(articleId) {
  if (!articleId) return
  const el = document.querySelector(`[data-article-id="${articleId}"]`)
  if (!el) return
  el.scrollIntoView({ behavior: 'smooth', block: 'center' })
  el.classList.add('preview-highlight')
  window.setTimeout(() => {
    el.classList.remove('preview-highlight')
  }, 1500)
}

function removeArticle(code) {
  state.orcamento.selecao.art[code] = false
  rebuildSelectionsFromArts()
  saveLocal(STORAGE_ORCAMENTO, state.orcamento)
  render()
}

function toggleCustomForm(code) {
  state.orcamento.ui.customFormFor = state.orcamento.ui.customFormFor === code ? null : code
  saveLocal(STORAGE_ORCAMENTO, state.orcamento)
  render()
}

function addCustomLine(baseCode, form) {
  const base = getCatalogItems(state.catalogo).find((it) => getItemCode(it) === baseCode)
  if (!base) return
  const desc = form.desc.value.trim()
  const unit = form.unit.value
  const qty = normalizeNumber(form.qty.value)
  const pu = normalizeNumber(form.pu.value)
  if (!desc || !unit) return

  const subcapId = getItemSubId(base)
  const capId = getItemCapId(base)
  const areaId = state.catalogo.capitulos.find((c) => c.id === capId)?.area
  const existing = getCatalogItems(state.catalogo)
    .map((it) => getItemCode(it))
    .filter((id) => id.startsWith(`${subcapId}.XC`))
  let idx = 1
  while (existing.includes(`${subcapId}.XC${idx}`)) idx += 1
  const id = `${subcapId}.XC${idx}`

  const newItem = {
    id,
    subcapId,
    capId,
    areaId,
    desc,
    unit,
    ativo_default: true,
    custom: true,
  }

  if (!state.orcamento.customItems) state.orcamento.customItems = []
  state.orcamento.customItems.push(newItem)
  state.orcamento.inputs[id] = { qty: qty || 0, pu: pu || 0 }
  state.orcamento.selecao.art[id] = true
  rebuildSelectionsFromArts()
  state.orcamento.ui.customFormFor = null
  saveLocal(STORAGE_ORCAMENTO, state.orcamento)
  render()
}

function openObraModal() {
  const currentYear = new Date().getFullYear()
  const { aa } = normalizeYearInput(String(currentYear))
  const obras = state.obras || []
  const nextNnn = getNextObraNumber(aa, obras)
  state.orcamento.ui.obraModalOpen = true
  state.orcamento.ui.obraDraft = {
    ano: currentYear,
    aa,
    nnn: nextNnn,
    nome: '',
    nnnManual: false,
  }
  state.orcamento.ui.obraError = ''
  saveLocal(STORAGE_ORCAMENTO, state.orcamento)
  render()
}

function updateObraDraft(field, value) {
  const draft = { ...(state.orcamento.ui.obraDraft || {}) }
  if (field === 'ano') {
    const { ano, aa } = normalizeYearInput(value)
    draft.ano = ano
    draft.aa = aa
    if (!draft.nnnManual && aa) {
      draft.nnn = getNextObraNumber(aa, state.obras || [])
    }
  }
  if (field === 'nnn') {
    draft.nnn = pad3(value.replace(/\D/g, '').slice(0, 3))
    draft.nnnManual = true
  }
  if (field === 'nome') {
    draft.nome = value
  }
  state.orcamento.ui.obraDraft = draft
  saveLocal(STORAGE_ORCAMENTO, state.orcamento)
  render()
}

function saveObra() {
  const draft = state.orcamento.ui.obraDraft || {}
  const aa = draft.aa || ''
  const nnn = draft.nnn || ''
  const nome = String(draft.nome || '').trim()
  const codigo = `${aa}.${nnn}`
  const regex = /^\d{2}\.\d{3}$/
  if (!regex.test(codigo)) {
    state.orcamento.ui.obraError = 'Codigo invalido. Use AA.NNN.'
    render()
    return
  }
  if (!nome) {
    state.orcamento.ui.obraError = 'Nome da obra e obrigatorio.'
    render()
    return
  }
  const obras = state.obras || []
  if (obras.some((o) => o.obraCodigo === codigo)) {
    state.orcamento.ui.obraError = 'Codigo ja existe.'
    render()
    return
  }
  const obra = {
    obraCodigo: codigo,
    obraNome: nome,
    anoInicio: draft.ano,
    obraDisplay: buildObraDisplay(codigo, nome),
    estado: 'ativa',
    notas: '',
  }
  const next = obras.concat(obra)
  state.obras = next
  saveLocal(STORAGE_OBRAS, next)
  state.orcamento.info.obraCodigo = codigo
  state.orcamento.info.obraNome = nome
  state.orcamento.info.obra = obra.obraDisplay
  state.orcamento.ui.obraModalOpen = false
  state.orcamento.ui.obraDraft = null
  state.orcamento.ui.obraError = ''
  saveLocal(STORAGE_ORCAMENTO, state.orcamento)
  render()
}

function closeObraModal() {
  state.orcamento.ui.obraModalOpen = false
  state.orcamento.ui.obraDraft = null
  state.orcamento.ui.obraError = ''
  saveLocal(STORAGE_ORCAMENTO, state.orcamento)
  render()
}

function selectObra(codigo) {
  const obra = (state.obras || []).find((o) => o.obraCodigo === codigo)
  if (!obra) return
  state.orcamento.info.obraCodigo = obra.obraCodigo
  state.orcamento.info.obraNome = obra.obraNome
  state.orcamento.info.obra = obra.obraDisplay
  saveLocal(STORAGE_ORCAMENTO, state.orcamento)
  render()
}

function setView(view) {
  if (view === 'home') {
    custosDespesaRawFile = null
    custosDespesaCurrentFile = null
    if (custosDespesaCropper) { custosDespesaCropper.destroy(); custosDespesaCropper = null }
  }
  if (state.orcamento) {
    state.orcamento.ui.view = view
    saveLocal(STORAGE_ORCAMENTO, state.orcamento)
  }
  if (state.custos) {
    state.custos.ui = state.custos.ui || {}
    state.custos.ui.view = view
    saveLocal(STORAGE_CUSTOS, state.custos)
  }
  render()
}

function updateItemField(code, field, value) {
  const items = getCatalogItems(state.catalogo)
  const item = items.find((it) => getItemCode(it) === code)
  if (!item) return
  item[field] = value
  saveLocal(STORAGE_CATALOG, state.catalogo)
  render()
}

function toggleCap(capId) {
  const current = state.orcamento.ui?.capCollapsed || {}
  state.orcamento.ui.capCollapsed = {
    ...current,
    [capId]: !current[capId],
  }
  const subIds = state.catalogo.subcapitulos
    .filter((s) => s.capId === capId)
    .map((s) => s.id)
  const nextSubCollapsed = { ...(state.orcamento.ui.subCollapsed || {}) }
  subIds.forEach((subId) => {
    if (nextSubCollapsed[subId] === undefined) nextSubCollapsed[subId] = true
  })
  state.orcamento.ui.subCollapsed = nextSubCollapsed
  saveLocal(STORAGE_ORCAMENTO, state.orcamento)
  render()
}

function toggleAreaSelect(areaId) {
  const step = state.orcamento.ui?.step || 1
  if (step !== 2) return
  
  // Garantir que selecao.area existe
  if (!state.orcamento.selecao) {
    state.orcamento.selecao = {}
  }
  if (!state.orcamento.selecao.area) {
    state.orcamento.selecao.area = { A: false, B: false, C: false, D: false, E: false, F: false }
  }
  
  const sel = state.orcamento.selecao.area
  const currentlySelected = !!sel[areaId]
  const next = !currentlySelected

  if (!next) {
    // Vamos desativar area: verificar dependentes
    const affectedCaps = state.catalogo.capitulos.filter((c) => c.area === areaId)
    const affectedCapIds = affectedCaps.map((c) => c.id)
    const affectedSubs = state.catalogo.subcapitulos.filter((s) => affectedCapIds.includes(s.capId))
    const affectedSubIds = affectedSubs.map((s) => s.id)
    const affectedArts = getCatalogItems(state.catalogo).filter(
      (a) => affectedCapIds.includes(getItemCapId(a)) && state.orcamento.selecao.art && state.orcamento.selecao.art[getItemCode(a)]
    )
    const totalAffected = affectedCaps.length + affectedSubs.length + affectedArts.length
    if (totalAffected > 0) {
      const ok = window.confirm(
        `Esta acao ira remover ${totalAffected} elementos dependentes. Confirmar?`
      )
      if (!ok) return
      if (!state.orcamento.selecao.cap) state.orcamento.selecao.cap = {}
      if (!state.orcamento.selecao.sub) state.orcamento.selecao.sub = {}
      if (!state.orcamento.selecao.art) state.orcamento.selecao.art = {}
      affectedCapIds.forEach((capId) => {
        state.orcamento.selecao.cap[capId] = false
      })
      affectedSubIds.forEach((subId) => {
        state.orcamento.selecao.sub[subId] = false
      })
      affectedArts.forEach((a) => {
        state.orcamento.selecao.art[getItemCode(a)] = false
      })
    }
  }

  state.orcamento.selecao.area[areaId] = next
  saveLocal(STORAGE_ORCAMENTO, state.orcamento)
  render()
}

function toggleCapSelect(capId) {
  const step = state.orcamento.ui?.step || 1
  if (step !== 3) return
  const sel = state.orcamento.selecao.cap || {}
  const currentlySelected = !!sel[capId]
  const next = !currentlySelected

  if (!next) {
    // Vamos desativar capitulo: verificar artigos afetados
    const affectedSubs = state.catalogo.subcapitulos.filter((s) => s.capId === capId)
    const affectedSubIds = affectedSubs.map((s) => s.id)
    const affectedArts = getCatalogItems(state.catalogo).filter(
      (a) => getItemCapId(a) === capId && state.orcamento.selecao.art[getItemCode(a)]
    )
    const totalAffected = affectedSubs.length + affectedArts.length
    if (totalAffected > 0) {
      const ok = window.confirm(
        `Esta acao ira remover ${totalAffected} elementos dependentes. Confirmar?`
      )
      if (!ok) return
      affectedSubIds.forEach((subId) => {
        state.orcamento.selecao.sub[subId] = false
      })
      affectedArts.forEach((a) => {
        state.orcamento.selecao.art[getItemCode(a)] = false
      })
    }
  } else {
    // Ativar capitulo garante area ligada
    const cap = state.catalogo.capitulos.find((c) => c.id === capId)
    if (cap) {
      state.orcamento.selecao.area[cap.area] = true
    }
  }

  state.orcamento.selecao.cap[capId] = next
  saveLocal(STORAGE_ORCAMENTO, state.orcamento)
  render()
}

function toggleSub(subId) {
  const current = state.orcamento.ui?.subCollapsed || {}
  state.orcamento.ui.subCollapsed = {
    ...current,
    [subId]: !current[subId],
  }
  saveLocal(STORAGE_ORCAMENTO, state.orcamento)
  render()
}

function toggleSubSelect(subId) {
  const step = state.orcamento.ui?.step || 1
  if (step !== 4) return
  const sel = state.orcamento.selecao.sub || {}
  const currentlySelected = !!sel[subId]
  const next = !currentlySelected

  if (!next) {
    // Vamos desativar subcapitulo: verificar artigos afetados
    const affectedArts = getCatalogItems(state.catalogo).filter(
      (a) => getItemSubId(a) === subId && state.orcamento.selecao.art[getItemCode(a)]
    )
    const count = affectedArts.length
    if (count > 0) {
      const ok = window.confirm(
        `Esta acao ira remover ${count} elementos dependentes. Confirmar?`
      )
      if (!ok) return
      affectedArts.forEach((a) => {
        state.orcamento.selecao.art[getItemCode(a)] = false
      })
    }
  } else {
    // Ativar subcapitulo garante capitulo e area ligados
    const sub = state.catalogo.subcapitulos.find((s) => s.id === subId)
    if (sub) {
      const capId = sub.capId
      state.orcamento.selecao.cap[capId] = true
      const cap = state.catalogo.capitulos.find((c) => c.id === capId)
      if (cap) {
        state.orcamento.selecao.area[cap.area] = true
      }
    }
  }

  state.orcamento.selecao.sub[subId] = next
  saveLocal(STORAGE_ORCAMENTO, state.orcamento)
  render()
}

function searchItems(query, tipoObra) {
  const q = normalizeText(query)
  if (!q) return []
  const capMap = new Map(state.catalogo.capitulos.map((c) => [c.id, c.nome]))
  const subMap = new Map(state.catalogo.subcapitulos.map((s) => [s.id, s.nome]))
  return getCatalogItems(state.catalogo)
    .filter((art) => {
      if (!appliesToTipo(art, tipoObra)) return false
      const hay = `${getItemCode(art)} ${art.desc} ${capMap.get(getItemCapId(art)) || ''} ${
        subMap.get(getItemSubId(art)) || ''
      }`
      return normalizeText(hay).includes(q)
    })
    .slice(0, 50)
}

function addItemBySearch(code) {
  const item = getCatalogItems(state.catalogo).find((a) => getItemCode(a) === code)
  if (!item) return
  const capId = getItemCapId(item)
  const subId = getItemSubId(item)
  const areaId = state.catalogo.capitulos.find((c) => c.id === capId)?.area
  if (areaId) {
    state.orcamento.selecao.area[areaId] = true
  }
  state.orcamento.selecao.cap[capId] = true
  state.orcamento.selecao.sub[subId] = true
  state.orcamento.selecao.art[code] = true
  setPendingScroll(code)
  rebuildSelectionsFromArts()
  if (areaId) {
    state.orcamento.ui.areaCollapsed[areaId] = false
  }
  state.orcamento.ui.capCollapsed[capId] = false
  state.orcamento.ui.subCollapsed[subId] = false
  state.orcamento.ui.focus = { type: 'article', id: code }
  // saltar diretamente para o passo de artigos (5) ao adicionar via pesquisa
  state.orcamento.ui.step = 5
  saveLocal(STORAGE_ORCAMENTO, state.orcamento)
  render()
}

function applyPreset(type) {
  const capSelection = {}
  state.catalogo.capitulos.forEach((cap) => {
    let enabled = false
    if (type === 'habitacao') {
      enabled = cap.area === 'C' || cap.area === 'D'
      if (cap.id === '20' || cap.id === '21') enabled = false
    }
    if (type === 'comercio') {
      enabled = cap.area !== 'E'
      if (cap.id === '21') enabled = true
      if (cap.id === '20') enabled = true
    }
    capSelection[cap.id] = enabled
  })
  state.orcamento.selecao.cap = capSelection
  const areaCollapsed = { A: true, B: true, C: true, D: true, E: true }
  state.catalogo.capitulos.forEach((cap) => {
    if (capSelection[cap.id]) areaCollapsed[cap.area] = false
  })
  state.orcamento.ui.areaCollapsed = areaCollapsed
  saveLocal(STORAGE_ORCAMENTO, state.orcamento)
  render()
}

function handleCondicoes(value) {
  state.orcamento.condicoes = value
  saveLocal(STORAGE_ORCAMENTO, state.orcamento)
}

function addNovoArtigo(subcapId, form) {
  const desc = form.desc.value.trim()
  const unit = form.unit.value
  const selectNow = form.selectNow?.checked
  if (!desc || !unit) return

  const sub = state.catalogo.subcapitulos.find((s) => s.id === subcapId)
  if (!sub) return
  const capId = sub.capId
  const areaId = state.catalogo.capitulos.find((c) => c.id === capId)?.area
  const items = getCatalogItems(state.catalogo)
  const siblings = items.filter((a) => getItemSubId(a) === subcapId)
  const maxSeq = siblings.reduce((acc, a) => {
    const parts = getItemCode(a).split('.')
    const last = Number(parts[parts.length - 1])
    return Number.isFinite(last) ? Math.max(acc, last) : acc
  }, 0)
  const nextId = `${subcapId}.${maxSeq + 1}`
  if (items.some((a) => getItemCode(a) === nextId)) return

  const newItem = {
    id: nextId,
    subcapId,
    capId,
    areaId,
    desc,
    unit,
    ativo_default: true,
  }

  if (!state.catalogo.items) state.catalogo.items = []
  state.catalogo.items.push(newItem)
  state.orcamento.inputs[nextId] = { qty: 0, pu: 0 }
  if (selectNow) {
    state.orcamento.selecao.cap[capId] = true
    state.orcamento.selecao.sub[subcapId] = true
    state.orcamento.selecao.art[nextId] = true
    setPendingScroll(nextId)
    rebuildSelectionsFromArts()
    state.orcamento.ui.areaCollapsed[areaId] = false
    state.orcamento.ui.capCollapsed[capId] = false
    state.orcamento.ui.subCollapsed[subcapId] = false
    state.orcamento.ui.focus = { type: 'article', id: nextId }
    state.orcamento.ui.step = 3
  }
  saveLocal(STORAGE_CATALOG, state.catalogo)
  saveLocal(STORAGE_ORCAMENTO, state.orcamento)
  form.reset()
  state.orcamento.ui.addingSub = { ...(state.orcamento.ui.addingSub || {}), [subcapId]: false }
  render()
}

function renderTotalsOnly() {
  const { artigos } = getSelectedData()
  const { totals, totalGeralSeco, totalGeralVenda } = calcTotais(artigos)
  const totalSecoEl = document.querySelector('[data-total-geral-seco]')
  const totalVendaEl = document.querySelector('[data-total-geral-venda]')
  if (totalSecoEl) totalSecoEl.textContent = format2(totalGeralSeco)
  if (totalVendaEl) totalVendaEl.textContent = format2(totalGeralVenda)

  document.querySelectorAll('[data-total-cap-seco]').forEach((el) => {
    const cap = el.getAttribute('data-total-cap-seco')
    el.textContent = format2(totals[cap]?.seco || 0)
  })
  document.querySelectorAll('[data-total-cap-venda]').forEach((el) => {
    const cap = el.getAttribute('data-total-cap-venda')
    el.textContent = format2(totals[cap]?.venda || 0)
  })
}

function render() {
  const { catalogo, orcamento, custos } = state
  const view = orcamento?.ui?.view || custos?.ui?.view || 'home'
  
  // Se estiver no módulo de custos (Registar despesa por foto)
  if (view === 'custos') {
    const custosData = state.custos || initCustos()
    const step = !custosDespesaRawFile && !custosDespesaCurrentFile ? 'foto' : custosDespesaRawFile ? 'crop' : 'enviar'

    let custosHtml = ''
    if (step === 'foto') {
      custosHtml = `
      <div class="app custos-registar">
        <div class="top-actions">
          <button class="btn btn-outline" data-nav="home">Voltar ao Dashboard</button>
        </div>
        <header class="module-header">
          <h1>Registo de Custos</h1>
          <p>Registe despesas com foto de fatura ou recibo</p>
        </header>
        <label for="custo-file-input" class="photo-btn">
          ${photoIcon}
          <span class="label">Registar despesa</span>
        </label>
        <input type="file" id="custo-file-input" accept="image/*" capture="environment" style="display:none" />
      </div>`
    } else if (step === 'crop') {
      const url = URL.createObjectURL(custosDespesaRawFile)
      custosHtml = `
      <div class="app custos-registar">
        <div class="top-actions">
          <button class="btn btn-outline" data-nav="home">Voltar ao Dashboard</button>
        </div>
        <header class="module-header">
          <h1>Recortar fatura</h1>
          <p>Ajuste o recorte para remover margens e focar na fatura</p>
        </header>
        <div class="step-panel">
          <div class="crop-container">
            <img id="custo-crop-image" src="${url}" alt="Recorte" />
          </div>
          <div class="btn-row">
            <button class="btn" id="custo-apply-crop">Aplicar recorte</button>
            <button class="btn btn-outline" id="custo-cancel-crop">Cancelar</button>
          </div>
        </div>
      </div>`
    } else {
      const opts = custosDespesaCentros.map((c) => `<option value="${c.codigo}">${c.codigo} - ${c.nome}</option>`).join('')
      const previewUrl = URL.createObjectURL(custosDespesaCurrentFile)
      custosHtml = `
      <div class="app custos-registar">
        <div class="top-actions">
          <button class="btn btn-outline" data-nav="home">Voltar ao Dashboard</button>
        </div>
        <header class="module-header">
          <h1>Registo de Custos</h1>
          <p>Escolha o centro de custo e envie</p>
        </header>
        <div class="step-panel">
          <img id="custo-preview" src="${previewUrl}" alt="Preview" class="custo-preview-img" />
          <div class="field">
            <label for="custo-centro">Centro de custo</label>
            <select id="custo-centro">
              <option value="">— Escolher centro —</option>
              ${opts}
            </select>
          </div>
          <div class="btn-row">
            <button class="btn" id="custo-send" disabled>Enviar</button>
            <button class="btn btn-outline" id="custo-back-crop">Voltar ao recorte</button>
          </div>
        </div>
        <div id="custo-msg" class="${custosData.ui?.registarMsg ? (custosData.ui.registarMsgOk ? 'ok' : 'err') : ''}">${custosData.ui?.registarMsg || ''}</div>
      </div>`
    }

    app.innerHTML = custosHtml

    if (step === 'foto') {
      document.getElementById('custo-file-input').addEventListener('change', (e) => {
        const f = e.target.files[0]
        if (f) { custosDespesaRawFile = f; custosDespesaCurrentFile = null; render() }
        e.target.value = ''
      })
    } else if (step === 'crop') {
      const img = document.getElementById('custo-crop-image')
      img.onload = () => {
        custosDespesaCropper = new Cropper(img, { aspectRatio: NaN, viewMode: 1, dragMode: 'move', autoCropArea: 0.9 })
      }
      document.getElementById('custo-apply-crop').addEventListener('click', () => {
        if (!custosDespesaCropper) return
        const canvas = custosDespesaCropper.getCroppedCanvas({ maxWidth: 2000, maxHeight: 2000, imageSmoothingEnabled: true, imageSmoothingQuality: 'high' })
        if (canvas) {
          canvas.toBlob((blob) => {
            if (blob) {
              custosDespesaCurrentFile = new File([blob], 'recorte.jpg', { type: 'image/jpeg' })
              custosDespesaRawFile = null
              custosDespesaCropper.destroy()
              custosDespesaCropper = null
              render()
            }
          }, 'image/jpeg', 0.92)
        }
      })
      document.getElementById('custo-cancel-crop').addEventListener('click', () => {
        custosDespesaRawFile = null
        if (custosDespesaCropper) { custosDespesaCropper.destroy(); custosDespesaCropper = null }
        render()
      })
    } else {
      document.getElementById('custo-centro').addEventListener('change', (e) => {
        document.getElementById('custo-send').disabled = !e.target.value
      })
      document.getElementById('custo-send').addEventListener('click', async () => {
        const centro = document.getElementById('custo-centro').value?.trim()
        if (!centro || !custosDespesaCurrentFile) return
        const sendBtn = document.getElementById('custo-send')
        const msgEl = document.getElementById('custo-msg')
        sendBtn.disabled = true
        msgEl.textContent = 'A enviar...'
        msgEl.className = ''
        try {
          const fd = new FormData()
          fd.append('centro_custo_codigo', centro)
          fd.append('file', custosDespesaCurrentFile)
          const r = await fetch(`${API_URL}/api/registar-despesa`, { method: 'POST', body: fd })
          const data = await r.json()
          if (!r.ok) throw new Error(data.detail || 'Erro')
          msgEl.textContent = 'Despesa registada com sucesso.'
          msgEl.className = 'ok'
          custosDespesaCurrentFile = null
          custosDespesaRawFile = null
          setTimeout(render, 1500)
        } catch (e) {
          msgEl.textContent = e.message || 'Erro ao enviar.'
          msgEl.className = 'err'
          sendBtn.disabled = false
        }
      })
      document.getElementById('custo-back-crop').addEventListener('click', () => {
        custosDespesaCurrentFile = null
        render()
      })
    }

    bindEvents()
    return
  }
  
  // Continua com o render do módulo de orçamentos
  if (!orcamento) {
    state.orcamento = initOrcamento(catalogo || { capitulos: [], subcapitulos: [], items: [] })
  }
  
  const { activeCaps, activeSub, artigos } = getSelectedData()
  const { totals, totalGeralSeco, totalGeralVenda } = calcTotais(artigos)
  const tipoObra = orcamento.info?.tipoObra || 'reabilitacao'
  const filteredCaps = catalogo.capitulos.filter((c) => appliesToTipo(c, tipoObra))
  const capGroups = groupCapitulos(filteredCaps)
  const areaCollapsed = orcamento.ui?.areaCollapsed || { A: true, B: true, C: true, D: true, E: true, F: true }
  const capCollapsed = orcamento.ui?.capCollapsed || {}
  const subCollapsed = orcamento.ui?.subCollapsed || {}
  const searchQuery = orcamento.ui?.searchQuery || ''
  const showSeco = orcamento.ui?.showSeco ?? true
  const showVenda = orcamento.ui?.showVenda ?? true
  const step = orcamento.ui?.step || 1
  const focus = orcamento.ui?.focus || null
  const addingSub = orcamento.ui?.addingSub || {}
  const showMargins = orcamento.ui?.showMargins || {}
  const marginsOpen = orcamento.ui?.marginsOpen || false
  const customFormFor = orcamento.ui?.customFormFor || null
  const obraModalOpen = orcamento.ui?.obraModalOpen || false
  const obraDraft = orcamento.ui?.obraDraft || null
  const obraError = orcamento.ui?.obraError || ''
  const searchResults = searchItems(searchQuery, tipoObra)
  const items = getCatalogItems(catalogo)
  const unitOptions = ['m2', 'm', 'un', 'vg', 'm3', 'kg', 'h', 'l']
  const areaTitles = {
    A: 'A - Licenciamentos',
    B: 'B - Projectos',
    C: 'C - Aquitectura',
    D: 'D - Especialidades',
    E: 'E - Fornecimentos',
    F: 'F - Coordenacao',
  }
  const marginValue = totalGeralVenda - totalGeralSeco
  const marginPct = totalGeralVenda > 0 ? (marginValue / totalGeralVenda) * 100 : 0
  const showData = step === 1
  const showTree = step >= 2 && step <= 5
  const showPreview = step >= 2
  const showPricing = step === 6
  const showMainLayout = !showPricing
  const previewMode = showVenda ? 'venda' : 'seco'
  const isStep2 = step === 2
  const isStep3 = step === 3
  const isStep4 = step === 4
  const isStep5 = step === 5
  const selAreas = orcamento.selecao?.area || {}
  const selCaps = orcamento.selecao?.cap || {}
  const selSubs = orcamento.selecao?.sub || {}
  const focusArticle = focus?.type === 'article' ? focus.id : null
  const obras = state.obras || []

  if (view === 'home') {
    app.innerHTML = `
      <div class="app home">
        <header class="home-header">
          <img class="home-logo" src="/Logo-Ennova.png" alt="Ennova" />
          <p>Plataforma interna de Gestao da empresa Solid Projects</p>
        </header>
        <section class="card-grid">
          <div class="card module-card">
            <h2>Orcamentos</h2>
            <p>Criacao de orcamentos, gestao de margens e geracao de PDFs para clientes</p>
            <button class="btn" data-nav="orcamentos">Entrar</button>
          </div>
          <div class="card module-card disabled">
            <h2>Gestao de Obras</h2>
            <p>Em desenvolvimento</p>
            <span class="badge">Em desenvolvimento</span>
          </div>
          <div class="card module-card">
            <h2>Registo de Custos</h2>
            <p>Registo de custos por obra, categorizacao e analise de desvios</p>
            <button class="btn" data-nav="custos">Entrar</button>
          </div>
          <div class="card module-card disabled">
            <h2>Planeamento</h2>
            <p>Em desenvolvimento</p>
            <span class="badge">Em desenvolvimento</span>
          </div>
          <div class="card module-card disabled">
            <h2>Faturacao</h2>
            <p>Em desenvolvimento</p>
            <span class="badge">Em desenvolvimento</span>
          </div>
        </section>
      </div>
    `
    bindEvents()
    return
  }

  app.innerHTML = `
    <div class="app">
      <div class="top-actions">
        <button class="btn btn-outline" data-nav="home">Voltar ao Dashboard</button>
        <button class="btn btn-outline" data-margins-open="true">⚙️ Margens</button>
      </div>
      <header class="wizard">
        <div class="wizard-steps">
          <button class="wizard-step ${step === 1 ? 'active' : ''}" data-step="1">1. Dados</button>
          <button class="wizard-step ${step === 2 ? 'active' : ''}" data-step="2">2. Grandes capitulos</button>
          <button class="wizard-step ${step === 3 ? 'active' : ''}" data-step="3">3. Capitulos</button>
          <button class="wizard-step ${step === 4 ? 'active' : ''}" data-step="4">4. Subcapitulos</button>
          <button class="wizard-step ${step === 5 ? 'active' : ''}" data-step="5">5. Artigos</button>
          <button class="wizard-step ${step === 6 ? 'active' : ''}" data-step="6">6. Qtd, Preco & PDF</button>
        </div>
      </header>

      <section class="search search-large">
        <div class="field">
          <label>Pesquisar artigo</label>
          <input type="text" placeholder="Pesquisar artigo (ex: betonilha, pintura, roco, impermeabilizacao...)" value="${searchQuery}" data-search />
        </div>
        <div class="search-results">
          ${
            searchQuery && items.length === 0
              ? '<p class="muted">Sem artigos no catalogo.</p>'
              : searchQuery && searchResults.length === 0
                ? '<p class="muted">Sem resultados.</p>'
                : searchResults
                    .map((item) => {
                      const capId = getItemCapId(item)
                      const subId = getItemSubId(item)
                      const code = getItemCode(item)
                      return `
                        <div class="search-item">
  <div>
                            <strong>${code}</strong> - <span class="truncate">${item.desc}</span>
                            <div class="muted">${capId} / ${subId}</div>
                          </div>
                          <button class="btn btn-outline" data-search-add="${code}">Adicionar</button>
                        </div>
                      `
                    })
                    .join('')
          }
        </div>
      </section>

      ${
        showData
          ? `<section class="meta">
              <div class="field">
                <label>Obra <span class="required">*</span></label>
                <div class="obra-row">
                  <select data-obra-select ${!orcamento.info.obraCodigo ? 'class="field-error"' : ''}>
                    <option value="">Selecionar obra</option>
                    ${obras
                      .slice()
                      .sort((a, b) => a.obraCodigo.localeCompare(b.obraCodigo))
                      .map(
                        (o) =>
                          `<option value="${o.obraCodigo}" ${
                            o.obraCodigo === orcamento.info.obraCodigo ? 'selected' : ''
                          }>${o.obraDisplay}</option>`
                      )
                      .join('')}
                  </select>
                  <button class="btn btn-outline btn-small" type="button" data-obra-new>Nova Obra</button>
                </div>
                ${!orcamento.info.obraCodigo ? '<p class="field-error-msg">Obra e obrigatoria</p>' : ''}
                ${orcamento.info.obraCodigo ? `<p class="field-hint">ObraCodigo: ${orcamento.info.obraCodigo}</p>` : ''}
              </div>
              <div class="field">
                <label>Tipo de obra <span class="required">*</span></label>
                <select data-tipo-obra>
                  <option value="reabilitacao" ${orcamento.info.tipoObra === 'reabilitacao' ? 'selected' : ''}>Reabilitacao</option>
                  <option value="obra_nova" ${orcamento.info.tipoObra === 'obra_nova' ? 'selected' : ''}>Obra nova</option>
                </select>
                <p class="field-hint">O catalogo e filtrado em funcao do tipo de obra.</p>
              </div>
              <div class="field">
                <label>Cliente</label>
                <input type="text" value="${orcamento.info.cliente}" data-info="cliente" />
              </div>
              <div class="field">
                <label>Local</label>
                <input type="text" value="${orcamento.info.local}" data-info="local" />
              </div>
              <div class="field">
                <label>Data</label>
                <input type="date" value="${orcamento.info.data}" data-info="data" />
              </div>
              <div class="field">
                <label>Versao</label>
                <input type="text" value="${orcamento.info.versao}" data-info="versao" />
              </div>
            </section>`
          : ''
      }

      ${
        showMainLayout
          ? `<section class="layout">
        <div class="tree-panel ${showTree ? '' : 'hidden'}">
          <h2>Catalogo</h2>
          ${
            isStep2
              ? // PASSO 2: Apenas Áreas (A, B, C, D, E)
                Object.keys(areaTitles)
                  .map((area) => {
                    const areaSelected = !!selAreas[area]
                    return `
                      <div class="tree-area">
                        <button type="button" class="tree-row level-area ${areaSelected ? 'is-selected' : ''}" data-area-select="${area}">
                          ${areaTitles[area] || area}
                        </button>
                      </div>
                    `
                  })
                  .join('')
              : isStep3
                ? // PASSO 3: Apenas Capítulos das áreas selecionadas
                  Object.entries(capGroups)
                    .filter(([area]) => selAreas[area])
                    .map(([area, caps]) => {
                      if (!caps.length) return ''
                      return `
                        <div class="tree-area">
                          <div class="tree-area-header">${areaTitles[area] || area}</div>
                          ${caps
                            .map((cap) => {
                              const capSelected = !!selCaps[cap.id]
                              return `
                                <div class="tree-cap">
                                  <button type="button" class="tree-row level-cap ${capSelected ? 'is-selected' : ''}" data-cap-select="${cap.id}">
                                    ${cap.id} - ${cap.nome}
                                  </button>
                                </div>
                              `
                            })
                            .join('')}
                        </div>
                      `
                    })
                    .join('')
                : isStep4
                  ? // PASSO 4: Apenas Subcapítulos dos capítulos selecionados
                    Object.entries(capGroups)
                      .filter(([area]) => selAreas[area])
                      .map(([area, caps]) => {
                        const relevantCaps = caps.filter((cap) => selCaps[cap.id])
                        if (!relevantCaps.length) return ''
                        return `
                          <div class="tree-area">
                            <div class="tree-area-header">${areaTitles[area] || area}</div>
                            ${relevantCaps
                              .map((cap) => {
                                const relevantSubs = catalogo.subcapitulos
                                  .filter((sub) => sub.capId === cap.id && appliesToTipo(sub, tipoObra))
                                  .sort((a, b) => a.ordem - b.ordem)
                                return `
                                  <div class="tree-cap">
                                    <div class="tree-cap-header">${cap.id} - ${cap.nome}</div>
                                    ${relevantSubs
                                      .map((sub) => {
                                        const subSelected = !!selSubs[sub.id]
                                        return `
                                          <div class="tree-sub">
                                            <button type="button" class="tree-row level-sub ${subSelected ? 'is-selected' : ''}" data-sub-select="${sub.id}">
                                              ${sub.id} - ${sub.nome}
                                            </button>
                                          </div>
                                        `
                                      })
                                      .join('')}
                                  </div>
                                `
                              })
                              .join('')}
                          </div>
                        `
                      })
                      .join('')
                  : isStep5
                    ? // PASSO 5: Apenas Artigos dos subcapítulos selecionados
                      Object.entries(capGroups)
                        .filter(([area]) => selAreas[area])
                        .map(([area, caps]) => {
                          const relevantCaps = caps.filter((cap) => selCaps[cap.id])
                          if (!relevantCaps.length) return ''
                          return `
                            <div class="tree-area">
                              <div class="tree-area-header">${areaTitles[area] || area}</div>
                              ${relevantCaps
                                .map((cap) => {
                                  const relevantSubs = catalogo.subcapitulos
                                    .filter((sub) => sub.capId === cap.id && selSubs[sub.id] && appliesToTipo(sub, tipoObra))
                                    .sort((a, b) => a.ordem - b.ordem)
                                  if (!relevantSubs.length) return ''
                                  return `
                                    <div class="tree-cap">
                                      <div class="tree-cap-header">${cap.id} - ${cap.nome}</div>
                                      ${relevantSubs
                                        .map((sub) => {
                                          const relevantArts = items.filter(
                                            (art) => getItemSubId(art) === sub.id && appliesToTipo(art, tipoObra)
                                          )
                                          return `
                                            <div class="tree-sub">
                                              <div class="tree-sub-header">${sub.id} - ${sub.nome}</div>
                                              ${relevantArts
                                                .map((art) => {
                                                  const code = getItemCode(art)
                                                  const artSelected = Boolean(orcamento.selecao.art[code])
                                                  return `
                                                    <div class="tree-article">
                                                      <button type="button" class="tree-row level-art ${artSelected ? 'is-selected' : ''}" data-art-toggle="${code}">
                                                        ${code} - <span class="truncate">${art.desc}</span>
                                                      </button>
                                                    </div>
                                                  `
                                                })
                                                .join('')}
                                            </div>
                                          `
                                        })
                                        .join('')}
                                    </div>
                                  `
                                })
                                .join('')}
                            </div>
                          `
                        })
                        .join('')
                    : ''
          }
        </div>
        <aside class="preview-panel ${showPreview ? '' : 'hidden'}">
          <h2>Pre-visualizacao</h2>
          ${buildPreviewLayout(previewMode, artigos, catalogo, totals, orcamento)}
        </aside>
      </section>`
          : ''
      }

      ${
        showPricing
          ? `<section class="pricing-layout">
              <div class="pricing-table">
                <h2>Linhas do orcamento</h2>
                ${
                  artigos.length === 0
                    ? '<p class="muted">Sem artigos selecionados.</p>'
                    : `<table class="table-lines">
                        <thead>
                          <tr>
                            <th>Codigo</th>
                            <th>Descricao</th>
                            <th>Un</th>
                            <th>Qtd</th>
                            <th>PU</th>
                            <th>Total</th>
                            <th>Acoes</th>
                          </tr>
                        </thead>
                        <tbody>
                          ${artigos
                            .map((art) => {
                              const input = orcamento.inputs[art.code] || { qty: 0, pu: 0 }
                              const qty = normalizeNumber(input.qty)
                              const puSeco = normalizeNumber(input.pu)
                              const suggested = getSuggestedPU(art)
                              const total =
                                previewMode === 'venda' ? art.totalVenda : art.totalSeco
                              const showForm = customFormFor === art.code
                              return `
                                <tr>
                                  <td>${art.code}</td>
                                  <td><span class="truncate">${art.desc}</span></td>
                                  <td>${art.unit}</td>
                                  <td><input type="number" step="0.01" value="${qty || ''}" data-qty="${art.code}" data-step4-qty="${qty ? '' : 'empty'}" /></td>
                                  <td><input type="number" step="0.01" value="${puSeco || ''}" placeholder="${suggested || '—'}" data-pu="${art.code}" data-step4-pu="${puSeco ? '' : 'empty'}" /></td>
                                  <td>${format2(total)}</td>
                                  <td class="actions">
                                    <button class="icon-btn" data-remove-article="${art.code}" title="Remover">❌</button>
                                    <button class="icon-btn" data-add-custom="${art.code}" title="Adicionar">➕</button>
                                  </td>
                                </tr>
                                ${
                                  showForm
                                    ? `<tr class="custom-row">
                                        <td colspan="7">
                                          <form class="custom-form" data-custom-form="${art.code}">
                                            <input name="desc" type="text" placeholder="Descricao" required />
                                            <select name="unit" required>
                                              <option value="">Unidade</option>
                                              ${unitOptions.map((u) => `<option value="${u}">${u}</option>`).join('')}
                                            </select>
                                            <input name="qty" type="number" step="0.01" placeholder="Qtd (opcional)" />
                                            <input name="pu" type="number" step="0.01" placeholder="PU (opcional)" />
                                            <button class="btn btn-small" type="submit">Adicionar</button>
                                            <button class="btn btn-outline btn-small" type="button" data-add-custom="${art.code}">Cancelar</button>
                                          </form>
                                        </td>
                                      </tr>`
                                    : ''
                                }
                              `
                            })
                            .join('')}
                        </tbody>
                      </table>`
                }
              </div>
              <aside class="preview-panel">
                <h2>Pre-visualizacao</h2>
                ${buildPreviewLayout(previewMode, artigos, catalogo, totals, orcamento)}
              </aside>
            </section>`
          : ''
      }

      ${
        showPricing
          ? `<section class="pricing">
              <div class="pricing-actions">
                <div class="field">
                  <label>K Global</label>
                  <input type="number" step="0.01" value="${orcamento.k.global}" data-k-global />
                </div>
                <div class="field">
                  <label>Ver precos</label>
                  <div class="toggle-row">
                    <label><input type="checkbox" ${showSeco ? 'checked' : ''} data-show="seco" /> Seco</label>
                    <label><input type="checkbox" ${showVenda ? 'checked' : ''} data-show="venda" /> Venda</label>
                  </div>
                </div>
                <div class="pricing-buttons">
                  <button class="btn" data-action="print-seco">Imprimir / Guardar PDF – Precos Secos</button>
                  <button class="btn btn-outline" data-action="print-venda">Imprimir / Guardar PDF – Precos de Venda</button>
                </div>
              </div>
              <div class="cards">
    <div class="card">
                  <span>Total Seco</span>
                  <strong data-total-geral-seco>${format2(totalGeralSeco)}</strong>
    </div>
                <div class="card">
                  <span>Total Venda</span>
                  <strong data-total-geral-venda>${format2(totalGeralVenda)}</strong>
                </div>
    <div class="card">
                  <span>Margem</span>
                  <strong>${format2(marginValue)} (${format2(marginPct)}%)</strong>
                </div>
              </div>
              <div class="condicoes">
                <h3>Condicoes de pagamento</h3>
                <textarea rows="6" data-condicoes>${orcamento.condicoes}</textarea>
    </div>
            </section>`
          : ''
      }

      <div id="print-area" class="print-area"></div>
  </div>
`

  if (obraModalOpen) {
    const aa = obraDraft?.aa || ''
    const nnn = obraDraft?.nnn || ''
    const nome = obraDraft?.nome || ''
    const preview = aa && nnn && nome ? buildObraDisplay(`${aa}.${nnn}`, nome) : 'AA.NNN - Nome'
    const obraModal = `
      <div class="modal-backdrop" data-obra-cancel>
        <div class="modal" role="dialog" aria-modal="true">
          <div class="modal-header">
            <h3>Nova Obra</h3>
            <button class="btn btn-outline btn-small" data-obra-cancel>Fechar</button>
          </div>
          <div class="modal-body">
            ${obraError ? `<div class="form-error">${obraError}</div>` : ''}
            <div class="modal-grid">
              <div class="field">
                <label>Ano inicio (AAAA ou AA)</label>
                <input type="text" value="${obraDraft?.ano || ''}" data-obra-year />
              </div>
              <div class="field">
                <label>NNN</label>
                <input type="text" value="${nnn}" data-obra-nnn />
              </div>
              <div class="field">
                <label>Nome da obra</label>
                <input type="text" value="${nome}" data-obra-nome />
              </div>
            </div>
            <div class="muted">Preview: ${preview}</div>
            <div class="modal-actions">
              <button class="btn btn-outline" data-obra-cancel>Cancelar</button>
              <button class="btn" data-obra-save>Guardar</button>
            </div>
          </div>
        </div>
      </div>
    `
    app.insertAdjacentHTML('beforeend', obraModal)
  }

  const tipoConfirm = orcamento.ui?.tipoObraConfirm || null
  if (tipoConfirm) {
    const tipoLabels = {
      reabilitacao: 'Reabilitacao',
      obra_nova: 'Obra nova',
    }
    const modal = `
      <div class="modal-backdrop" data-tipoobra-cancel>
        <div class="modal" role="dialog" aria-modal="true">
          <div class="modal-header">
            <h3>Alterar tipo de obra</h3>
            <button class="btn btn-outline btn-small" data-tipoobra-cancel>Fechar</button>
          </div>
          <div class="modal-body">
            <p>Alterar o tipo de obra pode ocultar itens ja selecionados.</p>
            <p>Pretende:</p>
            <ul>
              <li><strong>Manter selecao atual</strong> (mesmo que alguns itens fiquem ocultos)</li>
              <li><strong>Limpar selecao</strong> e aplicar o novo filtro</li>
            </ul>
            <p class="field-hint">Tipo atual: ${tipoLabels[tipoConfirm.previous] || tipoConfirm.previous} &rarr; Novo tipo: ${tipoLabels[tipoConfirm.next] || tipoConfirm.next}</p>
            <div class="modal-actions">
              <button class="btn btn-outline" data-tipoobra-keep>Manter selecao</button>
              <button class="btn" data-tipoobra-clear>Limpar e aplicar filtro</button>
            </div>
          </div>
        </div>
      </div>
    `
    app.insertAdjacentHTML('beforeend', modal)
  }

  const marginsModal = `
    <div class="modal-backdrop" data-margins-close="true">
      <div class="modal" role="dialog" aria-modal="true">
        <div class="modal-header">
          <h3>Margens (K)</h3>
          <button class="btn btn-outline btn-small" data-margins-close="true">Fechar</button>
        </div>
        <div class="modal-body">
          <div class="margins-section margins-global">
            <h4 class="margins-section-title">1. K Global</h4>
            <p class="margins-section-hint">Aplica-se a todos os artigos quando não há K específico definido</p>
            <div class="field">
              <label>K Global</label>
              <input type="number" step="0.01" value="${orcamento.k.global}" data-k-global />
            </div>
          </div>
          
          <div class="margins-section margins-area">
            <h4 class="margins-section-title">2. K Área</h4>
            <p class="margins-section-hint">Aplica-se aos artigos da área quando não há K de capítulo ou artigo</p>
            <div class="modal-grid">
              ${['A', 'B', 'C', 'D', 'E', 'F']
                .map(
                  (area) => {
                    const areaTitle = areaTitles[area] || area
                    const areaName = areaTitle.replace(/^[A-F] - /, '')
                    return `
                <div class="field">
                  <label class="margins-label-stacked">
                    <span class="margins-k-letter">K</span>
                    <span class="margins-k-name">${areaName}</span>
                  </label>
                  <input type="number" step="0.01" value="${orcamento.k.area?.[area] ?? ''}" data-k-area="${area}" placeholder="Herda de Global" />
                </div>
              `
                  }
                )
                .join('')}
            </div>
          </div>
          
          <div class="margins-section margins-cap">
            <h4 class="margins-section-title">3. K Capítulo</h4>
            <p class="margins-section-hint">Aplica-se aos artigos do capítulo quando não há K de artigo</p>
            <div class="modal-grid">
              ${catalogo.capitulos
                .sort((a, b) => {
                  const areaDiff = a.area.localeCompare(b.area)
                  if (areaDiff !== 0) return areaDiff
                  return a.ordem - b.ordem
                })
                .map(
                  (cap) => `
                <div class="field">
                  <label class="margins-label-stacked">
                    <span class="margins-k-letter">K</span>
                    <span class="margins-k-name">${cap.id} - ${cap.nome}</span>
                  </label>
                  <input type="number" step="0.01" value="${orcamento.k.cap?.[cap.id] ?? ''}" data-k-cap="${cap.id}" placeholder="Herda de Área" />
                </div>
              `
                )
                .join('')}
            </div>
          </div>
          
          ${
            focusArticle
              ? (() => {
                  const item = getCatalogItems(catalogo).find((a) => getItemCode(a) === focusArticle)
                  const artDesc = item ? item.desc : focusArticle
                  return `<div class="margins-section margins-art">
                  <h4 class="margins-section-title">4. K Artigo</h4>
                  <p class="margins-section-hint">Aplica-se apenas a este artigo específico</p>
                  <div class="field">
                    <label class="margins-label-stacked">
                      <span class="margins-k-letter">K</span>
                      <span class="margins-k-name">${focusArticle} - ${artDesc}</span>
                    </label>
                    <input type="number" step="0.01" value="${orcamento.k.art?.[focusArticle] ?? ''}" data-k-art="${focusArticle}" placeholder="Herda de Capítulo" />
                  </div>
                </div>`
                })()
              : ''
          }
        </div>
      </div>
    </div>
  `
  if (marginsOpen) {
    app.insertAdjacentHTML('beforeend', marginsModal)
  }

  const printArea = document.querySelector('#print-area')
  if (printArea) {
    printArea.innerHTML = buildPrintLayout('seco', artigos, catalogo, totals, orcamento)
  }

  bindEvents()
  renderTotalsOnly()
  if (showPreview && orcamento.ui?.pendingScroll) {
    const target = orcamento.ui.pendingScroll
    state.orcamento.ui.pendingScroll = null
    saveLocal(STORAGE_ORCAMENTO, state.orcamento)
    window.requestAnimationFrame(() => {
      scrollToPreviewArticle(target)
    })
  }
  if (showPricing && orcamento.ui?.pendingFocusStep4) {
    state.orcamento.ui.pendingFocusStep4 = false
    saveLocal(STORAGE_ORCAMENTO, state.orcamento)
    window.requestAnimationFrame(() => {
      const qty = document.querySelector('[data-step4-qty="empty"]')
      if (qty) {
        qty.scrollIntoView({ behavior: 'smooth', block: 'center' })
        qty.focus()
        return
      }
      const pu = document.querySelector('[data-step4-pu="empty"]')
      if (pu) {
        pu.scrollIntoView({ behavior: 'smooth', block: 'center' })
        pu.focus()
      }
    })
  }
}

function buildPrintLayout(mode, artigos, catalogo, totals, orcamento) {
  return buildPreviewLayout(mode, artigos, catalogo, totals, orcamento)
}

function buildPreviewLayout(mode, artigos, catalogo, totals, orcamento) {
  const obraDisplay =
    orcamento.info.obra ||
    (orcamento.info.obraCodigo && orcamento.info.obraNome
      ? buildObraDisplay(orcamento.info.obraCodigo, orcamento.info.obraNome)
      : 'Nao definida')
  if (!artigos.length) {
    const selAreas = orcamento.selecao?.area || {}
    const selCaps = orcamento.selecao?.cap || {}
    const selSubs = orcamento.selecao?.sub || {}
    const selectedAreas = Object.keys(selAreas).filter((a) => selAreas[a])
    const selectedCaps = catalogo.capitulos.filter((c) => selCaps[c.id] && selAreas[c.area])
    const selectedSubs = catalogo.subcapitulos.filter((s) => {
      const cap = catalogo.capitulos.find((c) => c.id === s.capId)
      return selSubs[s.id] && cap && selCaps[s.capId] && selAreas[cap.area]
    })
    const hasStructure = selectedAreas.length > 0 || selectedCaps.length > 0 || selectedSubs.length > 0

    const estruturaHtml = hasStructure
      ? `
      <h3>Estrutura selecionada</h3>
      <ul class="preview-structure">
        ${['A', 'B', 'C', 'D', 'E', 'F']
          .filter((area) => selAreas[area])
          .map((area) => {
            const areaCaps = selectedCaps.filter((c) => c.area === area)
            return `
              <li>
                <strong>${area}</strong>
                ${
                  areaCaps.length
                    ? `<ul>
                        ${areaCaps
                          .map((cap) => {
                            const subs = selectedSubs.filter((s) => s.capId === cap.id)
                            return `
                              <li>
                                <strong>${cap.id} - ${cap.nome}</strong>
                                ${
                                  subs.length
                                    ? `<ul>
                                        ${subs
                                          .map(
                                            (s) =>
                                              `<li>${s.id} - ${s.nome}</li>`
                                          )
                                          .join('')}
                                      </ul>`
                                    : ''
                                }
                              </li>
                            `
                          })
                          .join('')}
                      </ul>`
                    : ''
                }
              </li>
            `
          })
          .join('')}
      </ul>
    `
      : '<p class="muted">Nenhum elemento selecionado.</p>'

    return `
      <div class="preview-meta">
        <div><span>Obra:</span> ${obraDisplay}</div>
        <div><span>Cliente:</span> ${orcamento.info.cliente}</div>
        <div><span>Data:</span> ${orcamento.info.data}</div>
        <div><span>Versao:</span> ${orcamento.info.versao}</div>
      </div>
      ${estruturaHtml}
    `
  }
  const resumoRows = catalogo.capitulos
    .filter((c) => totals[c.id]?.seco || totals[c.id]?.venda)
    .map(
      (cap) => `
      <tr>
        <td>${cap.id} - ${cap.nome}</td>
        <td>${format2(mode === 'venda' ? totals[cap.id]?.venda || 0 : totals[cap.id]?.seco || 0)}</td>
      </tr>
    `
    )
    .join('')
  const totalGeral = artigos.reduce(
    (acc, art) => acc + (mode === 'venda' ? art.totalVenda : art.totalSeco),
    0
  )
  return `
    <div class="preview-meta">
      <div><span>Obra:</span> ${obraDisplay}</div>
      <div><span>Cliente:</span> ${orcamento.info.cliente}</div>
      <div><span>Data:</span> ${orcamento.info.data}</div>
      <div><span>Versao:</span> ${orcamento.info.versao}</div>
    </div>
    <h3>Resumo por capitulos</h3>
    <table class="preview-table">
      <thead>
        <tr><th>Capitulo</th><th>Total</th></tr>
      </thead>
      <tbody>
        ${resumoRows}
        <tr>
          <td><strong>Total geral</strong></td>
          <td><strong>${format2(totalGeral)}</strong></td>
        </tr>
      </tbody>
    </table>
    ${buildPreviewDetalhe(artigos, catalogo, mode)}
    <div class="doc-footer">
      <div>ENNOVA – Engenharia e Gestao de Obra</div>
      <div>NIPC: 515188166 | Alvara: 91712 – PAR</div>
      <div>Contacto: geral@ennova.pt</div>
      <div>Documento gerado internamente – uso profissional</div>
    </div>
  `
}

function buildPreviewDetalhe(artigos, catalogo, mode) {
  if (!artigos.length) return ''
  const capMap = new Map(catalogo.capitulos.map((c) => [c.id, c.nome]))
  const subMap = new Map(catalogo.subcapitulos.map((s) => [s.id, s.nome]))

  let html = ''
  let currentCap = ''
  let currentSub = ''
  let tableOpen = false
  artigos.forEach((art) => {
    const capId = art.cap || art.capId
    if (capId !== currentCap) {
      if (tableOpen) {
        html += '</tbody></table>'
        tableOpen = false
      }
      currentCap = capId
      currentSub = ''
      html += `<h3>${capId} - ${capMap.get(capId) || ''}</h3>`
    }
    const subId = art.subcap || art.subcapId
    if (subId !== currentSub) {
      if (tableOpen) {
        html += '</tbody></table>'
        tableOpen = false
      }
      currentSub = subId
      html += `<h4>${subId} - ${subMap.get(subId) || ''}</h4>`
      html += `
        <table class="preview-table">
          <thead>
            <tr>
              <th>Codigo</th>
              <th>Descricao</th>
              <th>Un</th>
              <th>Qtd</th>
              <th>PU</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
      `
      tableOpen = true
    }
    const pu = mode === 'venda' ? art.vendaUnit : art.puSeco
    const total = mode === 'venda' ? art.totalVenda : art.totalSeco
    html += `
      <tr data-article-id="${art.code}">
        <td>${art.code}</td>
        <td>${art.desc}</td>
        <td>${art.unit}</td>
        <td>${format2(art.qty)}</td>
        <td>${format2(pu)}</td>
        <td>${format2(total)}</td>
      </tr>
    `
  })
  if (tableOpen) {
    html += '</tbody></table>'
  }
  return html
}

function buildPrintDetalhe(artigos, catalogo, mode) {
  if (!artigos.length) return '<p>Sem artigos selecionados.</p>'
  const capMap = new Map(catalogo.capitulos.map((c) => [c.id, c.nome]))
  const subMap = new Map(catalogo.subcapitulos.map((s) => [s.id, s.nome]))

  let html = ''
  let currentCap = ''
  let currentSub = ''
  let tableOpen = false
  artigos.forEach((art) => {
    const capId = art.cap || art.capId
    if (capId !== currentCap) {
      if (tableOpen) {
        html += '</tbody></table>'
        tableOpen = false
      }
      currentCap = capId
      currentSub = ''
      html += `<h3>${capId} - ${capMap.get(capId) || ''}</h3>`
    }
    const subId = art.subcap || art.subcapId
    if (subId !== currentSub) {
      if (tableOpen) {
        html += '</tbody></table>'
        tableOpen = false
      }
      currentSub = subId
      html += `<h4>${subId} - ${subMap.get(subId) || ''}</h4>`
      html += `
        <table class="print-table">
          <thead>
            <tr>
              <th>Codigo</th>
              <th>Descricao</th>
              <th>Un</th>
              <th>Qtd</th>
              <th>PU</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
      `
      tableOpen = true
    }
    const pu = mode === 'venda' ? art.vendaUnit : art.puSeco
    const total = mode === 'venda' ? art.totalVenda : art.totalSeco
    html += `
      <tr>
        <td>${art.code}</td>
        <td>${art.desc}</td>
        <td>${art.unit}</td>
        <td>${format2(art.qty)}</td>
        <td>${format2(pu)}</td>
        <td>${format2(total)}</td>
      </tr>
    `
  })
  if (tableOpen) {
    html += '</tbody></table>'
  }
  return html
}

function bindEvents() {
  document.querySelectorAll('[data-cap]').forEach((el) => {
    el.addEventListener('change', (e) => handleToggle('cap', el.dataset.cap, e.target.checked))
  })
  document.querySelectorAll('[data-sub]').forEach((el) => {
    el.addEventListener('change', (e) => handleToggle('sub', el.dataset.sub, e.target.checked))
  })
  document.querySelectorAll('[data-art]').forEach((el) => {
    el.addEventListener('change', (e) => handleToggle('art', el.dataset.art, e.target.checked))
  })
  document.querySelectorAll('[data-art-toggle]').forEach((el) => {
    el.addEventListener('click', () => {
      const code = el.dataset.artToggle
      const current = !!state.orcamento.selecao.art[code]
      handleToggle('art', code, !current)
    })
  })
  document.querySelectorAll('[data-qty]').forEach((el) => {
    el.addEventListener('input', (e) => handleInput(el.dataset.qty, 'qty', e.target.value))
  })
  document.querySelectorAll('[data-pu]').forEach((el) => {
    el.addEventListener('input', (e) => handleInput(el.dataset.pu, 'pu', e.target.value))
  })
  document.querySelectorAll('[data-k-global]').forEach((el) => {
    el.addEventListener('input', (e) => handleKGlobal(e.target.value))
  })
  document.querySelectorAll('[data-k-cap]').forEach((el) => {
    el.addEventListener('input', (e) => handleKCap(el.dataset.kCap, e.target.value))
  })
  document.querySelectorAll('[data-k-art]').forEach((el) => {
    el.addEventListener('input', (e) => handleKArt(el.dataset.kArt, e.target.value))
  })
  document.querySelectorAll('[data-k-area]').forEach((el) => {
    el.addEventListener('input', (e) => handleKArea(el.dataset.kArea, e.target.value))
  })
  document.querySelectorAll('[data-show]').forEach((el) => {
    el.addEventListener('change', (e) => toggleShow(e.target.dataset.show))
  })
  document.querySelectorAll('[data-area-toggle]').forEach((el) => {
    el.addEventListener('click', () => toggleArea(el.dataset.areaToggle))
  })
  document.querySelectorAll('[data-cap-toggle]').forEach((el) => {
    el.addEventListener('click', () => toggleCap(el.dataset.capToggle))
  })
  document.querySelectorAll('[data-sub-toggle]').forEach((el) => {
    el.addEventListener('click', () => toggleSub(el.dataset.subToggle))
  })
  document.querySelectorAll('[data-area-select]').forEach((el) => {
    el.addEventListener('click', () => toggleAreaSelect(el.dataset.areaSelect))
  })
  document.querySelectorAll('[data-cap-select]').forEach((el) => {
    el.addEventListener('click', () => toggleCapSelect(el.dataset.capSelect))
  })
  document.querySelectorAll('[data-sub-select]').forEach((el) => {
    el.addEventListener('click', () => toggleSubSelect(el.dataset.subSelect))
  })
  document.querySelectorAll('[data-step]').forEach((el) => {
    el.addEventListener('click', () => setStep(Number(el.dataset.step)))
  })
  document.querySelectorAll('[data-nav]').forEach((el) => {
    el.addEventListener('click', () => setView(el.dataset.nav))
  })
  document.querySelectorAll('[data-margins-open]').forEach((el) => {
    el.addEventListener('click', () => toggleMarginsPanel(true))
  })
  document.querySelectorAll('[data-margins-close]').forEach((el) => {
    el.addEventListener('click', () => toggleMarginsPanel(false))
  })
  document.querySelectorAll('[data-obra-new]').forEach((el) => {
    el.addEventListener('click', () => openObraModal())
  })
  document.querySelectorAll('[data-obra-select]').forEach((el) => {
    el.addEventListener('change', (e) => selectObra(e.target.value))
  })
  document.querySelectorAll('[data-obra-year]').forEach((el) => {
    el.addEventListener('input', (e) => updateObraDraft('ano', e.target.value))
  })
  document.querySelectorAll('[data-obra-nnn]').forEach((el) => {
    el.addEventListener('input', (e) => updateObraDraft('nnn', e.target.value))
  })
  document.querySelectorAll('[data-obra-nome]').forEach((el) => {
    el.addEventListener('input', (e) => updateObraDraft('nome', e.target.value))
  })
  document.querySelectorAll('[data-obra-save]').forEach((el) => {
    el.addEventListener('click', () => saveObra())
  })
  document.querySelectorAll('[data-obra-cancel]').forEach((el) => {
    el.addEventListener('click', () => closeObraModal())
  })
  document.querySelectorAll('[data-tipo-obra]').forEach((el) => {
    el.addEventListener('change', (e) => handleTipoObraChange(e.target.value))
  })
  document.querySelectorAll('[data-tipoobra-keep]').forEach((el) => {
    el.addEventListener('click', () => confirmTipoObraKeep())
  })
  document.querySelectorAll('[data-tipoobra-clear]').forEach((el) => {
    el.addEventListener('click', () => confirmTipoObraClear())
  })
  document.querySelectorAll('[data-tipoobra-cancel]').forEach((el) => {
    el.addEventListener('click', () => {
      state.orcamento.ui.tipoObraConfirm = null
      saveLocal(STORAGE_ORCAMENTO, state.orcamento)
      render()
    })
  })
  document.querySelectorAll('[data-remove-article]').forEach((el) => {
    el.addEventListener('click', () => removeArticle(el.dataset.removeArticle))
  })
  document.querySelectorAll('[data-add-custom]').forEach((el) => {
    el.addEventListener('click', () => toggleCustomForm(el.dataset.addCustom))
  })
  document.querySelectorAll('[data-custom-form]').forEach((el) => {
    el.addEventListener('submit', (e) => {
      e.preventDefault()
      addCustomLine(el.dataset.customForm, el)
    })
  })
  document.querySelectorAll('[data-focus-type]').forEach((el) => {
    el.addEventListener('click', (e) => {
      const { focusType, focusId } = e.currentTarget.dataset
      setFocus(focusType, focusId)
    })
  })
  const searchInput = document.querySelector('[data-search]')
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      const value = e.target.value
      if (searchTimer) clearTimeout(searchTimer)
      searchTimer = setTimeout(() => setSearchQuery(value), 250)
    })
  }
  document.querySelectorAll('[data-search-add]').forEach((el) => {
    el.addEventListener('click', () => addItemBySearch(el.dataset.searchAdd))
  })
  document.querySelectorAll('[data-info]').forEach((el) => {
    el.addEventListener('input', (e) => handleInfo(el.dataset.info, e.target.value))
  })
  const cond = document.querySelector('[data-condicoes]')
  if (cond) {
    cond.addEventListener('input', (e) => handleCondicoes(e.target.value))
  }
  document.querySelectorAll('[data-add-sub]').forEach((el) => {
    el.addEventListener('click', () => toggleAddForm(el.dataset.addSub))
  })
  document.querySelectorAll('[data-add-form]').forEach((el) => {
    el.addEventListener('submit', (e) => {
      e.preventDefault()
      addNovoArtigo(el.dataset.addForm, el)
    })
  })
  const printSeco = document.querySelector('[data-action="print-seco"]')
  if (printSeco) {
    printSeco.addEventListener('click', () => {
      const { artigos } = getSelectedData()
      const { totals } = calcTotais(artigos)
      const printArea = document.querySelector('#print-area')
      if (printArea) {
        printArea.innerHTML = buildPrintLayout('seco', artigos, state.catalogo, totals, state.orcamento)
      }
      window.print()
    })
  }
  const printVenda = document.querySelector('[data-action="print-venda"]')
  if (printVenda) {
    printVenda.addEventListener('click', () => {
      const { artigos } = getSelectedData()
      const { totals } = calcTotais(artigos)
      const printArea = document.querySelector('#print-area')
      if (printArea) {
        printArea.innerHTML = buildPrintLayout('venda', artigos, state.catalogo, totals, state.orcamento)
      }
      window.print()
    })
  }

  // Event listeners para módulo de Custos
  document.querySelectorAll('[data-custo-obra]').forEach((el) => {
    el.addEventListener('change', (e) => {
      if (!state.custos) state.custos = initCustos()
      state.custos.ui.obraFiltro = e.target.value || null
      saveLocal(STORAGE_CUSTOS, state.custos)
      render()
    })
  })
  document.querySelectorAll('[data-custo-data-inicio]').forEach((el) => {
    el.addEventListener('change', (e) => {
      if (!state.custos) state.custos = initCustos()
      state.custos.ui.dataInicio = e.target.value || null
      saveLocal(STORAGE_CUSTOS, state.custos)
      render()
    })
  })
  document.querySelectorAll('[data-custo-data-fim]').forEach((el) => {
    el.addEventListener('change', (e) => {
      if (!state.custos) state.custos = initCustos()
      state.custos.ui.dataFim = e.target.value || null
      saveLocal(STORAGE_CUSTOS, state.custos)
      render()
    })
  })
  document.querySelectorAll('[data-custo-novo]').forEach((el) => {
    el.addEventListener('click', () => {
      // TODO: Abrir modal para novo movimento
      console.log('Novo movimento de custo')
    })
  })
  document.querySelectorAll('[data-custo-edit]').forEach((el) => {
    el.addEventListener('click', () => {
      // TODO: Abrir modal para editar movimento
      console.log('Editar movimento:', el.dataset.custoEdit)
    })
  })
  document.querySelectorAll('[data-custo-remove]').forEach((el) => {
    el.addEventListener('click', () => {
      if (!state.custos) return
      const movId = el.dataset.custoRemove
      state.custos.movimentos = state.custos.movimentos.filter((m) => m.id !== movId)
      saveLocal(STORAGE_CUSTOS, state.custos)
      render()
    })
  })

}

async function init() {
  state.obras = loadLocal(STORAGE_OBRAS) || []
  const catalogoLocal = loadLocal(STORAGE_CATALOG)
  if (catalogoLocal && catalogoLocal.version === 3) {
    state.catalogo = catalogoLocal
    const hasItems = Array.isArray(catalogoLocal.items) && catalogoLocal.items.length > 0
    const hasLegacy = Array.isArray(catalogoLocal.artigos) && catalogoLocal.artigos.length > 0
    if (!hasItems && !hasLegacy) {
      const response = await fetch('/catalogo.json')
      state.catalogo = await response.json()
      saveLocal(STORAGE_CATALOG, state.catalogo)
    }
  } else {
    const response = await fetch('/catalogo.json')
    state.catalogo = await response.json()
    saveLocal(STORAGE_CATALOG, state.catalogo)
  }
  if (!state.catalogo.items && state.catalogo.artigos?.length) {
    state.catalogo.items = state.catalogo.artigos.map((art) => {
      const capId = getItemCapId(art)
      const areaId = state.catalogo.capitulos.find((c) => c.id === capId)?.area
      return {
        id: getItemCode(art),
        subcapId: getItemSubId(art),
        capId,
        areaId,
        desc: art.desc,
        unit: art.unit,
        ativo_default: art.ativo ?? true,
      }
    })
    saveLocal(STORAGE_CATALOG, state.catalogo)
  }

  const orcamentoLocal = loadLocal(STORAGE_ORCAMENTO)
  const isNew = !orcamentoLocal
  state.orcamento = orcamentoLocal || initOrcamento(state.catalogo)
  
  const custosLocal = loadLocal(STORAGE_CUSTOS)
  state.custos = custosLocal || initCustos()
  loadCustosCentros()
  // Retrocompatibilidade: migrar campo "obra" antigo para ObraCodigo/ObraNome/ObraDisplay
  if (state.orcamento.info && state.orcamento.info.obra && !state.orcamento.info.obraCodigo) {
    const obraAntiga = String(state.orcamento.info.obra).trim()
    // Tentar encontrar obra existente pelo nome
    const obraExistente = (state.obras || []).find((o) => o.obraNome === obraAntiga || o.obraDisplay === obraAntiga)
    if (obraExistente) {
      state.orcamento.info.obraCodigo = obraExistente.obraCodigo
      state.orcamento.info.obraNome = obraExistente.obraNome
      state.orcamento.info.obra = obraExistente.obraDisplay
    } else {
      // Se não encontrar, criar obra temporária (sem guardar na lista)
      state.orcamento.info.obraCodigo = ''
      state.orcamento.info.obraNome = obraAntiga
      state.orcamento.info.obra = obraAntiga
    }
    saveLocal(STORAGE_ORCAMENTO, state.orcamento)
  }
  // Garantir que ObraDisplay está sempre preenchido se tiver ObraCodigo e ObraNome
  if (state.orcamento.info && state.orcamento.info.obraCodigo && state.orcamento.info.obraNome && !state.orcamento.info.obra) {
    state.orcamento.info.obra = buildObraDisplay(state.orcamento.info.obraCodigo, state.orcamento.info.obraNome)
    saveLocal(STORAGE_ORCAMENTO, state.orcamento)
  }
  if (!state.orcamento.info) state.orcamento.info = {}
  if (!state.orcamento.info.tipoObra) {
    state.orcamento.info.tipoObra = 'reabilitacao'
  }
  const items = getCatalogItems(state.catalogo)
  if (!state.orcamento.inputs) state.orcamento.inputs = {}
  items.forEach((item) => {
    const code = getItemCode(item)
    if (!state.orcamento.inputs[code]) {
      state.orcamento.inputs[code] = { qty: 0, pu: 0 }
    }
  })
  const defaultAreaK = { A: 1.4, B: 1.25, C: 1.3, D: 1.25, E: 1.15 }
  if (!state.orcamento.k) {
    state.orcamento.k = { global: 1.3, area: { ...defaultAreaK }, cap: {}, art: {} }
  } else {
    state.orcamento.k.global = normalizeNumber(state.orcamento.k.global) || 1.3
    const areaK = state.orcamento.k.area || {}
    Object.entries(defaultAreaK).forEach(([key, value]) => {
      if (!(key in areaK)) areaK[key] = value
    })
    state.orcamento.k.area = areaK
    state.orcamento.k.cap = state.orcamento.k.cap || {}
    state.orcamento.k.art = state.orcamento.k.art || {}
  }
  if (!state.orcamento.selecao) {
    state.orcamento.selecao = {}
  }
  if (!state.orcamento.selecao.area) {
    state.orcamento.selecao.area = { A: false, B: false, C: false, D: false, E: false, F: false }
  }
  if (!state.orcamento.ui) {
    state.orcamento.ui = { areaCollapsed: { A: true, B: true, C: true, D: true, E: true, F: true } }
  }
  if (state.orcamento.ui.searchQuery === undefined) {
    state.orcamento.ui.searchQuery = ''
  }
  state.orcamento.ui.view = 'home'
  if (state.orcamento.ui.step === undefined) {
    state.orcamento.ui.step = 1
  }
  if (state.orcamento.ui.pendingFocusStep4 === undefined) {
    state.orcamento.ui.pendingFocusStep4 = false
  }
  if (state.orcamento.ui.pendingScroll === undefined) {
    state.orcamento.ui.pendingScroll = null
  }
  if (state.orcamento.ui.marginsOpen === undefined) {
    state.orcamento.ui.marginsOpen = false
  }
  if (state.orcamento.ui.obraModalOpen === undefined) {
    state.orcamento.ui.obraModalOpen = false
  }
  if (state.orcamento.ui.obraDraft === undefined) {
    state.orcamento.ui.obraDraft = null
  }
  if (state.orcamento.ui.obraError === undefined) {
    state.orcamento.ui.obraError = ''
  }
  if (state.orcamento.ui.customFormFor === undefined) {
    state.orcamento.ui.customFormFor = null
  }
  if (state.orcamento.ui.focus === undefined) {
    state.orcamento.ui.focus = null
  }
  if (!state.orcamento.ui.addingSub) {
    state.orcamento.ui.addingSub = {}
  }
  if (!state.orcamento.ui.showMargins) {
    state.orcamento.ui.showMargins = {}
  }
   if (state.orcamento.ui.tipoObraConfirm === undefined) {
    state.orcamento.ui.tipoObraConfirm = null
  }
  if (!state.orcamento.selecao) {
    state.orcamento.selecao = { cap: {}, sub: {}, art: {} }
  }
  if (!state.orcamento.customItems) {
    state.orcamento.customItems = []
  }
  rebuildSelectionsFromArts()
  if (state.orcamento.ui.showSeco === undefined) {
    state.orcamento.ui.showSeco = true
  }
  if (state.orcamento.ui.showVenda === undefined) {
    state.orcamento.ui.showVenda = true
  }
  state.orcamento.ui.capCollapsed = state.orcamento.ui.capCollapsed || {}
  state.orcamento.ui.subCollapsed = state.orcamento.ui.subCollapsed || {}
  const nextCapSelection = {}
  state.catalogo.capitulos.forEach((cap) => {
    nextCapSelection[cap.id] = isNew
      ? false
      : state.orcamento.selecao.cap?.[cap.id] ?? false
  })
  state.orcamento.selecao.cap = nextCapSelection
  const areaCollapsed = { A: true, B: true, C: true, D: true, E: true, F: true }
  if (!isNew) {
    state.catalogo.capitulos.forEach((cap) => {
      if (state.orcamento.selecao.cap[cap.id]) {
        areaCollapsed[cap.area] = false
      }
    })
  }
  state.orcamento.ui.areaCollapsed = areaCollapsed
  const capCollapsed = {}
  const subCollapsed = {}
  if (!isNew) {
    state.catalogo.capitulos.forEach((cap) => {
      const hasSelectedSub = state.catalogo.subcapitulos.some(
        (sub) => sub.capId === cap.id && state.orcamento.selecao.sub[sub.id]
      )
      capCollapsed[cap.id] = !hasSelectedSub
    })
    state.catalogo.subcapitulos.forEach((sub) => {
      const hasSelectedArt = getCatalogItems(state.catalogo).some(
        (art) => getItemSubId(art) === sub.id && state.orcamento.selecao.art[getItemCode(art)]
      )
      subCollapsed[sub.id] = !hasSelectedArt
    })
  }
  state.orcamento.ui.capCollapsed = capCollapsed
  state.orcamento.ui.subCollapsed = subCollapsed
  saveLocal(STORAGE_ORCAMENTO, state.orcamento)

  render()
}

init()
