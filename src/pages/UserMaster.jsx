import { useEffect, useState } from 'react'
import { createUser, deleteUser, getUsers, updateUser } from '../api/userApi'

function UserMaster({ loggedInUser }) {
  const emptyUser = {
    fullName: '',
    username: '',
    email: '',
    phone: '',
    department: '',
    designation: '',
    password: '',
    status: 'Active',
  }

  const [users, setUsers] = useState([])
  const [user, setUser] = useState(emptyUser)
  const [editId, setEditId] = useState(null)
  const [loading, setLoading] = useState(false)

  const isAdminBootstrap =
    String(loggedInUser?.username || '').toLowerCase() === 'admin'

  const hasPermission = (permissionName) => {
    if (isAdminBootstrap) return true
    if (!loggedInUser || !Array.isArray(loggedInUser.permissions)) return false
    return loggedInUser.permissions.some(
      (p) => p.permissionName === permissionName
    )
  }

  const canManageUser = hasPermission('Manage User')

  const reloadUsers = async () => {
    try {
      const data = await getUsers()
      setUsers(data)
    } catch (error) {
      alert(error.message)
      setUsers([])
    }
  }

  useEffect(() => {
    reloadUsers()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleChange = (e) => {
    setUser({ ...user, [e.target.name]: e.target.value })
  }

  const validateUser = () => {
    if (user.fullName.trim() === '') return alert('Full Name is required'), false
    if (user.username.trim() === '') return alert('Username is required'), false
    if (user.email.trim() === '') return alert('Email is required'), false

    if (editId === null && user.password.trim() === '')
      return alert('Password is required for new user'), false

    const usernameAlreadyExists = users.some((item) => {
      return (
        item.username.toLowerCase() === user.username.toLowerCase() &&
        item.id !== editId
      )
    })

    if (usernameAlreadyExists)
      return alert('Username already exists. Please choose another username.'), false

    return true
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!canManageUser) {
      alert('You do not have permission to manage users.')
      return
    }

    if (!validateUser()) return

    try {
      setLoading(true)

      if (editId === null) {
        await createUser(user)
        alert('User created successfully')
      } else {
        await updateUser(editId, user)
        alert('User updated successfully')
      }

      await reloadUsers()
      setUser(emptyUser)
      setEditId(null)
    } catch (error) {
      alert(error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = (u) => {
    setUser({
      fullName: u.fullName,
      username: u.username,
      email: u.email,
      phone: u.phone || '',
      department: u.department || '',
      designation: u.designation || '',
      password: '',
      status: u.status,
    })
    setEditId(u.id)
  }

  const handleDelete = async (id) => {
    if (!canManageUser) {
      alert('You do not have permission to manage users.')
      return
    }

    const ok = window.confirm('Are you sure you want to delete this user?')
    if (!ok) return

    try {
      setLoading(true)
      await deleteUser(id)
      await reloadUsers()
      alert('User deleted successfully')

      if (editId === id) {
        setUser(emptyUser)
        setEditId(null)
      }
    } catch (error) {
      alert(error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleCancelEdit = () => {
    setUser(emptyUser)
    setEditId(null)
  }

  return (
    <div>
      <div className="page-title">
        <div>
          <h2>User Master</h2>
          <p>Create, update, and manage application users.</p>
        </div>

        <span className="record-count">{users.length} Users</span>
      </div>

      {!canManageUser && (
        <div className="info-box">
          You are in view-only mode. Admin can manage users.
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div>
          <label>Full Name</label>
          <input
            name="fullName"
            type="text"
            value={user.fullName}
            onChange={handleChange}
            placeholder="Enter full name"
          />
        </div>

        <div>
          <label>Username</label>
          <input
            name="username"
            type="text"
            value={user.username}
            onChange={handleChange}
            placeholder="Enter username"
            disabled={editId !== null} // safer: don't allow username change
          />
        </div>

        <div>
          <label>Email</label>
          <input
            name="email"
            type="email"
            value={user.email}
            onChange={handleChange}
            placeholder="Enter email address"
          />
        </div>

        <div>
          <label>Phone</label>
          <input
            name="phone"
            type="text"
            value={user.phone}
            onChange={handleChange}
            placeholder="Enter phone number"
          />
        </div>

        <div>
          <label>Department</label>
          <input
            name="department"
            type="text"
            value={user.department}
            onChange={handleChange}
            placeholder="Enter department"
          />
        </div>

        <div>
          <label>Designation</label>
          <input
            name="designation"
            type="text"
            value={user.designation}
            onChange={handleChange}
            placeholder="Enter designation"
          />
        </div>

        <div>
          <label>Password {editId !== null ? '(leave blank to keep same)' : ''}</label>
          <input
            name="password"
            type="password"
            value={user.password}
            onChange={handleChange}
            placeholder="Enter password"
          />
        </div>

        <div>
          <label>Status</label>
          <select name="status" value={user.status} onChange={handleChange}>
            <option>Active</option>
            <option>Inactive</option>
            <option>Blocked</option>
          </select>
        </div>

        <div className="form-actions">
          <button type="submit" disabled={loading || !canManageUser}>
            {loading
              ? 'Please wait...'
              : editId === null
                ? 'Save User'
                : 'Update User'}
          </button>

          {editId !== null && (
            <button type="button" onClick={handleCancelEdit} disabled={loading}>
              Cancel Edit
            </button>
          )}
        </div>
      </form>

      <div className="section-title">
        <h3>Saved Users</h3>
        <p>Users are loaded from the live database.</p>
      </div>

      <table>
        <thead>
          <tr>
            <th>Full Name</th>
            <th>Username</th>
            <th>Email</th>
            <th>Department</th>
            <th>Designation</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>

        <tbody>
          {users.length === 0 ? (
            <tr>
              <td colSpan="7" className="empty-table">
                No users found.
              </td>
            </tr>
          ) : (
            users.map((item) => (
              <tr key={item.id}>
                <td>{item.fullName}</td>
                <td>{item.username}</td>
                <td>{item.email}</td>
                <td>{item.department}</td>
                <td>{item.designation}</td>
                <td>
                  <span className={`status-badge ${item.status.toLowerCase()}`}>
                    {item.status}
                  </span>
                </td>
                <td>
                  <button
                    type="button"
                    onClick={() => handleEdit(item)}
                    disabled={!canManageUser || loading}
                  >
                    Edit
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDelete(item.id)}
                    disabled={!canManageUser || loading}
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}

export default UserMaster