import { useState } from 'react'
import { loginUser, requestPasswordReset, verifyLogin2FA } from '../api/authApi'

function LoginPage({ onLogin }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [twoFACode, setTwoFACode] = useState('')
  const [challenge, setChallenge] = useState(null)
  const [resetUsername, setResetUsername] = useState('')
  const [resetReason, setResetReason] = useState('')
  const [reset2FA, setReset2FA] = useState(false)
  const [showReset, setShowReset] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (username.trim() === '') {
      alert('Username is required')
      return
    }

    if (password.trim() === '') {
      alert('Password is required')
      return
    }

    try {
      setLoading(true)

      const loggedInUser = await loginUser(username, password)

      if (loggedInUser?.requires2FA) {
        setChallenge(loggedInUser)
        setTwoFACode('')
        return
      }

      onLogin(loggedInUser)
    } catch (error) {
      alert(error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleVerify2FA = async (e) => {
    e.preventDefault()
    if (!challenge?.challengeId) {
      alert('2FA challenge is missing. Please login again.')
      setChallenge(null)
      return
    }
    if (twoFACode.trim() === '') {
      alert('Authentication code is required')
      return
    }
    try {
      setLoading(true)
      const loggedInUser = await verifyLogin2FA(challenge.challengeId, twoFACode)
      onLogin(loggedInUser)
    } catch (error) {
      alert(error.message)
    } finally {
      setLoading(false)
    }
  }

  const handlePasswordResetRequest = async (e) => {
    e.preventDefault()
    const targetUsername = (resetUsername || username || '').trim()
    if (!targetUsername) {
      alert('Username is required')
      return
    }
    try {
      setLoading(true)
      const response = await requestPasswordReset(targetUsername, resetReason, reset2FA)
      alert(response.message || 'Password reset request submitted')
      setShowReset(false)
      setResetUsername('')
      setResetReason('')
      setReset2FA(false)
    } catch (error) {
      alert(error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <h1>Hydrocarbon Accounting System</h1>
        <p>Login to continue</p>

        {challenge ? (
          <form onSubmit={handleVerify2FA} className="login-form">
            <div className="info-box">
              Enter the authentication code for{' '}
              {challenge.userHint?.full_name || challenge.userHint?.username || username}.
            </div>

            <div>
              <label>Authentication Code</label>
              <input
                type="text"
                value={twoFACode}
                onChange={(e) => setTwoFACode(e.target.value)}
                placeholder="6-digit code or backup code"
                autoFocus
              />
            </div>

            <div className="form-actions">
              <button type="submit" disabled={loading}>
                {loading ? 'Verifying...' : 'Verify'}
              </button>
              <button type="button" onClick={() => setChallenge(null)} disabled={loading}>
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleSubmit} className="login-form">
          <div>
            <label>Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter username"
              autoFocus
            />
          </div>

          <div>
            <label>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
            />
          </div>

          <div className="form-actions">
            <button type="submit" disabled={loading}>
              {loading ? 'Logging in...' : 'Login'}
            </button>
          </div>
        </form>
        )}

        <div className="form-actions">
          <button type="button" onClick={() => setShowReset(!showReset)} disabled={loading}>
            Need Password Reset?
          </button>
        </div>

        {showReset && (
          <form onSubmit={handlePasswordResetRequest} className="login-form">
            <div>
              <label>Username</label>
              <input
                type="text"
                value={resetUsername}
                onChange={(e) => setResetUsername(e.target.value)}
                placeholder="Enter username"
              />
            </div>
            <div>
              <label>Reason</label>
              <textarea
                value={resetReason}
                onChange={(e) => setResetReason(e.target.value)}
                placeholder="Optional reason for administrator"
                rows="3"
              />
            </div>
            <label>
              <input
                type="checkbox"
                checked={reset2FA}
                onChange={(e) => setReset2FA(e.target.checked)}
              />{' '}
              Also request 2FA reset
            </label>
            <div className="form-actions">
              <button type="submit" disabled={loading}>
                Submit Request
              </button>
            </div>
          </form>
        )}

        <div className="info-box">
          Use your User Master username and password. Role and permissions are
          loaded automatically after login.
        </div>
      </div>
    </div>
  )
}

export default LoginPage
