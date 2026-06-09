import {
	CalendarDays,
	ClipboardList,
	DoorOpen,
	Plus,
	Users,
} from "lucide-react";

export function BottomNav({ user, route, go }) {
	const items =
		user.role === "admin"
			? [
					["/schedule", CalendarDays, "Расписание"],
					["/new-booking", Plus, "Новая"],
					["/admin/bookings", ClipboardList, "Все брони"],
					["/admin/halls", DoorOpen, "Помещения"],
					["/admin/users", Users, "Пользователи"],
				]
			: [
					["/schedule", CalendarDays, "Расписание"],
					["/new-booking", Plus, "Новая"],
					["/my-bookings", ClipboardList, "Мои заявки"],
				];
	return (
		<nav className="bottom-nav">
			{items.map(([path, Icon, label]) => (
				<button
					key={path}
					className={route.startsWith(path) ? "active" : ""}
					onClick={() => go(path)}
				>
					<Icon size={20} />
					<span>{label}</span>
				</button>
			))}
		</nav>
	);
}
