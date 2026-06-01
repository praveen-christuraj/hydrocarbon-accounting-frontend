import { useEffect, useMemo, useState } from 'react'
import {
  createFlowmeterConfig,
  deleteFlowmeterConfig,
  getFlowmeterConfigHistory,
  getFlowmeterConfigs,
  updateFlowmeterConfig,
} from '../api/flowmeterApi'

const emptyForm = {
  id: null,
  locationCode: '',
  assetCode: '',
  streamName: 'Default',
  meterLabel: '',
  meterFactor: '1',
  meterUnit: 'bbls',
  calibrationDate: '',
  remarks: '',
  status: 'Active',
}

function FlowmeterConfigMaster({ locations = [], assets = [], assetAssignments = [] }) {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(false)
  const [historyRows, setHistoryRows] = useState([])
  const [historyLoading, setHistoryLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState(emptyForm)

  const activeAssets = useMemo(() => {
    return (assets || []).filter((a) => String(a.status || '').toLowerCase() === 'active')
  }, [assets])

  const streamAssets = useMemo(() => {
    return activeAssets.filter((a) => {
      const t = String(a.assetTypeCode || '').toUpperCase()
      const n = String(a.assetName || '').toUpperCase()
      return t.includes('STREAM') || n.includes('STREAM') || n.includes('SKID')
    })
  }, [activeAssets])

  const assignedLocationByAssetCode = useMemo(() => {
    const map = {}
    ;(assetAssignments || []).forEach((assignment) => {
      if (String(assignment.status || '').toLowerCase() !== 'active') return
      const code = String(assignment.assetCode || '').trim()
      const locationCode = String(assignment.assignmentLocationCode || '').trim()
      if (!code || !locationCode) return
      if (!map[code]) map[code] = locationCode
    })
    return map
  }, [assetAssignments])

  const locationNameByCode = useMemo(() => {
    const map = {}
    ;(locations || []).forEach((l) => {
      map[l.locationCode] = l.locationName
    })
    return map
  }, [locations])

  const reload = async () => {
    try {
      setLoading(true)
      setHistoryLoading(true)
      const [data, history] = await Promise.all([
        getFlowmeterConfigs(),
        getFlowmeterConfigHistory(),
      ])
      setRows(data)
      setHistoryRows(history)
    } catch (error) {
      alert(error?.message || 'Failed to load flowmeter configs')
    } finally {
      setLoading(false)
      setHistoryLoading(false)
    }
  }

  useEffect(() => {
    reload()
  }, [])

  const handleSave = async () => {
    if (!form.assetCode) return alert('Stream asset is required')
    if (!String(form.streamName || '').trim()) return alert('Stream Name is required')
    if (!String(form.meterLabel || '').trim()) return alert('Meter Label is required')
    if (Number(form.meterFactor || 0) <= 0) return alert('Meter Factor must be greater than 0')
    const assignedLocationCode = assignedLocationByAssetCode[form.assetCode]
    if (!assignedLocationCode) return alert('Selected stream asset must have an active location assignment')

    try {
      setSaving(true)
      const payload = {
        ...form,
        locationCode: assignedLocationCode,
      }
      if (form.id) {
        await updateFlowmeterConfig(form.id, payload)
        alert('Flowmeter config updated')
      } else {
        await createFlowmeterConfig(payload)
        alert('Flowmeter config created')
      }
      setForm(emptyForm)
      await reload()
    } catch (error) {
      alert(error?.message || 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  const handleEdit = (row) => {
    setForm({
      id: row.id,
      locationCode: row.locationCode,
      assetCode: row.assetCode,
      streamName: row.streamName || 'Default',
      meterLabel: row.meterLabel,
      meterFactor: String(row.meterFactor ?? '1'),
      meterUnit: row.meterUnit || 'bbls',
      calibrationDate: row.calibrationDate || '',
      remarks: row.remarks || '',
      status: row.status || 'Active',
    })
  }

  const handleDelete = async (row) => {
    if (!window.confirm(`Delete ${row.assetCode} / ${row.streamName} / ${row.meterLabel}?`)) return
    try {
      await deleteFlowmeterConfig(row.id)
      await reload()
    } catch (error) {
      alert(error?.message || 'Delete failed')
    }
  }

  return (
    <div>
      <div className="page-title">
        <div>
          <h2>Flowmeter Config</h2>
          <p>Configure flowmeters (sub-assets) under selected metering stream asset.</p>
        </div>
      </div>

      <div className="form-grid">
        <div>
          <label>Stream Asset *</label>
          <select
            value={form.assetCode}
            onChange={(e) =>
              setForm((p) => ({
                ...p,
                assetCode: e.target.value,
                locationCode: assignedLocationByAssetCode[e.target.value] || '',
                streamName: e.target.value || 'Default',
              }))
            }
          >
            <option value="">Select Stream Asset</option>
            {(streamAssets.length > 0 ? streamAssets : activeAssets).map((a) => (
              <option key={a.assetCode} value={a.assetCode}>{a.assetName} ({a.assetCode})</option>
            ))}
          </select>
        </div>

        <div>
          <label>Assigned Location</label>
          <input
            value={
              form.assetCode
                ? `${locationNameByCode[assignedLocationByAssetCode[form.assetCode]] || ''} (${assignedLocationByAssetCode[form.assetCode] || '-'})`
                : ''
            }
            disabled
            placeholder="Auto from active assignment"
          />
        </div>

        <div>
          <label>Stream Code</label>
          <input value={form.streamName} disabled />
        </div>

        <div>
          <label>Meter Label *</label>
          <input value={form.meterLabel} onChange={(e) => setForm((p) => ({ ...p, meterLabel: e.target.value }))} placeholder="Example: Meter 1" />
        </div>

        <div>
          <label>Meter Factor *</label>
          <input type="number" min="0.0001" step="0.0001" value={form.meterFactor} onChange={(e) => setForm((p) => ({ ...p, meterFactor: e.target.value }))} />
        </div>

        <div>
          <label>Meter Unit *</label>
          <select value={form.meterUnit} onChange={(e) => setForm((p) => ({ ...p, meterUnit: e.target.value }))}>
            <option value="bbls">bbls</option>
            <option value="m3">m3</option>
          </select>
        </div>

        <div>
          <label>Calibration Date</label>
          <input type="date" value={form.calibrationDate} onChange={(e) => setForm((p) => ({ ...p, calibrationDate: e.target.value }))} />
        </div>

        <div>
          <label>Status</label>
          <select value={form.status} onChange={(e) => setForm((p) => ({ ...p, status: e.target.value }))}>
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
          </select>
        </div>

        <div className="full-width-field">
          <label>Remarks</label>
          <input value={form.remarks} onChange={(e) => setForm((p) => ({ ...p, remarks: e.target.value }))} />
        </div>
      </div>

      <div className="form-actions">
        <button type="button" onClick={handleSave} disabled={saving}>
          {saving ? 'Saving...' : form.id ? 'Update Config' : 'Save Config'}
        </button>
        <button type="button" onClick={() => setForm(emptyForm)} disabled={saving}>Clear</button>
      </div>

      <div className="section-title">
        <h3>Saved Configs</h3>
      </div>

      {loading ? (
        <div className="info-box">Loading...</div>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Location</th>
              <th>Stream Asset</th>
              <th>Stream</th>
              <th>Meter Label</th>
              <th>Factor</th>
              <th>Unit</th>
              <th>Calibration Date</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                <td>{row.locationName || row.locationCode}</td>
                <td>{row.assetName || row.assetCode}</td>
                <td>{row.streamName || 'Default'}</td>
                <td>{row.meterLabel}</td>
                <td>{row.meterFactor}</td>
                <td>{row.meterUnit}</td>
                <td>{row.calibrationDate || '-'}</td>
                <td>{row.status}</td>
                <td className="action-buttons">
                  <button type="button" onClick={() => handleEdit(row)}>Edit</button>
                  <button type="button" className="danger-button" onClick={() => handleDelete(row)}>Delete</button>
                </td>
              </tr>
            ))}
            {rows.length === 0 ? (
              <tr>
                <td colSpan={9}>No flowmeter config found.</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      )}

      <div className="section-title">
        <h3>Meter History</h3>
      </div>

      {historyLoading ? (
        <div className="info-box">Loading history...</div>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Changed At</th>
              <th>Stream Asset</th>
              <th>Stream</th>
              <th>Meter Label</th>
              <th>Action</th>
              <th>Old Factor</th>
              <th>New Factor</th>
              <th>Old Unit</th>
              <th>New Unit</th>
              <th>Old Calibration</th>
              <th>New Calibration</th>
              <th>Changed By</th>
            </tr>
          </thead>
          <tbody>
            {historyRows.map((row) => (
              <tr key={row.id}>
                <td>{row.changedAt}</td>
                <td>{row.assetCode}</td>
                <td>{row.streamName || 'Default'}</td>
                <td>{row.meterLabel}</td>
                <td>{row.changeAction}</td>
                <td>{row.oldMeterFactor ?? '-'}</td>
                <td>{row.newMeterFactor ?? '-'}</td>
                <td>{row.oldMeterUnit || '-'}</td>
                <td>{row.newMeterUnit || '-'}</td>
                <td>{row.oldCalibrationDate || '-'}</td>
                <td>{row.newCalibrationDate || '-'}</td>
                <td>{row.changedBy || '-'}</td>
              </tr>
            ))}
            {historyRows.length === 0 ? (
              <tr>
                <td colSpan={12}>No meter history yet.</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      )}
    </div>
  )
}

export default FlowmeterConfigMaster
