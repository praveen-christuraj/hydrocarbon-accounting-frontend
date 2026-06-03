import { useState } from 'react'
import {
  adminResetUserPassword,
  changeOwnPassword,
  disableOwn2FA,
  regenerate2FABackupCodes,
  start2FASetup,
  verify2FASetup,
} from '../api/securityApi'

function ProfileSecurity({ loggedInUser, users = [] }) {
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  })
  const [setupData, setSetupData] = useState(null)
  const [setupCode, setSetupCode] = useState('')
  const [backupCodes, setBackupCodes] = useState([])
  const [disableForm, setDisableForm] = useState({ currentPassword: '', code: '' })
  const [adminForm, setAdminForm] = useState({
    userId: '',
    newPassword: '',
    forcePasswordChange: true,
    reset2FA: false,
    remarks: '',
  })
  const [loading, setLoading] = useState(false)

  const hasPermission = (permissionName) => {
    return (loggedInUser?.permissions || []).some(
      (permission) => permission.permissionName === permissionName
    )
  }

  const security = loggedInUser?.security || {}

  const submitPasswordChange = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await changeOwnPassword(passwordForm)
      alert(res.message || 'Password changed successfully')
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' })
    } catch (error) {
      alert(error.message)
    } finally {
      setLoading(false)
    }
  }

  const begin2FASetup = async () => {
    setLoading(true)
    try {
      const data = await start2FASetup()
      setSetupData(data)
      setSetupCode('')
      setBackupCodes([])
    } catch (error) {
      alert(error.message)
    } finally {
      setLoading(false)
    }
  }

  const submit2FASetup = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const data = await verify2FASetup(setupCode)
      setBackupCodes(data.backup_codes || [])
      setSetupData(null)
      setSetupCode('')
      alert(data.message || '2FA enabled')
    } catch (error) {
      alert(error.message)
    } finally {
      setLoading(false)
    }
  }

  const regenerateCodes = async () => {
    if (!window.confirm('Regenerate backup codes? Old codes will stop working.')) return
    setLoading(true)
    try {
      const data = await regenerate2FABackupCodes()
      setBackupCodes(data.backup_codes || [])
      alert(data.message || 'Backup codes regenerated')
    } catch (error) {
      alert(error.message)
    } finally {
      setLoading(false)
    }
  }

  const submitDisable2FA = async (e) => {
    e.preventDefault()
    if (!window.confirm('Disable 2FA for your account?')) return
    setLoading(true)
    try {
      const data = await disableOwn2FA(disableForm.currentPassword, disableForm.code)
      alert(data.message || '2FA disabled')
      setDisableForm({ currentPassword: '', code: '' })
    } catch (error) {
      alert(error.message)
    } finally {
      setLoading(false)
    }
  }

  const submitAdminReset = async (e) => {
    e.preventDefault()
    if (!adminForm.userId) {
      alert('Select a user')
      return
    }
    if (!window.confirm('Reset password for the selected user?')) return
    setLoading(true)
    try {
      const data = await adminResetUserPassword(Number(adminForm.userId), adminForm)
      alert(data.message || 'Password reset successfully')
      setAdminForm({
        userId: '',
        newPassword: '',
        forcePasswordChange: true,
        reset2FA: false,
        remarks: '',
      })
    } catch (error) {
      alert(error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <div className="page-title">
        <div>
          <h2>Profile & Security</h2>
          <p>Manage your password, 2FA, and account recovery controls.</p>
        </div>
      </div>

      <div className="info-box">
        User: {loggedInUser?.fullName} ({loggedInUser?.username}) | 2FA:{' '}
        {security.totp_enabled ? 'Enabled' : 'Disabled'}
      </div>

      <div className="section-title">
        <h3>Change Password</h3>
      </div>
      <form onSubmit={submitPasswordChange}>
        <div>
          <label>Current Password</label>
          <input
            type="password"
            value={passwordForm.currentPassword}
            onChange={(e) =>
              setPasswordForm({ ...passwordForm, currentPassword: e.target.value })
            }
          />
        </div>
        <div>
          <label>New Password</label>
          <input
            type="password"
            value={passwordForm.newPassword}
            onChange={(e) =>
              setPasswordForm({ ...passwordForm, newPassword: e.target.value })
            }
          />
        </div>
        <div>
          <label>Confirm Password</label>
          <input
            type="password"
            value={passwordForm.confirmPassword}
            onChange={(e) =>
              setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })
            }
          />
        </div>
        <div className="form-actions">
          <button type="submit" disabled={loading}>
            Change Password
          </button>
        </div>
      </form>

      <div className="section-title">
        <h3>Two-Factor Authentication</h3>
      </div>
      {!security.totp_enabled && (
        <div className="form-actions">
          <button type="button" onClick={begin2FASetup} disabled={loading}>
            Start 2FA Setup
          </button>
        </div>
      )}

      {setupData && (
        <form onSubmit={submit2FASetup}>
          <div className="full-width-field">
            <label>Scan QR Code</label>
            <img src={setupData.qr_code_data_url} alt="2FA QR Code" width="220" />
            <small>Manual code: {setupData.secret}</small>
          </div>
          <div>
            <label>Authentication Code</label>
            <input
              value={setupCode}
              onChange={(e) => setSetupCode(e.target.value)}
              placeholder="6-digit code"
            />
          </div>
          <div className="form-actions">
            <button type="submit" disabled={loading}>
              Verify & Enable
            </button>
          </div>
        </form>
      )}

      {security.totp_enabled && (
        <>
          <div className="form-actions">
            <button type="button" onClick={regenerateCodes} disabled={loading}>
              Regenerate Backup Codes
            </button>
          </div>
          <form onSubmit={submitDisable2FA}>
            <div>
              <label>Current Password</label>
              <input
                type="password"
                value={disableForm.currentPassword}
                onChange={(e) =>
                  setDisableForm({ ...disableForm, currentPassword: e.target.value })
                }
              />
            </div>
            <div>
              <label>2FA Code or Backup Code</label>
              <input
                value={disableForm.code}
                onChange={(e) => setDisableForm({ ...disableForm, code: e.target.value })}
              />
            </div>
            <div className="form-actions">
              <button type="submit" disabled={loading}>
                Disable 2FA
              </button>
            </div>
          </form>
        </>
      )}

      {backupCodes.length > 0 && (
        <div className="info-box">
          <strong>Backup Codes</strong>
          <p>Store these now. They are shown only after generation.</p>
          <pre>{backupCodes.join('\n')}</pre>
        </div>
      )}

      {hasPermission('Reset User Password') && (
        <>
          <div className="section-title">
            <h3>Admin Password Reset</h3>
          </div>
          <form onSubmit={submitAdminReset}>
            <div>
              <label>User</label>
              <select
                value={adminForm.userId}
                onChange={(e) => setAdminForm({ ...adminForm, userId: e.target.value })}
              >
                <option value="">Select User</option>
                {users.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.fullName || user.full_name} ({user.username})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label>New Password</label>
              <input
                type="password"
                value={adminForm.newPassword}
                onChange={(e) =>
                  setAdminForm({ ...adminForm, newPassword: e.target.value })
                }
              />
            </div>
            <label>
              <input
                type="checkbox"
                checked={adminForm.forcePasswordChange}
                onChange={(e) =>
                  setAdminForm({ ...adminForm, forcePasswordChange: e.target.checked })
                }
              />{' '}
              Force password change on next login
            </label>
            {hasPermission('Reset User 2FA') && (
              <label>
                <input
                  type="checkbox"
                  checked={adminForm.reset2FA}
                  onChange={(e) => setAdminForm({ ...adminForm, reset2FA: e.target.checked })}
                />{' '}
                Reset 2FA
              </label>
            )}
            <div className="full-width-field">
              <label>Remarks</label>
              <textarea
                value={adminForm.remarks}
                onChange={(e) => setAdminForm({ ...adminForm, remarks: e.target.value })}
                rows="3"
              />
            </div>
            <div className="form-actions">
              <button type="submit" disabled={loading}>
                Reset Password
              </button>
            </div>
          </form>
        </>
      )}
    </div>
  )
}

export default ProfileSecurity
