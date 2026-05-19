import { useEffect, useMemo, useState } from 'react'
import {
  createMaterialBalanceTemplate,
  createMaterialBalanceTemplateColumn,
  deleteMaterialBalanceTemplate,
  deleteMaterialBalanceTemplateColumn,
  getMaterialBalanceTemplateDetail,
  getMaterialBalanceTemplates,
  getTankOperationsForMaterialBalance,
  updateMaterialBalanceTemplate,
  updateMaterialBalanceTemplateColumn,
} from '../api/materialBalanceTemplateApi'

const columnTypes = [
  'OPENING',
  'MOVEMENT',
  'BOOK_CLOSING',
  'ACTUAL_CLOSING',
  'LOSS_GAIN',
  'FORMULA',
  'INFO',
]

const movementDirections = ['IN', 'OUT', 'NEUTRAL']

function MaterialBalanceTemplateMaster({ locations }) {
  const emptyTemplateForm = {
    id: null,
    locationCode: '',
    templateName: '',
    description: '',
    status: 'Active',
  }

  const emptyColumnForm = {
    id: null,
    columnLabel: '',
    columnKey: '',
    columnOrder: 1,
    columnType: 'MOVEMENT',
    movementDirection: 'IN',
    mappedOperationCodes: [],
    excludedOperationCodes: [],
    includeInMaterialBalance: 'Yes',
    includeInBookClosing: 'Yes',
    isInternalTransfer: 'No',
    formulaJson: null,
    remarks: '',
    status: 'Active',
  }

  const [templates, setTemplates] = useState([])
  const [selectedTemplate, setSelectedTemplate] = useState(null)
  const [templateForm, setTemplateForm] = useState(emptyTemplateForm)
  const [columnForm, setColumnForm] = useState(emptyColumnForm)
  const [tankOperations, setTankOperations] = useState([])
  const [loading, setLoading] = useState(false)
  const [savingTemplate, setSavingTemplate] = useState(false)
  const [savingColumn, setSavingColumn] = useState(false)

  const activeLocations = useMemo(() => {
    return (locations || []).filter((location) => location.status === 'Active')
  }, [locations])

  const filteredTankOperations = useMemo(() => {
    return (tankOperations || []).filter((operation) => {
      if (operation.status !== 'Active') {
        return false
      }

      if (columnForm.columnType === 'MOVEMENT' && columnForm.movementDirection) {
        return operation.operationSign === columnForm.movementDirection
      }

      return true
    })
  }, [tankOperations, columnForm.columnType, columnForm.movementDirection])

  const selectedColumns = useMemo(() => {
    return [...(selectedTemplate?.columns || [])].sort((a, b) => {
      if (a.columnOrder !== b.columnOrder) {
        return a.columnOrder - b.columnOrder
      }

      return a.id - b.id
    })
  }, [selectedTemplate])

  const loadTemplates = async (locationCode = templateForm.locationCode) => {
    try {
      setLoading(true)

      const data = await getMaterialBalanceTemplates({
        locationCode,
      })

      setTemplates(data)
    } catch (error) {
      alert(error.message)
    } finally {
      setLoading(false)
    }
  }

  const loadTankOperations = async (locationCode) => {
    if (!locationCode) {
      setTankOperations([])
      return
    }

    try {
      const data = await getTankOperationsForMaterialBalance({
        locationCode,
        status: 'Active',
      })

      setTankOperations(data)
    } catch (error) {
      alert(error.message)
    }
  }

  const loadTemplateDetail = async (templateId) => {
    try {
      setLoading(true)

      const data = await getMaterialBalanceTemplateDetail(templateId)
      setSelectedTemplate(data)
      setTemplateForm({
        id: data.id,
        locationCode: data.locationCode,
        templateName: data.templateName,
        description: data.description,
        status: data.status,
      })
      setColumnForm(emptyColumnForm)
      await loadTankOperations(data.locationCode)
    } catch (error) {
      alert(error.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadTemplates('')
  }, [])

  const generateColumnKey = (label) => {
    return String(label || '')
      .trim()
      .toLowerCase()
      .replaceAll(' ', '_')
      .replaceAll('-', '_')
      .replaceAll('/', '_')
      .replace(/_+/g, '_')
      .toUpperCase()
  }

  const handleTemplateChange = async (e) => {
    const { name, value } = e.target

    if (name === 'locationCode') {
      setTemplateForm({
        ...templateForm,
        locationCode: value,
      })
      setSelectedTemplate(null)
      setColumnForm(emptyColumnForm)
      await loadTemplates(value)
      await loadTankOperations(value)
      return
    }

    setTemplateForm({
      ...templateForm,
      [name]: value,
    })
  }

  const handleColumnChange = (e) => {
    const { name, value } = e.target

    if (name === 'columnLabel') {
      setColumnForm({
        ...columnForm,
        columnLabel: value,
        columnKey: columnForm.columnKey || generateColumnKey(value),
      })
      return
    }

    if (name === 'columnType') {
      const nextForm = {
        ...columnForm,
        columnType: value,
      }

      if (value !== 'MOVEMENT') {
        nextForm.movementDirection = ''
        nextForm.mappedOperationCodes = []
        nextForm.excludedOperationCodes = []
      } else {
        nextForm.movementDirection = nextForm.movementDirection || 'IN'
      }

      setColumnForm(nextForm)
      return
    }

    if (name === 'movementDirection') {
      setColumnForm({
        ...columnForm,
        movementDirection: value,
        mappedOperationCodes: [],
        excludedOperationCodes: [],
      })
      return
    }

    if (name === 'isInternalTransfer') {
      if (value === 'Yes') {
        setColumnForm({
          ...columnForm,
          isInternalTransfer: 'Yes',
          includeInMaterialBalance: 'No',
          includeInBookClosing: 'No',
        })
        return
      }

      setColumnForm({
        ...columnForm,
        isInternalTransfer: 'No',
      })
      return
    }

    setColumnForm({
      ...columnForm,
      [name]: value,
    })
  }

  const handleMappedOperationToggle = (operationCode) => {
    const exists = columnForm.mappedOperationCodes.includes(operationCode)

    setColumnForm({
      ...columnForm,
      mappedOperationCodes: exists
        ? columnForm.mappedOperationCodes.filter((code) => code !== operationCode)
        : [...columnForm.mappedOperationCodes, operationCode],
    })
  }

  const handleExcludedOperationToggle = (operationCode) => {
    const exists = columnForm.excludedOperationCodes.includes(operationCode)

    setColumnForm({
      ...columnForm,
      excludedOperationCodes: exists
        ? columnForm.excludedOperationCodes.filter((code) => code !== operationCode)
        : [...columnForm.excludedOperationCodes, operationCode],
    })
  }

  const handleSaveTemplate = async (e) => {
    e.preventDefault()

    if (!templateForm.locationCode) {
      alert('Location is required')
      return
    }

    if (!templateForm.templateName.trim()) {
      alert('Template Name is required')
      return
    }

    try {
      setSavingTemplate(true)

      let savedTemplate

      if (templateForm.id) {
        savedTemplate = await updateMaterialBalanceTemplate(
          templateForm.id,
          templateForm
        )
      } else {
        savedTemplate = await createMaterialBalanceTemplate(templateForm)
      }

      await loadTemplates(templateForm.locationCode)
      await loadTemplateDetail(savedTemplate.id)
      alert('Material Balance Template saved successfully')
    } catch (error) {
      alert(error.message)
    } finally {
      setSavingTemplate(false)
    }
  }

  const handleNewTemplate = () => {
    setSelectedTemplate(null)
    setTemplateForm({
      ...emptyTemplateForm,
      locationCode: templateForm.locationCode,
    })
    setColumnForm(emptyColumnForm)
  }

  const handleDeleteTemplate = async (template) => {
    const confirmed = window.confirm(
      `Delete Material Balance Template "${template.templateName}"?`
    )

    if (!confirmed) {
      return
    }

    try {
      await deleteMaterialBalanceTemplate(template.id)
      setSelectedTemplate(null)
      setTemplateForm({
        ...emptyTemplateForm,
        locationCode: templateForm.locationCode,
      })
      setColumnForm(emptyColumnForm)
      await loadTemplates(template.locationCode)
      alert('Material Balance Template deleted successfully')
    } catch (error) {
      alert(error.message)
    }
  }

  const validateColumnBeforeSave = () => {
    if (!selectedTemplate?.id) {
      alert('Please select or save a template first')
      return false
    }

    if (!columnForm.columnLabel.trim()) {
      alert('Column Label is required')
      return false
    }

    if (!columnForm.columnKey.trim()) {
      alert('Column Key is required')
      return false
    }

    if (columnForm.columnType === 'MOVEMENT') {
      if (!columnForm.movementDirection) {
        alert('Movement Direction is required for MOVEMENT columns')
        return false
      }

      if (columnForm.mappedOperationCodes.length === 0) {
        alert('Select at least one mapped Tank Operation')
        return false
      }
    }

    return true
  }

  const handleSaveColumn = async (e) => {
    e.preventDefault()

    if (!validateColumnBeforeSave()) {
      return
    }

    try {
      setSavingColumn(true)

      if (columnForm.id) {
        await updateMaterialBalanceTemplateColumn(columnForm.id, columnForm)
      } else {
        await createMaterialBalanceTemplateColumn(
          selectedTemplate.id,
          columnForm
        )
      }

      await loadTemplateDetail(selectedTemplate.id)
      setColumnForm(emptyColumnForm)
      alert('Material Balance column saved successfully')
    } catch (error) {
      alert(error.message)
    } finally {
      setSavingColumn(false)
    }
  }

  const handleEditColumn = (column) => {
    setColumnForm({
      ...emptyColumnForm,
      ...column,
      mappedOperationCodes: column.mappedOperationCodes || [],
      excludedOperationCodes: column.excludedOperationCodes || [],
    })
  }

  const handleDeleteColumn = async (column) => {
    const confirmed = window.confirm(
      `Delete column "${column.columnLabel}" from this template?`
    )

    if (!confirmed) {
      return
    }

    try {
      await deleteMaterialBalanceTemplateColumn(column.id)
      await loadTemplateDetail(selectedTemplate.id)
      alert('Material Balance column deleted successfully')
    } catch (error) {
      alert(error.message)
    }
  }

  const handleAddStandardColumns = async () => {
    if (!selectedTemplate?.id) {
      alert('Please select or save a template first')
      return
    }

    const confirmed = window.confirm(
      'Add standard columns: Opening Stock, Book Closing Stock, Closing Stock, Loss/Gain?'
    )

    if (!confirmed) {
      return
    }

    const standardColumns = [
      {
        columnLabel: 'Opening Stock',
        columnKey: 'OPENING_STOCK',
        columnOrder: 1,
        columnType: 'OPENING',
        movementDirection: '',
        mappedOperationCodes: [],
        excludedOperationCodes: [],
        includeInMaterialBalance: 'Yes',
        includeInBookClosing: 'Yes',
        isInternalTransfer: 'No',
        formulaJson: null,
        remarks: '',
        status: 'Active',
      },
      {
        columnLabel: 'Book Closing Stock',
        columnKey: 'BOOK_CLOSING_STOCK',
        columnOrder: 90,
        columnType: 'BOOK_CLOSING',
        movementDirection: '',
        mappedOperationCodes: [],
        excludedOperationCodes: [],
        includeInMaterialBalance: 'Yes',
        includeInBookClosing: 'Yes',
        isInternalTransfer: 'No',
        formulaJson: null,
        remarks: '',
        status: 'Active',
      },
      {
        columnLabel: 'Closing Stock',
        columnKey: 'CLOSING_STOCK',
        columnOrder: 91,
        columnType: 'ACTUAL_CLOSING',
        movementDirection: '',
        mappedOperationCodes: [],
        excludedOperationCodes: [],
        includeInMaterialBalance: 'Yes',
        includeInBookClosing: 'Yes',
        isInternalTransfer: 'No',
        formulaJson: null,
        remarks: '',
        status: 'Active',
      },
      {
        columnLabel: 'Loss/Gain',
        columnKey: 'LOSS_GAIN',
        columnOrder: 92,
        columnType: 'LOSS_GAIN',
        movementDirection: '',
        mappedOperationCodes: [],
        excludedOperationCodes: [],
        includeInMaterialBalance: 'Yes',
        includeInBookClosing: 'Yes',
        isInternalTransfer: 'No',
        formulaJson: null,
        remarks: '',
        status: 'Active',
      },
    ]

    try {
      for (const column of standardColumns) {
        await createMaterialBalanceTemplateColumn(selectedTemplate.id, column)
      }

      await loadTemplateDetail(selectedTemplate.id)
      alert('Standard columns added successfully')
    } catch (error) {
      alert(error.message)
    }
  }

  const renderOperationCheckboxes = () => {
    if (columnForm.columnType !== 'MOVEMENT') {
      return null
    }

    return (
      <>
        <div className="full-width-field">
          <label>Mapped Tank Operations</label>
          <div className="operation-checkbox-grid">
            {filteredTankOperations.length === 0 ? (
              <div className="empty-table">
                No active Tank Operations found for this direction/location.
              </div>
            ) : (
              filteredTankOperations.map((operation) => (
                <label key={operation.id} className="operation-checkbox-card">
                  <input
                    type="checkbox"
                    checked={columnForm.mappedOperationCodes.includes(
                      operation.operationCode
                    )}
                    onChange={() =>
                      handleMappedOperationToggle(operation.operationCode)
                    }
                  />

                  <div>
                    <strong>{operation.operationLabel}</strong>
                    <span>
                      {operation.operationCode} / {operation.operationSign} /{' '}
                      {operation.operationCategory}
                    </span>
                  </div>
                </label>
              ))
            )}
          </div>
        </div>

        <div className="full-width-field">
          <label>Excluded Operations from this Column</label>
          <p className="field-help-text">
            Use this for exemptions like ITT IN / ITT OUT / Internal Tank
            Transfers. Excluded operations will not be counted in this Material
            Balance column.
          </p>

          <div className="operation-checkbox-grid">
            {filteredTankOperations.length === 0 ? (
              <div className="empty-table">
                No active Tank Operations found for exclusion.
              </div>
            ) : (
              filteredTankOperations.map((operation) => (
                <label
                  key={`excluded-${operation.id}`}
                  className="operation-checkbox-card"
                >
                  <input
                    type="checkbox"
                    checked={columnForm.excludedOperationCodes.includes(
                      operation.operationCode
                    )}
                    onChange={() =>
                      handleExcludedOperationToggle(operation.operationCode)
                    }
                  />

                  <div>
                    <strong>{operation.operationLabel}</strong>
                    <span>
                      {operation.operationCode} / {operation.operationSign} /{' '}
                      {operation.operationCategory}
                    </span>
                  </div>
                </label>
              ))
            )}
          </div>
        </div>
      </>
    )
  }

  return (
    <div>
      <div className="page-title">
        <div>
          <h2>Material Balance Template Configuration</h2>
          <p>
            Configure location-wise Material Balance columns from Tank
            Operations. No report columns are hardcoded.
          </p>
        </div>

        <span className="record-count">{templates.length} Templates</span>
      </div>

      <div className="info-box">
        Material Balance columns are configured from Tank Operations. IN
        operations like Receipt / Production / Receipt from X can be mapped to
        receipt columns. OUT operations like Dispatch / Draining can be mapped
        to dispatch columns. ITT/Internal Tank Transfers can be tracked but
        excluded from Material Balance and Book Closing.
      </div>

      <form onSubmit={handleSaveTemplate}>
        <div>
          <label>Location</label>
          <select
            name="locationCode"
            value={templateForm.locationCode}
            onChange={handleTemplateChange}
            disabled={savingTemplate || loading}
          >
            <option value="">Select Location</option>

            {activeLocations.map((location) => (
              <option key={location.id} value={location.locationCode}>
                {location.locationName} ({location.locationCode})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label>Template Name</label>
          <input
            name="templateName"
            type="text"
            value={templateForm.templateName}
            onChange={handleTemplateChange}
            placeholder="Example: UTP Daily Material Balance"
            disabled={savingTemplate}
          />
        </div>

        <div>
          <label>Status</label>
          <select
            name="status"
            value={templateForm.status}
            onChange={handleTemplateChange}
            disabled={savingTemplate}
          >
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
          </select>
        </div>

        <div className="full-width-field">
          <label>Description</label>
          <textarea
            name="description"
            rows="2"
            value={templateForm.description}
            onChange={handleTemplateChange}
            placeholder="Optional description"
            disabled={savingTemplate}
          />
        </div>

        <div className="form-actions">
          <button type="submit" disabled={savingTemplate || loading}>
            {savingTemplate ? 'Saving...' : 'Save Template'}
          </button>

          <button type="button" onClick={handleNewTemplate} disabled={loading}>
            New Template
          </button>
        </div>
      </form>

      <div className="section-title">
        <h3>Existing Templates</h3>
        <p>Select a template to configure its report columns.</p>
      </div>

      <table>
        <thead>
          <tr>
            <th>Location</th>
            <th>Template Name</th>
            <th>Description</th>
            <th>Status</th>
            <th>Columns</th>
            <th>Actions</th>
          </tr>
        </thead>

        <tbody>
          {templates.length === 0 ? (
            <tr>
              <td colSpan="6" className="empty-table">
                No Material Balance templates found.
              </td>
            </tr>
          ) : (
            templates.map((template) => (
              <tr key={template.id}>
                <td>{template.locationCode}</td>
                <td>{template.templateName}</td>
                <td>{template.description || '-'}</td>
                <td>
                  <span className={`status-badge ${template.status.toLowerCase()}`}>
                    {template.status}
                  </span>
                </td>
                <td>{template.columns?.length || 0}</td>
                <td>
                  <button
                    type="button"
                    onClick={() => loadTemplateDetail(template.id)}
                  >
                    Open
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDeleteTemplate(template)}
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>

      {selectedTemplate && (
        <>
          <div className="section-title">
            <h3>Template Columns</h3>
            <p>
              Configure the visible report columns and map movement columns to
              Tank Operation codes.
            </p>
          </div>

          <div className="template-action-bar">
            <strong>
              Selected Template: {selectedTemplate.templateName} (
              {selectedTemplate.locationCode})
            </strong>

            <button type="button" onClick={handleAddStandardColumns}>
              Add Standard Columns
            </button>
          </div>

          <form onSubmit={handleSaveColumn}>
            <div>
              <label>Column Label</label>
              <input
                name="columnLabel"
                type="text"
                value={columnForm.columnLabel}
                onChange={handleColumnChange}
                placeholder="Example: Receipt from X"
                disabled={savingColumn}
              />
            </div>

            <div>
              <label>Column Key</label>
              <input
                name="columnKey"
                type="text"
                value={columnForm.columnKey}
                onChange={handleColumnChange}
                placeholder="Example: RECEIPT_FROM_X"
                disabled={savingColumn}
              />
            </div>

            <div>
              <label>Column Order</label>
              <input
                name="columnOrder"
                type="number"
                value={columnForm.columnOrder}
                onChange={handleColumnChange}
                disabled={savingColumn}
              />
            </div>

            <div>
              <label>Column Type</label>
              <select
                name="columnType"
                value={columnForm.columnType}
                onChange={handleColumnChange}
                disabled={savingColumn}
              >
                {columnTypes.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>

            {columnForm.columnType === 'MOVEMENT' && (
              <div>
                <label>Movement Direction</label>
                <select
                  name="movementDirection"
                  value={columnForm.movementDirection}
                  onChange={handleColumnChange}
                  disabled={savingColumn}
                >
                  {movementDirections.map((direction) => (
                    <option key={direction} value={direction}>
                      {direction}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label>Include in Material Balance</label>
              <select
                name="includeInMaterialBalance"
                value={columnForm.includeInMaterialBalance}
                onChange={handleColumnChange}
                disabled={
                  savingColumn || columnForm.isInternalTransfer === 'Yes'
                }
              >
                <option value="Yes">Yes</option>
                <option value="No">No</option>
              </select>
            </div>

            <div>
              <label>Include in Book Closing</label>
              <select
                name="includeInBookClosing"
                value={columnForm.includeInBookClosing}
                onChange={handleColumnChange}
                disabled={
                  savingColumn || columnForm.isInternalTransfer === 'Yes'
                }
              >
                <option value="Yes">Yes</option>
                <option value="No">No</option>
              </select>
            </div>

            <div>
              <label>Internal Transfer / ITT</label>
              <select
                name="isInternalTransfer"
                value={columnForm.isInternalTransfer}
                onChange={handleColumnChange}
                disabled={savingColumn}
              >
                <option value="No">No</option>
                <option value="Yes">Yes</option>
              </select>
            </div>

            <div>
              <label>Status</label>
              <select
                name="status"
                value={columnForm.status}
                onChange={handleColumnChange}
                disabled={savingColumn}
              >
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>

            <div className="full-width-field">
              <label>Remarks</label>
              <textarea
                name="remarks"
                rows="2"
                value={columnForm.remarks}
                onChange={handleColumnChange}
                placeholder="Optional remarks"
                disabled={savingColumn}
              />
            </div>

            {renderOperationCheckboxes()}

            <div className="form-actions">
              <button type="submit" disabled={savingColumn}>
                {savingColumn
                  ? 'Saving...'
                  : columnForm.id
                    ? 'Update Column'
                    : 'Add Column'}
              </button>

              <button
                type="button"
                onClick={() => setColumnForm(emptyColumnForm)}
                disabled={savingColumn}
              >
                Clear Column
              </button>
            </div>
          </form>

          <table>
            <thead>
              <tr>
                <th>Order</th>
                <th>Column Label</th>
                <th>Type</th>
                <th>Direction</th>
                <th>Mapped Operations</th>
                <th>Excluded Operations</th>
                <th>MB</th>
                <th>Book</th>
                <th>ITT</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>

            <tbody>
              {selectedColumns.length === 0 ? (
                <tr>
                  <td colSpan="11" className="empty-table">
                    No columns configured for this template.
                  </td>
                </tr>
              ) : (
                selectedColumns.map((column) => (
                  <tr key={column.id}>
                    <td>{column.columnOrder}</td>
                    <td>
                      <strong>{column.columnLabel}</strong>
                      <div className="muted-table-text">{column.columnKey}</div>
                    </td>
                    <td>{column.columnType}</td>
                    <td>{column.movementDirection || '-'}</td>
                    <td>
                      {(column.mappedOperationCodes || []).length === 0
                        ? '-'
                        : column.mappedOperationCodes.join(', ')}
                    </td>
                    <td>
                      {(column.excludedOperationCodes || []).length === 0
                        ? '-'
                        : column.excludedOperationCodes.join(', ')}
                    </td>
                    <td>{column.includeInMaterialBalance}</td>
                    <td>{column.includeInBookClosing}</td>
                    <td>{column.isInternalTransfer}</td>
                    <td>
                      <span
                        className={`status-badge ${column.status.toLowerCase()}`}
                      >
                        {column.status}
                      </span>
                    </td>
                    <td>
                      <button type="button" onClick={() => handleEditColumn(column)}>
                        Edit
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDeleteColumn(column)}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

          <div className="info-box">
            For robust Material Balance: configure external receipts and
            dispatches as included columns. Configure ITT/Internal Tank Transfer
            columns as internal transfer so they are excluded from Material
            Balance and Book Closing.
          </div>
        </>
      )}
    </div>
  )
}

export default MaterialBalanceTemplateMaster