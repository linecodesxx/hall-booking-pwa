import { useEffect, useState } from 'react';

export function AdminUsers({ request }) {
  const [users, setUsers] = useState([]);
  useEffect(() => { request('/api/users').then((data) => setUsers(data.users || [])).catch(() => {}); }, []);
  return (users || []).map((user) => <article className="card row-card" key={user.id}><div><h2>{user.name}</h2><p>{user.role === 'admin' ? 'Администратор' : 'Пользователь'}</p><p>Первый вход: {user.created_at}</p><p>Последний вход: {user.last_login_at}</p></div></article>);
}
