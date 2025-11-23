import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../App';

const AdminPanel = ({ onBack }) => {
    const { token } = useContext(AuthContext);
    const [tab, setTab] = useState('users'); // users, permissions
    const [users, setUsers] = useState([]);
    const [documents, setDocuments] = useState([]);

    // User Form State
    const [newUser, setNewUser] = useState({ username: '', password: '', role: 'PJ' });
    const [editingUser, setEditingUser] = useState(null);

    // Permission State
    const [selectedUser, setSelectedUser] = useState(null);
    const [userPermissions, setUserPermissions] = useState([]);

    useEffect(() => {
        fetchUsers();
        fetchDocuments();
    }, []);

    useEffect(() => {
        if (selectedUser) {
            fetchUserPermissions(selectedUser);
        }
    }, [selectedUser]);

    const fetchUsers = async () => {
        const res = await fetch('/api/admin/users', { headers: { 'Authorization': `Bearer ${token}` } });
        if (res.ok) setUsers(await res.json());
    };

    const fetchDocuments = async () => {
        const res = await fetch('/api/admin/documents', { headers: { 'Authorization': `Bearer ${token}` } });
        if (res.ok) setDocuments(await res.json());
    };

    const fetchUserPermissions = async (userId) => {
        const res = await fetch(`/api/admin/permissions/${userId}`, { headers: { 'Authorization': `Bearer ${token}` } });
        if (res.ok) setUserPermissions(await res.json());
    };

    const handleCreateUser = async (e) => {
        e.preventDefault();
        const res = await fetch('/api/admin/users', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify(newUser)
        });
        if (res.ok) {
            alert('User Created');
            setNewUser({ username: '', password: '', role: 'PJ' });
            fetchUsers();
        } else {
            alert('Error creating user');
        }
    };

    const handleUpdateUser = async (e) => {
        e.preventDefault();
        const res = await fetch(`/api/admin/users/${editingUser.id}`, {
            method: 'PUT',
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify(editingUser)
        });
        if (res.ok) {
            alert('User Updated');
            setEditingUser(null);
            fetchUsers();
        } else {
            alert('Error updating user');
        }
    };

    const handleDeleteUser = async (id) => {
        if (!window.confirm('Are you sure you want to delete this user?')) return;
        const res = await fetch(`/api/admin/users/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
            alert('User Deleted');
            fetchUsers();
        } else {
            alert('Error deleting user');
        }
    };

    const togglePermission = async (docId, currentStatus) => {
        if (!selectedUser) return;
        const res = await fetch('/api/admin/permissions', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: selectedUser, documentId: docId, grant: !currentStatus })
        });
        if (res.ok) {
            fetchUserPermissions(selectedUser);
        }
    };

    return (
        <div className="hologram-box" style={{ height: '100%', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h2 className="hologram-text">ADMINISTRATION</h2>
                <button className="sw-btn danger" onClick={onBack}>BACK</button>
            </div>

            <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
                <button className={`sw-btn ${tab === 'users' ? 'active' : ''}`} onClick={() => setTab('users')}>USERS</button>
                <button className={`sw-btn ${tab === 'permissions' ? 'active' : ''}`} onClick={() => setTab('permissions')}>PERMISSIONS</button>
            </div>

            {tab === 'users' && (
                <div>
                    <div className="hologram-box" style={{ marginBottom: '20px' }}>
                        <h4>{editingUser ? 'EDIT USER' : 'CREATE USER'}</h4>
                        <form onSubmit={editingUser ? handleUpdateUser : handleCreateUser}>
                            <input
                                className="sw-input"
                                placeholder="Username"
                                value={editingUser ? editingUser.username : newUser.username}
                                onChange={e => editingUser ? setEditingUser({ ...editingUser, username: e.target.value }) : setNewUser({ ...newUser, username: e.target.value })}
                                disabled={!!editingUser} // Don't change username on edit for simplicity
                            />
                            <input
                                className="sw-input"
                                placeholder="Password (leave blank to keep current if editing)"
                                type="password"
                                value={editingUser ? (editingUser.password || '') : newUser.password}
                                onChange={e => editingUser ? setEditingUser({ ...editingUser, password: e.target.value }) : setNewUser({ ...newUser, password: e.target.value })}
                            />
                            <select
                                className="sw-input"
                                value={editingUser ? editingUser.role : newUser.role}
                                onChange={e => editingUser ? setEditingUser({ ...editingUser, role: e.target.value }) : setNewUser({ ...newUser, role: e.target.value })}
                                style={{ background: 'black' }}
                            >
                                <option value="PJ">PJ</option>
                                <option value="PNJ">PNJ</option>
                                <option value="ADMIN">ADMIN</option>
                                <option value="OPERATOR">OPERATOR</option>
                            </select>
                            <button className="sw-btn" type="submit">{editingUser ? 'UPDATE' : 'CREATE'}</button>
                            {editingUser && <button className="sw-btn danger" type="button" onClick={() => setEditingUser(null)} style={{ marginLeft: '10px' }}>CANCEL</button>}
                        </form>
                    </div>

                    <table style={{ width: '100%', borderCollapse: 'collapse', color: 'var(--sw-blue)' }}>
                        <thead>
                            <tr style={{ borderBottom: '1px solid var(--sw-blue)' }}>
                                <th style={{ textAlign: 'left' }}>ID</th>
                                <th style={{ textAlign: 'left' }}>USER</th>
                                <th style={{ textAlign: 'left' }}>ROLE</th>
                                <th style={{ textAlign: 'right' }}>ACTION</th>
                            </tr>
                        </thead>
                        <tbody>
                            {users.map(u => (
                                <tr key={u.id} style={{ borderBottom: '1px solid #333' }}>
                                    <td>{u.id}</td>
                                    <td>{u.username}</td>
                                    <td>{u.role}</td>
                                    <td style={{ textAlign: 'right' }}>
                                        {u.role !== 'OPERATOR' && (
                                            <>
                                                <button className="sw-btn" style={{ padding: '2px 5px', fontSize: '0.8rem', marginRight: '5px' }} onClick={() => setEditingUser(u)}>EDIT</button>
                                                <button className="sw-btn danger" style={{ padding: '2px 5px', fontSize: '0.8rem' }} onClick={() => handleDeleteUser(u.id)}>DELETE</button>
                                            </>
                                        )}
                                        {u.role === 'OPERATOR' && (
                                            <span style={{ fontSize: '0.8rem', color: 'var(--sw-yellow)' }}>PROTECTED</span>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {tab === 'permissions' && (
                <div>
                    <div style={{ marginBottom: '20px' }}>
                        <label>SELECT USER: </label>
                        <select
                            className="sw-input"
                            style={{ background: 'black' }}
                            onChange={e => setSelectedUser(e.target.value)}
                            value={selectedUser || ''}
                        >
                            <option value="">-- Select User --</option>
                            {users.map(u => <option key={u.id} value={u.id}>{u.username} ({u.role})</option>)}
                        </select>
                    </div>

                    {selectedUser && (
                        <div>
                            <h4>ACCESS RIGHTS</h4>
                            {documents.map(d => {
                                const hasAccess = userPermissions.includes(d.id);
                                return (
                                    <div key={d.id} style={{ display: 'flex', alignItems: 'center', marginBottom: '5px', borderBottom: '1px solid #333', padding: '5px' }}>
                                        <input
                                            type="checkbox"
                                            checked={hasAccess}
                                            onChange={() => togglePermission(d.id, hasAccess)}
                                            style={{ marginRight: '10px', transform: 'scale(1.5)' }}
                                        />
                                        <div style={{ flex: 1 }}>
                                            <div style={{ color: 'var(--sw-yellow)' }}>{d.filename}</div>
                                            <div style={{ fontSize: '0.8rem', color: '#666' }}>{d.type} | Owner: {d.owner_id}</div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default AdminPanel;
