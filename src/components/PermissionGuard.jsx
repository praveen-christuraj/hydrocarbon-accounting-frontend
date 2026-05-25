import { Link } from 'react-router-dom'

function PermissionGuard({
  loggedInUser,
  requiredPermission,
  requiredPermissions,
  children,
  fallbackTitle = 'Access Denied',
  fallbackMessage = 'You do not have permission to access this page.',
}) {
  const currentUser = loggedInUser

  const userHasPermission = (permissionName) => {
    // ✅ Admin bypass: if user has Admin role, allow everything in UI
    const roles = currentUser?.roles || currentUser?.user_roles || []
    const isAdmin = roles.some((r) => {
      const roleName =
        r?.role_name || r?.roleName || r?.role?.role_name || r?.role?.roleName
      return String(roleName || '').toLowerCase() === 'admin'
    })

    if (isAdmin) return true

    if (!permissionName) {
      return true
    }

    if (!loggedInUser || !loggedInUser.permissions) {
      return false
    }

    return loggedInUser.permissions.some((permission) => {
      return permission.permissionName === permissionName
    })
  }

  const permissionList =
    requiredPermissions && requiredPermissions.length > 0
      ? requiredPermissions
      : requiredPermission
        ? [requiredPermission]
        : []

  const hasAllPermissions = permissionList.every((permissionName) => {
    return userHasPermission(permissionName)
  })

  if (!hasAllPermissions) {
    return (
      <div>
        <div className="page-title">
          <div>
            <h2>{fallbackTitle}</h2>
            <p>{fallbackMessage}</p>
          </div>
        </div>

        <div className="info-box">
          Required permission
          {permissionList.length > 1 ? 's' : ''}:{' '}
          {permissionList.join(', ')}
        </div>

        <div className="form-actions">
          <Link to="/">
            <button type="button">Back to Dashboard</button>
          </Link>
        </div>
      </div>
    )
  }

  return children
}

export default PermissionGuard
