const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000'

const AUTH_TOKEN_KEY = 'hydrocarbonAccessToken'
const TOKEN_STORAGE_KEYS = [
  AUTH_TOKEN_KEY,
  'hydrocarbon_access_token',
  'access_token',
  'accessToken',
]

const convertLoggedInUserFromApi = (data) => {
  const user = data.user

  return {
    id: user.id,
    fullName: user.full_name,
    username: user.username,
    email: user.email,
    phone: user.phone || '',
    department: user.department || '',
    designation: user.designation || '',
    status: user.status,
    security: user.security || {},
    role: user.role
      ? {
          id: user.role.id,
          roleName: user.role.role_name,
          description: user.role.description || '',
          status: user.role.status,
        }
      : null,
    permissions: (user.permissions || []).map((permission) => ({
      id: permission.id,
      permissionName: permission.permission_name,
      moduleName: permission.module_name,
      description: permission.description || '',
      status: permission.status,
    })),
  }
}

export const getStoredAccessToken = () => {
  for (const key of TOKEN_STORAGE_KEYS) {
    const token = localStorage.getItem(key)

    if (token && token.trim() !== '') {
      return token.trim()
    }
  }

  return ''
}

export const saveAccessToken = (token) => {
  clearAccessToken()
  localStorage.setItem(AUTH_TOKEN_KEY, token)
}

export const clearAccessToken = () => {
  TOKEN_STORAGE_KEYS.forEach((key) => {
    localStorage.removeItem(key)
  })
}

export const loginUser = async (username, password) => {
  const response = await fetch(`${API_BASE_URL}/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      username,
      password,
    }),
  })

  const data = await response.json()

  if (!response.ok) {
    throw new Error(data.detail || 'Login failed')
  }

  if (data.requires_2fa) {
    return {
      requires2FA: true,
      challengeId: data.challenge_id,
      userHint: data.user_hint || null,
    }
  }

  if (!data.access_token) {
    throw new Error('Login token missing from backend response')
  }

  saveAccessToken(data.access_token)

  return convertLoggedInUserFromApi(data)
}

export const verifyLogin2FA = async (challengeId, code) => {
  const response = await fetch(`${API_BASE_URL}/auth/2fa/verify`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      challenge_id: challengeId,
      code,
    }),
  })

  const data = await response.json()

  if (!response.ok) {
    throw new Error(data.detail || '2FA verification failed')
  }

  saveAccessToken(data.access_token)
  return convertLoggedInUserFromApi(data)
}

export const requestPasswordReset = async (username, reason = '', reset2FA = false) => {
  const response = await fetch(`${API_BASE_URL}/auth/forgot-password`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      username,
      reason,
      reset_2fa: Boolean(reset2FA),
    }),
  })

  const data = await response.json()

  if (!response.ok) {
    throw new Error(data.detail || 'Password reset request failed')
  }

  return data
}

export const getCurrentUser = async () => {
  const token = getStoredAccessToken()

  if (!token) {
    return null
  }

  const response = await fetch(`${API_BASE_URL}/auth/me`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })

  const data = await response.json()

  if (!response.ok) {
    clearAccessToken()
    throw new Error(data.detail || 'Session expired. Please login again.')
  }

  return convertLoggedInUserFromApi(data)
}

export const logoutUser = () => {
  clearAccessToken()
}
