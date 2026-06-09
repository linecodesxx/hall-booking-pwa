import { api } from "../lib/api";
import { useEffect, useState } from "react";
import { Trash2 } from "lucide-react";
import { ListSkeleton } from "../components";

export function AdminUsers() {
	const [users, setUsers] = useState(null);
	const [deleting, setDeleting] = useState(null);

	useEffect(() => {
		api("/api/users")
			.then((data) => setUsers(data.users || []))
			.catch(() => setUsers([]));
	}, []);

	const handleDelete = async (user) => {
		if (!confirm(`Удалить пользователя "${user.name}"?`)) return;
		setDeleting(user.id);
		try {
			await api(`/api/users/${user.id}`, { method: "DELETE" });
			setUsers((prev) => prev.filter((u) => u.id !== user.id));
		} catch (e) {
			alert(e.message || "Не удалось удалить");
		} finally {
			setDeleting(null);
		}
	};

	if (users === null) return <ListSkeleton rows={4} />;
	return (
	<div className="container">
		{(users || []).map((user) => (
		<article className="card row-card" key={user.id}>
			<div>
				<h2>{user.name}</h2>
				<p>{user.role === "admin" ? "Администратор" : "Пользователь"}</p>
				<p>Первый вход: {user.created_at}</p>
				<p>Последний вход: {user.last_login_at}</p>
			</div>
			<button
				className="icon-button danger"
				onClick={() => handleDelete(user)}
				disabled={deleting === user.id}
				aria-label="Удалить"
			>
				<Trash2 size={18} />
			</button>
		</article>
		))}
	</div>
	)}
