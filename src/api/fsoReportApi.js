import { apiGet } from './apiClient'

const API_BASE_URL = 'http://127.0.0.1:8000'

const TOKEN_STORAGE_KEYS = [
  'hydrocarbonAccessToken',
  'hydrocarbon_access_token',
  'access_token',
  'accessToken',
]

const getStoredAuthToken = () => {
  for (const key of TOKEN_STORAGE_KEYS) {
    const token = localStorage.getItem(key)
    if (token && token.trim() !== '') return token.trim()
  }
  return ''
}

const qs = (params = {}) => {
  const sp = new URLSearchParams()
  Object.entries(params).forEach(([k, v]) => {
    const s = String(v ?? '').trim()
    if (s !== '') sp.append(k, s)
  })
  return sp.toString()
}

export const getFSOOTRReport = (params) => apiGet(`/fso/reports/otr?${qs(params)}`)
export const getFSOMaterialBalanceReport = (params) =>
  apiGet(`/fso/reports/material-balance?${qs(params)}`)
export const getFSOOutturnReport = (params) => apiGet(`/fso/reports/outturn?${qs(params)}`)

const downloadXlsx = async (urlPath, filename, params) => {
  const token = getStoredAuthToken()
  const url = `${API_BASE_URL}${urlPath}?${qs(params)}`
  const res = await fetch(url, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(text || 'Download failed')
  }
  const blob = await res.blob()
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(a.href)
}

export const downloadFSOOTRXlsx = (params) =>
  downloadXlsx('/fso/reports/otr/export/xlsx', 'fso_otr.xlsx', params)

export const downloadFSOMaterialBalanceXlsx = (params) =>
  downloadXlsx('/fso/reports/material-balance/export/xlsx', 'fso_material_balance.xlsx', params)

export const downloadFSOOutturnXlsx = (params) =>
  downloadXlsx('/fso/reports/outturn/export/xlsx', 'fso_outturn.xlsx', params)