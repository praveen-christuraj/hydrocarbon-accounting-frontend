import { apiGet, apiPost } from './apiClient'

const cleanText = (value) => {
  const cleaned = String(value || '').trim()
  return cleaned === '' ? null : cleaned
}

const toTripEventPayload = (payload = {}) => {
  return {
    convoy_number: cleanText(payload.convoyNumber || payload.convoy_number),
    event_type: cleanText(payload.eventType || payload.event_type),
    location_code: cleanText(payload.locationCode || payload.location_code),
    asset_code: cleanText(payload.assetCode || payload.asset_code),
    operation_transaction_id:
      payload.operationTransactionId !== undefined &&
      payload.operationTransactionId !== null &&
      String(payload.operationTransactionId).trim() !== ''
        ? Number(payload.operationTransactionId)
        : payload.operation_transaction_id !== undefined &&
            payload.operation_transaction_id !== null &&
            String(payload.operation_transaction_id).trim() !== ''
          ? Number(payload.operation_transaction_id)
          : null,
    sequence_no:
      payload.sequenceNo !== undefined &&
      payload.sequenceNo !== null &&
      String(payload.sequenceNo).trim() !== ''
        ? Number(payload.sequenceNo)
        : payload.sequence_no !== undefined &&
            payload.sequence_no !== null &&
            String(payload.sequence_no).trim() !== ''
          ? Number(payload.sequence_no)
          : null,
    event_datetime:
      cleanText(payload.eventDatetime || payload.event_datetime) || null,
    remarks: cleanText(payload.remarks),
  }
}

const toTripComparisonPayload = (payload = {}) => {
  return {
    convoy_number: cleanText(payload.convoyNumber || payload.convoy_number),
    comparison_type: cleanText(
      payload.comparisonType || payload.comparison_type
    ),
    left_transaction_id: Number(
      payload.leftTransactionId || payload.left_transaction_id
    ),
    right_transaction_id: Number(
      payload.rightTransactionId || payload.right_transaction_id
    ),
    summary_json: payload.summaryJson || payload.summary_json || null,
    per_tank_json: payload.perTankJson || payload.per_tank_json || null,
    remarks: cleanText(payload.remarks),
  }
}

export const getBargeTracking = async (convoyNumber) => {
  const convoy = String(convoyNumber || '').trim()

  if (!convoy) {
    throw new Error('Convoy Number is required')
  }

  return apiGet(`/barge-tracking?convoy_number=${encodeURIComponent(convoy)}`)
}

export const getTripTimelineByConvoy = async (convoyNumber) => {
  const convoy = String(convoyNumber || '').trim()

  if (!convoy) {
    throw new Error('Convoy Number is required')
  }

  return apiGet(`/trips/by-convoy/${encodeURIComponent(convoy)}`)
}

export const createTripEvent = async (payload) => {
  return apiPost('/trip-events', toTripEventPayload(payload))
}

export const createTripComparison = async (payload) => {
  return apiPost('/trip-comparisons', toTripComparisonPayload(payload))
}

export const closeTrip = async (tripId, remarks = null) => {
  return apiPost(`/trips/${Number(tripId)}/close`, { remarks })
}

export const reopenTrip = async (tripId, remarks = null) => {
  return apiPost(`/trips/${Number(tripId)}/reopen`, { remarks })
}

// Compatibility names
export const closeBargeTrip = async ({ tripId, remarks }) => {
  return closeTrip(tripId, remarks)
}

export const reopenBargeTrip = async ({ tripId, remarks }) => {
  return reopenTrip(tripId, remarks)
}

export const getConvoyTracker = getBargeTracking
export const closeConvoyTrip = closeTrip
export const reopenConvoyTrip = reopenTrip