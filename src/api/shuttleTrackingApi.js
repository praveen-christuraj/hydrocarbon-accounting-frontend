import { apiGet, apiPost } from './apiClient'

const buildQueryString = (filters = {}) => {
  const params = new URLSearchParams()
  Object.entries(filters).forEach(([key, value]) => {
    const cleaned = String(value ?? '').trim()
    if (cleaned) params.append(key, cleaned)
  })
  const qs = params.toString()
  return qs ? `?${qs}` : ''
}

const convertTicketFromApi = (t) => {
  if (!t) return null
  return {
    transactionId: t.transaction_id,
    ticketNumber: t.ticket_number || '',
    operationNumber: t.operation_number || '',
    locationCode: t.location_code || '',
    locationName: t.location_name || '',
    shuttleNumber: t.shuttle_number || '',
    shuttleAssetCode: t.shuttle_asset_code || '',
    shuttleAssetName: t.shuttle_asset_name || '',
    productName: t.product_name || '',
    operationDate: t.operation_date || '',
    eventTime: t.event_time || '',
    openingStockBbl: Number(t.opening_stock_bbl || 0),
    openingWaterBbl: Number(t.opening_water_bbl || 0),
    closingStockBbl: Number(t.closing_stock_bbl || 0),
    closingWaterBbl: Number(t.closing_water_bbl || 0),
    netStockBbl: Number(t.net_stock_bbl || 0),
    netWaterBbl: Number(t.net_water_bbl || 0),
    bargeReference: t.barge_reference || '',
    remarks: t.remarks || '',
    vesselOperationCode: t.vessel_operation_code || '',
    vesselOperationLabel: t.vessel_operation_label || '',
    vesselOperationCategory: t.vessel_operation_category || '',
    vesselOperationSign: t.vessel_operation_sign || '',
    tovBbl: Number(t.tov_bbl || 0),
    freeWaterBbl: Number(t.free_water_bbl || 0),
    nsvBbl: Number(t.nsv_bbl || 0),
    status: t.status || '',
    createdBy: t.created_by || '',
    createdAt: t.created_at || '',
    updatedAt: t.updated_at || '',
  }
}

const convertGroupFromApi = (g) => ({
  groupKey: g.group_key || '',
  locationCode: g.location_code || '',
  locationName: g.location_name || '',
  shuttleNumber: g.shuttle_number || '',
  shuttleAssetCode: g.shuttle_asset_code || '',
  shuttleAssetName: g.shuttle_asset_name || '',
  voyageStatus: g.voyage_status || 'OPEN',
  closedBy: g.closed_by || '',
  closedAt: g.closed_at || '',
  closureRemarks: g.closure_remarks || '',
  totalTovBbl: Number(g.total_tov_bbl || 0),
  totalFreeWaterBbl: Number(g.total_free_water_bbl || 0),
  totalNsvBbl: Number(g.total_nsv_bbl || 0),
  netReceiptBbl: Number(g.net_receipt_bbl || 0),
  netDischargeBbl: Number(g.net_discharge_bbl || 0),
  tickets: (g.tickets || []).map(convertTicketFromApi).filter(Boolean),
})

export const getShuttleTracking = async (filters = {}) => {
  const data = await apiGet(`/shuttle-tracking${buildQueryString(filters)}`)
  return {
    rows: (data.rows || []).map(convertGroupFromApi),
    totalGroups: Number(data.total_groups || 0),
    page: Number(data.page || 1),
    pageSize: Number(data.page_size || 20),
    hasMore: Boolean(data.has_more),
  }
}

export const closeShuttleVoyage = async ({
  locationCode,
  shuttleNumber,
  shuttleAssetCode,
  closureRemarks,
}) => {
  return apiPost('/shuttle-voyages/close', {
    location_code: locationCode,
    shuttle_number: shuttleNumber,
    shuttle_asset_code: shuttleAssetCode,
    closure_remarks:
      closureRemarks && String(closureRemarks).trim() !== ''
        ? String(closureRemarks).trim()
        : null,
  })
}

export const reopenShuttleVoyage = async ({
  locationCode,
  shuttleNumber,
  shuttleAssetCode,
  remarks,
}) => {
  return apiPost('/shuttle-voyages/reopen', {
    location_code: locationCode,
    shuttle_number: shuttleNumber,
    shuttle_asset_code: shuttleAssetCode,
    remarks: remarks && String(remarks).trim() !== '' ? String(remarks).trim() : null,
  })
}

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000'
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

export const downloadShuttleVoyageXlsx = async ({ group_key }) => {
  const token = getStoredAuthToken()
  const url = `${API_BASE_URL}/shuttle-tracking/export/xlsx?group_key=${encodeURIComponent(group_key)}`
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
  a.download = 'shuttle_mtr.xlsx'
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(a.href)
}
