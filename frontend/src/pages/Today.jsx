import { CalendarDays, Clock, DoorOpen, FileText, ListChecks } from "lucide-react";
import { addDays, niceDate, shortDate, todayISO } from "../utils";
import { useRangeSchedule, useSchedule } from "../hooks/useSchedule";
import { useBookings } from "../hooks/useBookings";

function greeting() {
	const hour = new Date().getHours();
	if (hour < 6) return "Доброй ночи";
	if (hour < 12) return "Доброе утро";
	if (hour < 18) return "Добрый день";
	return "Добрый вечер";
}

function dayName(date) {
	return new Intl.DateTimeFormat("ru-RU", { weekday: "long" }).format(
		new Date(`${date}T12:00:00`),
	);
}

function formatDateHeading(date) {
	const d = new Date(`${date}T12:00:00`);
	const today = todayISO();
	const tomorrow = addDays(today, 1);
	if (date === today) return "Сегодня";
	if (date === tomorrow) return "Завтра";
	return new Intl.DateTimeFormat("ru-RU", {
		day: "numeric",
		month: "long",
		weekday: "short",
	}).format(d);
}

export function Today({ go, user }) {
	const today = todayISO();
	const nextDays = Array.from({ length: 7 }, (_, i) => addDays(today, i));
	const { data: halls = [], isLoading } = useSchedule(today);
	const { data: range = [] } = useRangeSchedule(nextDays);
	const { data: pendingList = [] } =
		user.role === "admin"
			? useBookings("pending")
			: { data: [] };

	if (isLoading) {
		return (
			<div className="today-grid">
				<div className="card skeleton-card" style={{ height: 120 }} />
				<div className="card skeleton-card" style={{ height: 160 }} />
				<div className="card skeleton-card" style={{ height: 200 }} />
			</div>
		);
	}

	const allBookings = halls.flatMap((h) => h.bookings || []);
	const ongoing = allBookings.filter((b) => b.temporal_status === "ongoing");

	const todayUpcoming = allBookings
		.filter((b) => b.temporal_status === "upcoming")
		.sort((a, b) => (a.start_time > b.start_time ? 1 : -1));

	const futureBookings = (range || [])
		.flatMap((d) =>
			(d?.halls || []).flatMap((hall) =>
				(hall?.bookings || [])
					.filter((b) => b.date !== today && b.status === "approved" && b.temporal_status === "upcoming")
					.map((b) => ({ ...b, hall_name: hall.name, hall_color: hall.color })),
			),
		)
		.sort((a, b) => (a.date + a.start_time > b.date + b.start_time ? 1 : -1))
		.slice(0, 30);

	const freeHalls = halls.filter((h) => {
		const approved = (h.bookings || []).filter(
			(b) => b.status === "approved" && b.temporal_status !== "past",
		);
		return approved.length === 0;
	});

	const grouped = {};
	todayUpcoming.forEach((b) => {
		if (!grouped[today]) grouped[today] = [];
		grouped[today].push(b);
	});
	futureBookings.forEach((b) => {
		if (!grouped[b.date]) grouped[b.date] = [];
		grouped[b.date].push(b);
	});

	const dateGroups = Object.entries(grouped).sort(([a], [b]) => (a > b ? 1 : -1));
	const hasUpcoming = dateGroups.length > 0;

	return (
		<div className="today-grid">
			<section className="card today-hero">
				<div className="today-hero-text">
					<p className="today-greeting">{greeting()}, {user.name}</p>
					<h2>{niceDate(today)}</h2>
					<p className="today-dayname">{dayName(today)}</p>
				</div>
				{user.role === "admin" && pendingList.length > 0 && (
					<button className="today-pending-badge" onClick={() => go("/admin/bookings")}>
						<FileText size={18} />
						<span>{pendingList.length} ожидают</span>
					</button>
				)}
			</section>

			<section className="card today-stats">
				<div className="today-stat">
					<DoorOpen size={24} />
					<div>
						<strong>{halls.length}</strong>
						<span>Залы</span>
					</div>
				</div>
				<div className="today-stat">
					<FileText size={24} />
					<div>
						<strong>{allBookings.length}</strong>
						<span>Брони</span>
					</div>
				</div>
				<div className="today-stat">
					<Clock size={24} />
					<div>
						<strong>{ongoing.length}</strong>
						<span>Сейчас</span>
					</div>
				</div>
				<div className="today-stat today-stat-free">
					<ListChecks size={24} />
					<div>
						<strong>{freeHalls.length}</strong>
						<span>Свободно</span>
					</div>
				</div>
			</section>

			<section className="card today-section-ongoing">
				<h3 className="today-section-title">
					<Clock size={20} /> Сейчас идёт
				</h3>
				<div className="today-booking-list">
					{ongoing.length > 0 ? ongoing.map((b) => {
						const hall = halls.find((h) => h.id === b.hall_id);
						return (
							<button
								key={b.id}
								className="today-booking-item ongoing"
								onClick={() => go(`/schedule?booking=${b.id}`)}
							>
								<span
									className="hall-dot"
									style={{ backgroundColor: hall?.color || "#2563eb" }}
								/>
								<div>
									<strong>{b.title || "Занято"}</strong>
									<span className="today-booking-meta">
										{hall?.name} · {b.start_time}–{b.end_time}
									</span>
								</div>
							</button>
						);
					}) : (
						<div className="today-empty-small">
							<Clock size={24} />
							<p>Сейчас ничего не забронировано</p>
						</div>
					)}
				</div>
			</section>

			<section className="card today-section-upcoming">
				<h3 className="today-section-title">
					<CalendarDays size={20} /> Ближайшие брони
				</h3>
				{hasUpcoming ? (
					<div className="today-booking-list">
						{dateGroups.map(([date, bookings]) => (
							<div key={date} className="today-date-group">
								<h4 className="today-date-heading">{formatDateHeading(date)}</h4>
								{bookings.map((b) => {
									const hall = halls.find((h) => h.id === b.hall_id);
									const hName = hall?.name || b.hall_name;
									const hColor = hall?.color || b.hall_color || "#2563eb";
									return (
										<button
											key={b.id}
											className="today-booking-item"
											onClick={() => go(`/schedule?booking=${b.id}`)}
										>
											<span
												className="hall-dot"
												style={{ backgroundColor: hColor }}
											/>
											<div>
												<strong>
													{b.start_time} – {b.title || "Занято"}
												</strong>
												<span className="today-booking-meta">{hName}</span>
											</div>
										</button>
									);
								})}
							</div>
						))}
					</div>
				) : (
					<div className="today-empty-small">
						<CalendarDays size={24} />
						<p>На ближайшие дни броней нет</p>
					</div>
				)}
			</section>
		</div>
	);
}