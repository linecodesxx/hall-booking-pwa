import {
	dayEndHour,
	dayStartHour,
	hourRows,
	niceDate,
	timeToMinutes,
} from "../utils";

function cellBookings(hall, hour) {
	return (hall.bookings || []).filter((b) => {
		const start = timeToMinutes(b.start_time);
		const end = timeToMinutes(b.end_time);
		const cellStart = hour * 60;
		const cellEnd = (hour + 1) * 60;
		return start < cellEnd && end > cellStart;
	});
}

export function CalendarGrid({ halls, date, go, onCellClick, onBookingClick }) {
	const items = halls || [];
	return (
		<section className="calendar-card card">
			<div className="calendar-title">
				<div>
					<h2>Сетка бронирований</h2>
					<p>
						{niceDate(date)} · {dayStartHour}:00-{dayEndHour}:00
					</p>
				</div>
				<span className="badge free">Свободное место можно бронировать</span>
			</div>
			<div
				className="calendar-scroll"
				aria-label="Календарная сетка бронирований"
			>
				<div
					className="calendar-grid"
					style={{ "--hall-count": items.length || 1 }}
				>
					<div className="calendar-corner">Время</div>
					{items.map((hall) => (
						<button
							className="calendar-hall"
							key={hall.id}
							onClick={() => go(`/new-booking?hall_id=${hall.id}&date=${date}`)}
						>
							<strong>
								<span
									className="hall-dot"
									style={{ backgroundColor: hall.color || "#2563eb" }}
								></span>
								{hall.name}
							</strong>
							<span>{hall.description}</span>
						</button>
					))}
					<div className="time-column">
						{hourRows.map((hour) => (
							<div className="time-row" key={hour}>
								{String(hour).padStart(2, "0")}:00
							</div>
						))}
					</div>
					{items.map((hall) => (
						<div className="hall-column" key={hall.id}>
							{hourRows.slice(0, -1).map((hour) => (
								<button
									className="hour-cell"
									key={hour}
									onClick={() => onCellClick(hall, hour, cellBookings(hall, hour))}
									aria-label={`${hall.name}, ${String(hour).padStart(2, "0")}:00`}
								></button>
							))}
							{(hall.bookings || []).map((booking) => {
								const topHours =
									Math.max(
										0,
										timeToMinutes(booking.start_time) - dayStartHour * 60,
									) / 60;
								const heightHours =
									(timeToMinutes(booking.end_time) -
										timeToMinutes(booking.start_time)) /
									60;
								return (
									<button
										className={`booking-block ${booking.status} ${booking.temporal_status}`}
										key={booking.id}
										style={{
											top: `calc(${topHours} * var(--row-height))`,
											height: `calc(${heightHours} * var(--row-height))`,
											"--booking-color": hall.color || "#2563eb",
										}}
										title={`${booking.start_time}-${booking.end_time} · ${booking.title}`}
										onClick={(e) => {
											e.stopPropagation();
											onBookingClick(booking);
										}}
									>
										<strong>
											{booking.start_time}-{booking.end_time}
										</strong>
										<span>
											{booking.title || "Занято"}
										</span>
									</button>
								);
							})}
						</div>
					))}
				</div>
			</div>
		</section>
	);
}
