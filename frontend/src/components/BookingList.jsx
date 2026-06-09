import { ClipboardList } from "lucide-react";
import { labels, niceDate } from "../utils";

export function BookingList({ bookings, onCancel, adminActions }) {
	const items = bookings || [];
	if (!items.length)
		return (
			<article className="card empty">
				<ClipboardList size={40} strokeWidth={1.5} />
				Заявок пока нет
			</article>
		);
	return items.map((booking) => (
		<article className="card booking-card" key={booking.id}>
			<div className="card-head">
				<div>
					<h2>{booking.title}</h2>
					<p>{booking.hall_name}</p>
				</div>
				<span className={`badge ${booking.status}`}>
					{labels[booking.status]}
				</span>
			</div>
			<p>
				<strong>
					{niceDate(booking.date)}, {booking.start_time}-{booking.end_time}
				</strong>
			</p>
			{booking.user_name && <p>Заявитель: {booking.user_name}</p>}
			{booking.comment && (
				<p className="soft-box">Комментарий: {booking.comment}</p>
			)}
			{booking.admin_comment && (
				<p className="soft-box">
					Комментарий администратора: {booking.admin_comment}
				</p>
			)}
			{adminActions
				? adminActions(booking)
				: !["cancelled", "rejected"].includes(booking.status) && (
						<button className="secondary" onClick={() => onCancel(booking.id)}>
							Отменить
						</button>
					)}
		</article>
	));
}
