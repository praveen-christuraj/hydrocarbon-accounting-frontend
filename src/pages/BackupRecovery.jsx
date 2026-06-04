import { useEffect, useMemo, useState } from 'react'
import {
  approveBackupRestoreRequest,
  cancelBackupRestoreRequest,
  cleanupBackups,
  createManualBackup,
  createBackupRestoreRequest,
  deleteBackup,
  downloadBackup,
  executeBackupRestoreRequest,
  getBackupRestoreRequests,
  getBackupJobs,
  getBackupSettings,
  rejectBackupRestoreRequest,
  updateBackupSettings,
  validateBackupRestoreRequest,
  verifyBackupChecksum,
} from '../api/backupApi'
import PaginationControls, { paginateRows } from '../components/common/PaginationControls'

const emptySettings = {
  enabled: false,
  scheduleMode: 'Daily',
  intervalValue: 24,
  runTime: '02:00',
  retentionDays: 30,
  keepMinimum: 5,
  backupDirectory: '',
  compressionEnabled: true,
}

const formatDateTime = (value) => {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'
  return date.toLocaleString()
}

const formatBytes = (value) => {
  const bytes = Number(value || 0)
  if (!bytes) return '-'
  const mb = bytes / (1024 * 1024)
  if (mb < 1024) return `${mb.toFixed(2)} MB`
  return `${(mb / 1024).toFixed(2)} GB`
}

