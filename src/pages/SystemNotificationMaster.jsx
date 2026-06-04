import { useEffect, useMemo, useState } from 'react'
import {
  createSystemNotification,
  deactivateSystemNotification,
  getSystemNotificationDeliveryReport,
  getSystemNotifications,
  publishSystemNotification,
  updateSystemNotification,
} from '../api/systemNotificationApi'

const emptyForm = {
  title: '',
  message: '',
  notificationType: 'Info',
  priority: 'Normal',
  deliveryMode: 'Banner + Inbox',
  targetScope: 'All Users',
  targetRoleIds: [],
  targetUserIds: [],
  targetLocationCodes: [],
  displayFrom: '',
  displayUntil: '',
  requiresAcknowledgement: false,
  popupEnabled: false,
  bannerEnabled: true,
  autoDismissSeconds: '',
  status: 'Draft',
}

const toLocalDateTimeInput = (value) => {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return date.toISOString().slice(0, 16)
}

function SystemNotificationMaster({ roles = [], users = [], locations = [] }) {
  const [form, setForm] = useState(emptyForm)
  const [editId, setEditId] = useState(null)
  const [notifications, setNotifications] = useState([])
  const [deliveryRows, setDeliveryRows] = useState([])
  const [selectedNotification, setSelectedNotification] = useState(null)
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [loading, setLoading] = useState(false)

  const activeRoles = useMemo(() => roles.filter((role) => role.status === 'Active'), [roles])
  const activeUsers = useMemo(() => users.filter((user) => user.status === 'Active'), [users])
  const activeLocations = useMemo(
    () => locations.filter((location) => location.status === 'Active'),
    [locations]
  )

  const loadNotifications = async (status = statusFilter) => {
    try {
      setLoading(true)
      const data = await getSystemNotifications({
        status: status === 'ALL' ? '' : status,
      })
      setNotifications(data)
    } catch (error) {
      alert(error.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadNotifications()
  }, [statusFilter])

  const updateField = (fieldName, value) => {
    setForm((current) => ({
      ...current,
      [fieldName]: value,
    }))
  }

  const toggleArrayValue = (fieldName, value) => {
    setForm((current) => {
      const currentValues = current[fieldName] || []
      return {
        ...current,
        [fieldName]: currentValues.includes(value)
          ? currentValues.filter((item) => item !== value)
          : [...currentValues, value],
      }
    })
  }

  const resetForm = () => {
    setForm(emptyForm)
    setEditId(null)
  }

  const validateForm = () => {
    if (form.title.trim() === '') {
      alert('Title is required')
      return false
    }
    if (form.message.trim() === '') {
      alert('Message is required')
      return false
    }
    if (form.displayFrom && form.displayUntil && form.displayFrom > form.displayUntil) {
      alert('Display From cannot be later than Display Until')
      return false
    }
    return true
  }

  const handleSave = async (event) => {
    event.preventDefault()
    if (!validateForm()) return

    try {
      setLoading(true)
      if (editId) {
        await updateSystemNotification(editId, form)
        alert('Notification updated')
      } else {
        await createSystemNotification(form)
        alert('Notification created')
      }
      resetForm()
      await loadNotifications()
    } catch (error) {
      alert(error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = (notification) => {
    if (notification.status === 'Published') {
      alert('Published notifications cannot be edited. Deactivate and create a new circular if needed.')
      return
    }
    setEditId(notification.id)
    setForm({
      title: notification.title,
      message: notification.message,
      notificationType: notification.notificationType,
      priority: notification.priority,
      deliveryMode: notification.deliveryMode,
      targetScope: notification.targetScope,
      targetRoleIds: notification.targetRoleIds || [],
      targetUserIds: notification.targetUserIds || [],
      targetLocationCodes: notification.targetLocationCodes || [],
      displayFrom: toLocalDateTimeInput(notification.displayFrom),
      displayUntil: toLocalDateTimeInput(notification.displayUntil),
      requiresAcknowledgement: notification.requiresAcknowledgement,
      popupEnabled: notification.popupEnabled,
      bannerEnabled: notification.bannerEnabled,
      autoDismissSeconds: notification.autoDismissSeconds || '',
      status: notification.status === 'Scheduled' ? 'Scheduled' : 'Draft',
    })
  }

  const handlePublish = async (notification) => {
    if (!window.confirm(`Publish ${notification.notificationNumber}?`)) return
    try {
      setLoading(true)
      await publishSystemNotification(notification.id, 'Published from System Notification Manager')
      await loadNotifications()
      alert('Notification published')
    } catch (error) {
      alert(error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleDeactivate = async (notification) => {
    const reason = window.prompt('Deactivation reason', 'Notification deactivated by admin')
    if (reason === null) return
    try {
      setLoading(true)
      await deactivateSystemNotification(notification.id, reason)
      await loadNotifications()
      alert('Notification deactivated')
    } catch (error) {
      alert(error.message)
    } finally {
      setLoading(false)
    }
  }

  const loadDeliveryReport = async (notification) => {
    try {
      setSelectedNotification(notification)
      const data = await getSystemNotificationDeliveryReport(notification.id)
      setDeliveryRows(data || [])
    } catch (error) {
      alert(error.message)
    }
  }

  const showRoleTargets = ['Roles', 'Roles + Locations'].includes(form.targetScope)
  const showUserTargets = form.targetScope === 'Specific Users'
  const showLocationTargets = ['Locations', 'Roles + Locations'].includes(form.targetScope)

  return (
    <div>
      <div className="page-title">
        <div>
          <h2>System Notifications</h2>
          <p>Create application maintenance notices, circulars, and critical user announcements.</p>
        </div>
        <span className="record-count">{notifications.length} Notifications</span>
      </div>

      <form onSubmit={handleSave} className="notification-admin-form">
        <div>
          <label>Title</label>
          <input
            value={form.title}
            onChange={(event) => updateField('title', event.target.value)}
            placeholder="Server maintenance scheduled"
            disabled={loading}
          />
        </div>

        <div className="full-width-field">
          <label>Message</label>
          <textarea
            rows="4"
            value={form.message}
            onChange={(event) => updateField('message', event.target.value)}
            placeholder="Write the notification users should see."
            disabled={loading}
          />
        </div>

        <div>
          <label>Type</label>
          <select value={form.notificationType} onChange={(event) => updateField('notificationType', event.target.value)}>
            <option>Info</option>
            <option>Warning</option>
            <option>Critical</option>
            <option>Success</option>
            <option>Maintenance</option>
            <option>Circular</option>
          </select>
        </div>

        <div>
          <label>Priority</label>
          <select value={form.priority} onChange={(event) => updateField('priority', event.target.value)}>
            <option>Low</option>
            <option>Normal</option>
            <option>High</option>
            <option>Critical</option>
          </select>
        </div>

        <div>
          <label>Delivery Mode</label>
          <select value={form.deliveryMode} onChange={(event) => updateField('deliveryMode', event.target.value)}>
            <option>Banner</option>
            <option>Popup</option>
            <option>Inbox</option>
            <option>Banner + Inbox</option>
            <option>Popup + Inbox</option>
          </select>
        </div>

        <div>
          <label>Target Scope</label>
          <select value={form.targetScope} onChange={(event) => updateField('targetScope', event.target.value)}>
            <option>All Users</option>
            <option>Roles</option>
            <option>Specific Users</option>
            <option>Locations</option>
            <option>Roles + Locations</option>
          </select>
        </div>

        <div>
          <label>Display From</label>
          <input type="datetime-local" value={form.displayFrom} onChange={(event) => updateField('displayFrom', event.target.value)} />
        </div>

        <div>
          <label>Display Until</label>
          <input type="datetime-local" value={form.displayUntil} onChange={(event) => updateField('displayUntil', event.target.value)} />
        </div>

        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={form.requiresAcknowledgement}
            onChange={(event) => updateField('requiresAcknowledgement', event.target.checked)}
          />
          Requires acknowledgement
        </label>

        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={form.popupEnabled}
            onChange={(event) => updateField('popupEnabled', event.target.checked)}
          />
          Popup enabled
        </label>

        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={form.bannerEnabled}
            onChange={(event) => updateField('bannerEnabled', event.target.checked)}
          />
          Banner enabled
        </label>

        <div>
          <label>Auto Dismiss Seconds</label>
          <input
            type="number"
            min="0"
            value={form.autoDismissSeconds}
            onChange={(event) => updateField('autoDismissSeconds', event.target.value)}
            placeholder="0 / blank = manual"
          />
        </div>

        {showRoleTargets && (
          <div className="full-width-field notification-target-box">
            <label>Target Roles</label>
            {activeRoles.map((role) => (
              <label key={role.id} className="checkbox-label">
                <input
                  type="checkbox"
                  checked={form.targetRoleIds.includes(role.id)}
                  onChange={() => toggleArrayValue('targetRoleIds', role.id)}
                />
                {role.roleName}
              </label>
            ))}
          </div>
        )}

        {showUserTargets && (
          <div className="full-width-field notification-target-box">
            <label>Target Users</label>
            {activeUsers.map((user) => (
              <label key={user.id} className="checkbox-label">
                <input
                  type="checkbox"
                  checked={form.targetUserIds.includes(user.id)}
                  onChange={() => toggleArrayValue('targetUserIds', user.id)}
                />
                {user.fullName} ({user.username})
              </label>
            ))}
          </div>
        )}

        {showLocationTargets && (
          <div className="full-width-field notification-target-box">
            <label>Target Locations</label>
            {activeLocations.map((location) => (
              <label key={location.id} className="checkbox-label">
                <input
                  type="checkbox"
                  checked={form.targetLocationCodes.includes(location.locationCode)}
                  onChange={() => toggleArrayValue('targetLocationCodes', location.locationCode)}
                />
                {location.locationName} ({location.locationCode})
              </label>
            ))}
            <small>
              Location targeting uses active user asset assignments where assigned_to matches username or full name.
            </small>
          </div>
        )}

        <div className="form-actions">
          <button type="submit" disabled={loading}>
            {editId ? 'Update Notification' : 'Create Draft'}
          </button>
          <button type="button" onClick={resetForm} disabled={loading}>
            Reset
          </button>
        </div>
      </form>

      <div className="section-title">
        <h3>Notifications</h3>
        <p>Draft, scheduled, published, and inactive circulars.</p>
      </div>

      <div className="filter-panel">
        <div>
          <label>Status</label>
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
            <option value="ALL">All</option>
            <option>Draft</option>
            <option>Scheduled</option>
            <option>Published</option>
            <option>Deactivated</option>
            <option>Expired</option>
          </select>
        </div>
        <div className="filter-actions">
          <button type="button" onClick={() => loadNotifications()} disabled={loading}>
            Refresh
          </button>
        </div>
      </div>

      <table>
        <thead>
          <tr>
            <th>No.</th>
            <th>Title</th>
            <th>Type / Priority</th>
            <th>Target</th>
            <th>Window</th>
            <th>Status</th>
            <th>Delivery</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {notifications.length === 0 ? (
            <tr>
              <td colSpan="8" className="empty-table">No system notifications found.</td>
            </tr>
          ) : (
            notifications.map((notification) => (
              <tr key={notification.id}>
                <td>{notification.notificationNumber}</td>
                <td>
                  <strong>{notification.title}</strong>
                  <div className="muted-table-text">{notification.createdByDisplay || '-'}</div>
                </td>
                <td>{notification.notificationType} / {notification.priority}</td>
                <td>{notification.targetScope}</td>
                <td>
                  {notification.displayFrom ? new Date(notification.displayFrom).toLocaleString() : 'Immediate'}
                  <div className="muted-table-text">
                    Until: {notification.displayUntil ? new Date(notification.displayUntil).toLocaleString() : 'No end'}
                  </div>
                </td>
                <td><span className={`status-badge ${notification.status.toLowerCase()}`}>{notification.status}</span></td>
                <td>
                  {notification.deliveryCount} delivered
                  <div className="muted-table-text">
                    Seen {notification.seenCount} | Ack {notification.acknowledgedCount}
                  </div>
                </td>
                <td>
                  <div className="table-actions">
                    <button type="button" onClick={() => handleEdit(notification)} disabled={loading || notification.status === 'Published'}>
                      Edit
                    </button>
                    <button type="button" onClick={() => handlePublish(notification)} disabled={loading || ['Published', 'Deactivated'].includes(notification.status)}>
                      Publish
                    </button>
                    <button type="button" onClick={() => handleDeactivate(notification)} disabled={loading || notification.status === 'Deactivated'}>
                      Deactivate
                    </button>
                    <button type="button" onClick={() => loadDeliveryReport(notification)} disabled={loading}>
                      Delivery
                    </button>
                  </div>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>

      {selectedNotification && (
        <div className="info-box">
          <div className="section-title compact-section-title">
            <h3>Delivery Report - {selectedNotification.notificationNumber}</h3>
            <p>{selectedNotification.title}</p>
          </div>
          <table>
            <thead>
              <tr>
                <th>User</th>
                <th>Status</th>
                <th>Delivered</th>
                <th>Seen</th>
                <th>Dismissed</th>
                <th>Acknowledged</th>
                <th>Remarks</th>
              </tr>
            </thead>
            <tbody>
              {deliveryRows.length === 0 ? (
                <tr>
                  <td colSpan="7" className="empty-table">No delivery receipts found.</td>
                </tr>
              ) : (
                deliveryRows.map((receipt) => (
                  <tr key={receipt.id}>
                    <td>{receipt.username || receipt.user_id}</td>
                    <td>{receipt.status}</td>
                    <td>{receipt.delivered_at ? new Date(receipt.delivered_at).toLocaleString() : '-'}</td>
                    <td>{receipt.first_seen_at ? new Date(receipt.first_seen_at).toLocaleString() : '-'}</td>
                    <td>{receipt.dismissed_at ? new Date(receipt.dismissed_at).toLocaleString() : '-'}</td>
                    <td>{receipt.acknowledged_at ? new Date(receipt.acknowledged_at).toLocaleString() : '-'}</td>
                    <td>{receipt.acknowledgement_remarks || '-'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

export default SystemNotificationMaster
