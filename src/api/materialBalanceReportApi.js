import { apiGet } from './apiClient'

const convertMaterialBalanceRowFromApi = (row) => {
  return {
    accountingDate: row.accounting_date || '',

    locationCode: row.location_code || '',
    locationName: row.location_name || '',

    tankAssetCode: row.tank_asset_code || '',
    tankAssetName: row.tank_asset_name || '',

    productName: row.product_name || '',

    openingGsvBbl: Number(row.opening_gsv_bbl || 0),
    openingNsvBbl: Number(row.opening_nsv_bbl || 0),
    openingLt: Number(row.opening_lt || 0),
    openingMt: Number(row.opening_mt || 0),

    receiptGsvBbl: Number(row.receipt_gsv_bbl || 0),
    receiptNsvBbl: Number(row.receipt_nsv_bbl || 0),
    receiptLt: Number(row.receipt_lt || 0),
    receiptMt: Number(row.receipt_mt || 0),

    productionGsvBbl: Number(row.production_gsv_bbl || 0),
    productionNsvBbl: Number(row.production_nsv_bbl || 0),
    productionLt: Number(row.production_lt || 0),
    productionMt: Number(row.production_mt || 0),

    dispatchGsvBbl: Number(row.dispatch_gsv_bbl || 0),
    dispatchNsvBbl: Number(row.dispatch_nsv_bbl || 0),
    dispatchLt: Number(row.dispatch_lt || 0),
    dispatchMt: Number(row.dispatch_mt || 0),

    drainingGsvBbl: Number(row.draining_gsv_bbl || 0),
    drainingNsvBbl: Number(row.draining_nsv_bbl || 0),
    drainingLt: Number(row.draining_lt || 0),
    drainingMt: Number(row.draining_mt || 0),

    otherInGsvBbl: Number(row.other_in_gsv_bbl || 0),
    otherInNsvBbl: Number(row.other_in_nsv_bbl || 0),
    otherInLt: Number(row.other_in_lt || 0),
    otherInMt: Number(row.other_in_mt || 0),

    otherOutGsvBbl: Number(row.other_out_gsv_bbl || 0),
    otherOutNsvBbl: Number(row.other_out_nsv_bbl || 0),
    otherOutLt: Number(row.other_out_lt || 0),
    otherOutMt: Number(row.other_out_mt || 0),

    totalInGsvBbl: Number(row.total_in_gsv_bbl || 0),
    totalInNsvBbl: Number(row.total_in_nsv_bbl || 0),
    totalInLt: Number(row.total_in_lt || 0),
    totalInMt: Number(row.total_in_mt || 0),

    totalOutGsvBbl: Number(row.total_out_gsv_bbl || 0),
    totalOutNsvBbl: Number(row.total_out_nsv_bbl || 0),
    totalOutLt: Number(row.total_out_lt || 0),
    totalOutMt: Number(row.total_out_mt || 0),

    bookClosingGsvBbl: Number(row.book_closing_gsv_bbl || 0),
    bookClosingNsvBbl: Number(row.book_closing_nsv_bbl || 0),
    bookClosingLt: Number(row.book_closing_lt || 0),
    bookClosingMt: Number(row.book_closing_mt || 0),

    actualClosingGsvBbl: Number(row.actual_closing_gsv_bbl || 0),
    actualClosingNsvBbl: Number(row.actual_closing_nsv_bbl || 0),
    actualClosingLt: Number(row.actual_closing_lt || 0),
    actualClosingMt: Number(row.actual_closing_mt || 0),

    lossGainGsvBbl: Number(row.loss_gain_gsv_bbl || 0),
    lossGainNsvBbl: Number(row.loss_gain_nsv_bbl || 0),
    lossGainLt: Number(row.loss_gain_lt || 0),
    lossGainMt: Number(row.loss_gain_mt || 0),

    rowsCount: Number(row.rows_count || 0),
    lastTicketNumber: row.last_ticket_number || '',
  }
}

const buildQueryString = (filters = {}) => {
  const params = new URLSearchParams()

  if (filters.locationCode) {
    params.append('location_code', filters.locationCode)
  }

  if (filters.tankAssetCode) {
    params.append('tank_asset_code', filters.tankAssetCode)
  }

  if (filters.productName) {
    params.append('product_name', filters.productName)
  }

  if (filters.dateFrom) {
    params.append('date_from', filters.dateFrom)
  }

  if (filters.dateTo) {
    params.append('date_to', filters.dateTo)
  }

  return params.toString()
}

export const getMaterialBalanceReport = async (filters = {}) => {
  const queryString = buildQueryString(filters)

  const path = queryString
    ? `/material-balance-report?${queryString}`
    : '/material-balance-report'

  const data = await apiGet(path)

  return (data || []).map(convertMaterialBalanceRowFromApi)
}