function BackupRecovery({ loggedInUser }) {
  const [settings, setSettings] = useState(emptySettings)
  const [jobs, setJobs] = useState([])
  const [restoreRequests, setRestoreRequests] = useState([])
  const [description, setDescription] = useState('')
  const [restoreForm, setRestoreForm] = useState({
    backupJobId: '',
    reason: '',
    businessImpact: '',
  })
  const [statusFilter, setStatusFilter] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [restoreStatusFilter, setRestoreStatusFilter] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [restoreCurrentPage, setRestoreCurrentPage] = useState(1)
  const [loading, setLoading] = useState(false)

  const hasPermission = (permissionName) => {
    const username = String(loggedInUser?.username || '').toLowerCase()
    const isAdmin =
      username === 'admin' ||
      (loggedInUser?.roles || []).some(
        (role) =>
          String(role?.role_name || role?.roleName || '').toLowerCase() ===
          'admin'
      ) ||
      String(loggedInUser?.role_name || loggedInUser?.roleName || '').toLowerCase() ===
        'admin'

    if (isAdmin) return true

    return (loggedInUser?.permissions || []).some((permission) => {
      return permission.permissionName === permissionName
    })
  }

  const loadData = async () => {
    try {
      setLoading(true)
      const [settingsData, jobsData, restoreRequestData] = await Promise.all([
        getBackupSettings(),
        getBackupJobs({
          status: statusFilter,
          backupType: typeFilter,
        }),
        getBackupRestoreRequests({
          status: restoreStatusFilter,
        }),
      ])
      setSettings(settingsData)
      setJobs(jobsData)
      setRestoreRequests(restoreRequestData)
      setCurrentPage(1)
      setRestoreCurrentPage(1)
    } catch (error) {
      alert(error.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [statusFilter, typeFilter, restoreStatusFilter])

  const summary = useMemo(() => {
    const completed = jobs.filter((job) => job.status === 'Completed')
    const failed = jobs.filter((job) => job.status === 'Failed')
    return {
      lastCompleted: completed[0] || null,
      failedCount: failed.length,
      runningCount: jobs.filter((job) => ['Pending', 'Running'].includes(job.status)).length,
    }
  }, [jobs])

  const visibleJobs = paginateRows(jobs, currentPage)
  const visibleRestoreRequests = paginateRows(restoreRequests, restoreCurrentPage)
  const completedBackupOptions = jobs.filter((job) => job.status === 'Completed')

  const updateField = (fieldName, value) => {
    setSettings((current) => ({
      ...current,
      [fieldName]: value,
    }))
  }

  const saveSettings = async (event) => {
    event.preventDefault()
    if (settings.scheduleMode === 'Daily' && !settings.runTime) {
      alert('Run time is required for daily schedule')
      return
    }

    try {
      setLoading(true)
      const updated = await updateBackupSettings(settings)
      setSettings(updated)
      alert('Backup settings saved')
      await loadData()
    } catch (error) {
      alert(error.message)
    } finally {
      setLoading(false)
    }
  }

  const runManualBackup = async (event) => {
    event.preventDefault()
    if (!window.confirm('Create a manual database backup now?')) return

    try {
      setLoading(true)
      await createManualBackup(description || 'Manual backup')
      setDescription('')
      await loadData()
      alert('Manual backup completed')
    } catch (error) {
      await loadData()
      alert(error.message)
    } finally {
      setLoading(false)
    }
  }

  const runVerifyChecksum = async (job) => {
    try {
      setLoading(true)
      const result = await verifyBackupChecksum(job.id)
      await loadData()
      alert(result.matched ? 'Checksum verified successfully' : 'Checksum mismatch detected')
    } catch (error) {
      await loadData()
      alert(error.message)
    } finally {
      setLoading(false)
    }
  }

  const runDownloadBackup = async (job) => {
    try {
      setLoading(true)
      await downloadBackup(job.id, job.fileName || `${job.backupNumber}.dump`)
      await loadData()
    } catch (error) {
      await loadData()
      alert(error.message)
    } finally {
      setLoading(false)
    }
  }

  const runDeleteBackup = async (job) => {
    const confirmation = window.prompt(
      `Type ${job.backupNumber} to delete the backup file. Job history will be retained.`
    )
    if (confirmation === null) return
    if (confirmation.trim() !== job.backupNumber) {
      alert('Confirmation text does not match the backup number')
      return
    }

    try {
      setLoading(true)
      await deleteBackup(job.id)
      await loadData()
      alert('Backup file deleted. Job history retained.')
    } catch (error) {
      await loadData()
      alert(error.message)
    } finally {
      setLoading(false)
    }
  }

  const runCleanup = async () => {
    if (
      !window.confirm(
        `Run retention cleanup now? This uses ${settings.retentionDays} retention days and keeps at least ${settings.keepMinimum} completed backups.`
      )
    ) {
      return
    }

    try {
      setLoading(true)
      const result = await cleanupBackups()
      await loadData()
      alert(`Cleanup complete. Deleted: ${result.deleted_count}, Skipped: ${result.skipped_count}`)
    } catch (error) {
      await loadData()
      alert(error.message)
    } finally {
      setLoading(false)
    }
  }

  const updateRestoreField = (fieldName, value) => {
    setRestoreForm((current) => ({
      ...current,
      [fieldName]: value,
    }))
  }

  const runCreateRestoreRequest = async (event) => {
    event.preventDefault()
    if (!restoreForm.backupJobId) {
      alert('Select a completed backup')
      return
    }
    if (restoreForm.reason.trim() === '') {
      alert('Restore reason is required')
      return
    }
    if (
      !window.confirm(
        'Create restore approval request? This does not restore the database.'
      )
    ) {
      return
    }

    try {
      setLoading(true)
      await createBackupRestoreRequest({
        backupJobId: Number(restoreForm.backupJobId),
        reason: restoreForm.reason,
        businessImpact: restoreForm.businessImpact,
      })
      setRestoreForm({
        backupJobId: '',
        reason: '',
        businessImpact: '',
      })
      await loadData()
      alert('Restore approval request created')
    } catch (error) {
      await loadData()
      alert(error.message)
    } finally {
      setLoading(false)
    }
  }

  const runRestoreRequestAction = async (request, action) => {
    const promptLabel =
      action === 'approve'
        ? 'Approval remarks'
        : action === 'reject'
          ? 'Rejection remarks'
          : 'Cancellation remarks'
    const remarks = window.prompt(promptLabel, '')
    if (remarks === null) return
    if (action === 'reject' && remarks.trim() === '') {
      alert('Rejection remarks are required')
      return
    }

    try {
      setLoading(true)
      if (action === 'approve') {
        await approveBackupRestoreRequest(request.id, remarks)
      } else if (action === 'reject') {
        await rejectBackupRestoreRequest(request.id, remarks)
      } else {
        await cancelBackupRestoreRequest(request.id, remarks)
      }
      await loadData()
      alert(`Restore request ${action} action completed`)
    } catch (error) {
      await loadData()
      alert(error.message)
    } finally {
      setLoading(false)
    }
  }

  const runValidateRestoreRequest = async (request) => {
    if (
      !window.confirm(
        'Validate this restore request against the separate validation database? Production will not be restored.'
      )
    ) {
      return
    }

    try {
      setLoading(true)
      await validateBackupRestoreRequest(request.id)
      await loadData()
      alert('Restore validation completed')
    } catch (error) {
      await loadData()
      alert(error.message)
    } finally {
      setLoading(false)
    }
  }

  const runExecuteRestoreRequest = async (request) => {
    const expectedConfirmation = `EXECUTE RESTORE ${request.requestNumber}`
    if (
      !window.confirm(
        'This will restore the production database from the selected backup. A safety backup will be created first. Continue?'
      )
    ) {
      return
    }

    const confirmation = window.prompt(
      `Type ${expectedConfirmation} to execute production restore.`
    )
    if (confirmation === null) return
    if (confirmation.trim() !== expectedConfirmation) {
      alert('Confirmation text does not match')
      return
    }

    const remarks = window.prompt('Execution remarks', '')
    if (remarks === null) return

    try {
      setLoading(true)
      await executeBackupRestoreRequest(request.id, confirmation.trim(), remarks)
      await loadData()
      alert('Production restore completed')
    } catch (error) {
      await loadData()
      alert(error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <div className="page-title">
        <div>
          <h2>Backup Recovery</h2>
          <p>Manual backup, automatic backup, validation, and controlled restore execution.</p>
        </div>
        <span className="record-count">{jobs.length} Jobs</span>
      </div>

      <div className="backup-kpi-grid">
        <div className="info-box">
          <strong>Auto Backup</strong>
          <p>{settings.enabled ? 'Enabled' : 'Disabled'}</p>
          <small>
            {settings.scheduleMode} | Next: {formatDateTime(settings.nextRunAt)}
          </small>
        </div>
        <div className="info-box">
          <strong>Last Successful Backup</strong>
          <p>{summary.lastCompleted ? summary.lastCompleted.backupNumber : '-'}</p>
          <small>{formatDateTime(summary.lastCompleted?.completedAt)}</small>
        </div>
        <div className="info-box">
          <strong>Running / Pending</strong>
          <p>{summary.runningCount}</p>
          <small>Duplicate backup runs are blocked by the backend.</small>
        </div>
        <div className="info-box">
          <strong>Failed Jobs</strong>
          <p>{summary.failedCount}</p>
          <small>Open history for the latest error message.</small>
        </div>
      </div>

      <div className="section-title">
        <h3>Manual Backup</h3>
        <p>Create an immediate PostgreSQL backup using the backend server.</p>
      </div>
      <form onSubmit={runManualBackup} className="backup-form">
        <div className="full-width-field">
          <label>Description</label>
          <input
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="Before maintenance / End of day backup"
            disabled={loading}
          />
        </div>
        <div className="form-actions">
          <button type="submit" disabled={loading}>
            Create Backup
          </button>
          <button type="button" onClick={loadData} disabled={loading}>
            Refresh
          </button>
        </div>
      </form>

      <div className="section-title">
        <h3>Automatic Backup Settings</h3>
        <p>Frontend-controlled schedule. The backend scheduler executes due jobs.</p>
      </div>
      <form onSubmit={saveSettings} className="backup-form">
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={settings.enabled}
            onChange={(event) => updateField('enabled', event.target.checked)}
          />
          Enable automatic backup
        </label>

        <div>
          <label>Schedule Mode</label>
          <select
            value={settings.scheduleMode}
            onChange={(event) => updateField('scheduleMode', event.target.value)}
          >
            <option>Minutes</option>
            <option>Hours</option>
            <option>Daily</option>
            <option>Weekly</option>
          </select>
        </div>

        <div>
          <label>Interval Value</label>
          <input
            type="number"
            min="1"
            value={settings.intervalValue}
            onChange={(event) => updateField('intervalValue', event.target.value)}
          />
        </div>

        <div>
          <label>Run Time</label>
          <input
            type="time"
            value={settings.runTime}
            onChange={(event) => updateField('runTime', event.target.value)}
          />
        </div>

        <div>
          <label>Retention Days</label>
          <input
            type="number"
            min="1"
            value={settings.retentionDays}
            onChange={(event) => updateField('retentionDays', event.target.value)}
          />
        </div>

        <div>
          <label>Keep Minimum Backups</label>
          <input
            type="number"
            min="1"
            value={settings.keepMinimum}
            onChange={(event) => updateField('keepMinimum', event.target.value)}
          />
        </div>

        <div className="full-width-field">
          <label>Backup Directory</label>
          <input
            value={settings.backupDirectory}
            onChange={(event) => updateField('backupDirectory', event.target.value)}
            placeholder="Leave blank to use server default backups folder"
          />
        </div>

        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={settings.compressionEnabled}
            onChange={(event) => updateField('compressionEnabled', event.target.checked)}
          />
          Use compressed pg_dump custom format
        </label>

        <div className="form-actions">
          <button type="submit" disabled={loading}>
            Save Settings
          </button>
        </div>
      </form>

      <div className="section-title">
        <h3>Backup History</h3>
        <p>Completed and failed backup jobs are retained for audit and operational review.</p>
      </div>
      <div className="filter-panel">
        <div>
          <label>Status</label>
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
            <option value="">All</option>
            <option>Pending</option>
            <option>Running</option>
            <option>Completed</option>
            <option>Failed</option>
            <option>Checksum Mismatch</option>
            <option>Deleted</option>
          </select>
        </div>
        <div>
          <label>Type</label>
          <select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)}>
            <option value="">All</option>
            <option>Manual</option>
            <option>Scheduled</option>
          </select>
        </div>
        <div className="filter-actions">
          <button type="button" onClick={loadData} disabled={loading}>
            Refresh
          </button>
          {hasPermission('Run Backup Cleanup') && (
            <button type="button" onClick={runCleanup} disabled={loading}>
              Run Cleanup
            </button>
          )}
        </div>
      </div>

      <table>
        <thead>
          <tr>
            <th>Backup No.</th>
            <th>Type</th>
            <th>Status</th>
            <th>File</th>
            <th>Size</th>
            <th>Started</th>
            <th>Completed</th>
            <th>Requested By</th>
            <th>Error / Checksum</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {visibleJobs.length === 0 ? (
            <tr>
              <td colSpan="10" className="empty-table">
                No backup jobs found.
              </td>
            </tr>
          ) : (
            visibleJobs.map((job) => (
              <tr key={job.id}>
                <td>{job.backupNumber}</td>
                <td>{job.backupType}</td>
                <td>
                  <span className={`status-badge ${job.status.toLowerCase()}`}>
                    {job.status}
                  </span>
                </td>
                <td>
                  {job.fileName || '-'}
                  <div className="muted-table-text">{job.databaseName || '-'}</div>
                </td>
                <td>{formatBytes(job.fileSizeBytes)}</td>
                <td>{formatDateTime(job.startedAt)}</td>
                <td>{formatDateTime(job.completedAt)}</td>
                <td>{job.requestedByDisplay || 'System Scheduler'}</td>
                <td>
                  {job.errorMessage ? (
                    <span className="negative">{job.errorMessage}</span>
                  ) : (
                    <span className="muted-table-text">
                      {job.checksumSha256 ? job.checksumSha256.slice(0, 18) : '-'}
                    </span>
                  )}
                </td>
                <td>
                  <div className="table-actions">
                    {hasPermission('Verify Backup Checksum') && job.status === 'Completed' && (
                      <button
                        type="button"
                        onClick={() => runVerifyChecksum(job)}
                        disabled={loading}
                      >
                        Verify
                      </button>
                    )}
                    {hasPermission('Download Backup') && job.status === 'Completed' && (
                      <button
                        type="button"
                        onClick={() => runDownloadBackup(job)}
                        disabled={loading}
                      >
                        Download
                      </button>
                    )}
                    {hasPermission('Delete Backup') &&
                      !['Pending', 'Running', 'Deleted'].includes(job.status) && (
                        <button
                          type="button"
                          onClick={() => runDeleteBackup(job)}
                          disabled={loading}
                        >
                          Delete File
                        </button>
                      )}
                  </div>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>

      <PaginationControls
        totalRows={jobs.length}
        currentPage={currentPage}
        onPageChange={setCurrentPage}
      />

      <div className="section-title">
        <h3>Restore Request Workflow</h3>
        <p>
          Restore requires approval, validation, exact confirmation text, and an automatic
          safety backup before production execution.
        </p>
      </div>

      {hasPermission('Request Backup Restore') && (
        <form onSubmit={runCreateRestoreRequest} className="backup-form">
          <div>
            <label>Completed Backup</label>
            <select
              value={restoreForm.backupJobId}
              onChange={(event) => updateRestoreField('backupJobId', event.target.value)}
            >
              <option value="">Select backup</option>
              {completedBackupOptions.map((job) => (
                <option key={job.id} value={job.id}>
                  {job.backupNumber} | {job.fileName || 'No file name'}
                </option>
              ))}
            </select>
          </div>
          <div className="full-width-field">
            <label>Reason</label>
            <textarea
              rows="3"
              value={restoreForm.reason}
              onChange={(event) => updateRestoreField('reason', event.target.value)}
              placeholder="Explain why this backup may be needed for recovery"
            />
          </div>
          <div className="full-width-field">
            <label>Business Impact</label>
            <textarea
              rows="3"
              value={restoreForm.businessImpact}
              onChange={(event) => updateRestoreField('businessImpact', event.target.value)}
              placeholder="Describe operational impact, affected period, and urgency"
            />
          </div>
          <div className="form-actions">
            <button type="submit" disabled={loading}>
              Request Restore Approval
            </button>
          </div>
        </form>
      )}

      <div className="filter-panel">
        <div>
          <label>Restore Request Status</label>
          <select
            value={restoreStatusFilter}
            onChange={(event) => setRestoreStatusFilter(event.target.value)}
          >
            <option value="">All</option>
            <option>Pending Approval</option>
            <option>Approved</option>
            <option>Validation Running</option>
            <option>Validated</option>
            <option>Validation Failed</option>
            <option>Restore Running</option>
            <option>Restored</option>
            <option>Restore Failed</option>
            <option>Rejected</option>
            <option>Cancelled</option>
          </select>
        </div>
        <div className="filter-actions">
          <button type="button" onClick={loadData} disabled={loading}>
            Refresh
          </button>
        </div>
      </div>

      <table>
        <thead>
          <tr>
            <th>Request No.</th>
            <th>Backup</th>
            <th>Status</th>
            <th>Reason</th>
            <th>Requested By</th>
            <th>Actioned By</th>
            <th>Validation</th>
            <th>Remarks</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {visibleRestoreRequests.length === 0 ? (
            <tr>
              <td colSpan="9" className="empty-table">
                No restore requests found.
              </td>
            </tr>
          ) : (
            visibleRestoreRequests.map((request) => (
              <tr key={request.id}>
                <td>{request.requestNumber}</td>
                <td>{request.backupNumber}</td>
                <td>
                  <span className={`status-badge ${request.status.toLowerCase().replaceAll(' ', '-')}`}>
                    {request.status}
                  </span>
                </td>
                <td>
                  {request.reason}
                  {request.businessImpact && (
                    <div className="muted-table-text">{request.businessImpact}</div>
                  )}
                </td>
                <td>
                  {request.requestedByDisplay || '-'}
                  <div className="muted-table-text">{formatDateTime(request.requestedAt)}</div>
                </td>
                <td>
                  {request.approvedByDisplay ||
                    request.rejectedByDisplay ||
                    request.cancelledByDisplay ||
                    '-'}
                </td>
                <td>
                  {request.metadataJson?.latest_validation ? (
                    <>
                      <strong>{request.metadataJson.latest_validation.validation_number}</strong>
                      <div className="muted-table-text">
                        {request.metadataJson.latest_validation.status} |{' '}
                        {request.metadataJson.latest_validation.validation_database_name || '-'}
                      </div>
                    </>
                  ) : (
                    '-'
                  )}
                </td>
                <td>{request.actionRemarks || '-'}</td>
                <td>
                  <div className="table-actions">
                    {['Approved', 'Validation Failed'].includes(request.status) &&
                      hasPermission('Validate Backup Restore') && (
                        <button
                          type="button"
                          onClick={() => runValidateRestoreRequest(request)}
                          disabled={loading}
                        >
                          Validate
                        </button>
                      )}
                    {request.status === 'Validated' &&
                      hasPermission('Execute Backup Restore') && (
                        <button
                          type="button"
                          onClick={() => runExecuteRestoreRequest(request)}
                          disabled={loading}
                        >
                          Execute Restore
                        </button>
                      )}
                    {request.status === 'Pending Approval' &&
                      hasPermission('Approve Backup Restore') && (
                        <button
                          type="button"
                          onClick={() => runRestoreRequestAction(request, 'approve')}
                          disabled={loading}
                        >
                          Approve
                        </button>
                      )}
                    {request.status === 'Pending Approval' &&
                      hasPermission('Reject Backup Restore') && (
                        <button
                          type="button"
                          onClick={() => runRestoreRequestAction(request, 'reject')}
                          disabled={loading}
                        >
                          Reject
                        </button>
                      )}
                    {request.status === 'Pending Approval' &&
                      (hasPermission('Approve Backup Restore') ||
                        request.requestedByUserId === loggedInUser?.id) && (
                        <button
                          type="button"
                          onClick={() => runRestoreRequestAction(request, 'cancel')}
                          disabled={loading}
                        >
                          Cancel
                        </button>
                      )}
                  </div>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>

      <PaginationControls
        totalRows={restoreRequests.length}
        currentPage={restoreCurrentPage}
        onPageChange={setRestoreCurrentPage}
      />
    </div>
  )
}

export default BackupRecovery
