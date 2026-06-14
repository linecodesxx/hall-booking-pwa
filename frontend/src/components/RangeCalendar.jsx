import { shortDate } from "../utils";

function WeekDayRow({ day, bookings, onDayClick, onDayBookings, onBookingClick }) {
	const dayName = new Intl.DateTimeFormat("ru-RU", { weekday: "short" }).format(
		new Date(`${day}T12:00:00`),
	);
	return (
		<div className="week-day-row">
			<button
				className="week-day-label"
				onClick={() => onDayBookings({ date: day, bookings })}
			>
				<span className="week-day-name">{dayName}</span>
				<span className="week-day-date">
					{new Date(`${day}T12:00:00`).getDate()}
				</span>
			</button>
			<div className="week-day-bookings" onClick={() => bookings.length === 0 && onDayClick(day)}>
				{bookings.length ? (
					bookings.map((booking) => (
						<button
							key={booking.id}
							className={`week-booking-item ${booking.temporal_status}`}
							onClick={(e) => {
								e.stopPropagation();
								onBookingClick(booking);
							}}
						>
							<span className="week-booking-time">
								{booking.start_time}
							</span>
							<span className="week-booking-title">
								{booking.title || "Занято"}
							</span>
							<span
								className="hall-dot"
								style={{
									backgroundColor: booking.hall_color || "#2563eb",
								}}
							/>
						</button>
					))
				) : (
					<button className="week-day-add" onClick={() => onDayClick(day)}>
						Добавить бронь
					</button>
				)}
			</div>
		</div>
	);
}

export function RangeCalendar({ mode, days, range, go, filter, user, onDayClick, onDayBookings, onBookingClick }) {
	const byDate = Object.fromEntries(
		range.map((item) => [item?.date, item?.halls || []]),
	);
	const dayList = days || [];
	const blanks =
		mode === "month"
			? Array.from({
					length: (new Date(`${dayList[0]}T12:00:00`).getDay() + 6) % 7,
				})
			: [];
	const monthName = dayList[0]
		? new Intl.DateTimeFormat("ru-RU", {
				month: "long",
				year: "numeric",
			}).format(new Date(`${dayList[0]}T12:00:00`))
		: "";
	if (mode === "week") {
		const rows = dayList.map((day) => {
			const bookings = (byDate[day] || [])
				.flatMap((hall) =>
					(hall?.bookings || []).map((booking) => ({
						...booking,
						hall_name: hall?.name,
						hall_id: hall?.id,
						hall_color: hall?.color,
					})),
				)
				.filter(
					(booking) =>
						filter === "all" ||
						(filter === "mine"
							? booking.user_id === user.id
							: booking.hall_id === Number(filter.replace("hall:", ""))),
				);
			return { day, bookings };
		});
		return (
			<section className="range-calendar card week-calendar">
				<div className="calendar-title">
					<div>
						<h2>Неделя</h2>
						<p>
							{shortDate(dayList[0])} - {shortDate(dayList[dayList.length - 1])}
						</p>
					</div>
				</div>
				<div className="week-grid">
					{rows.map(({ day, bookings }) => (
						<WeekDayRow
							key={day}
							day={day}
							bookings={bookings}
							onDayClick={onDayClick}
							onDayBookings={onDayBookings}
							onBookingClick={onBookingClick}
						/>
					))}
				</div>
			</section>
		);
	}
	return (
		<section className={`range-calendar card month-calendar`}>
			<div className="calendar-title">
				<div>
					<h2>{monthName}</h2>
					<p>
						{" "}
						{shortDate(dayList[0])} - {shortDate(dayList[dayList.length - 1])}
					</p>
				</div>
			</div>
			<div className="range-grid">
				{["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"].map((day) => (
					<div className="range-weekday" key={day}>
						{day}
					</div>
				))}
				{blanks.map((_, index) => (
					<div className="range-day blank" key={`blank-${index}`}></div>
				))}
				{dayList.map((day) => {
					const bookings = (byDate[day] || [])
						.flatMap((hall) =>
							(hall?.bookings || []).map((booking) => ({
								...booking,
								hall_name: hall?.name,
								hall_id: hall?.id,
								hall_color: hall?.color,
							})),
						)
						.filter(
							(booking) =>
								filter === "all" ||
								(filter === "mine"
									? booking.user_id === user.id
									: booking.hall_id === Number(filter.replace("hall:", ""))),
						);
					return (
						<div
							className="range-day"
							key={day}
							role="button"
							tabIndex={0}
							onClick={() => {
								if (bookings.length) {
									onDayBookings({ date: day, bookings });
								} else {
									onDayClick(day);
								}
							}}
							onKeyDown={(e) => {
								if (e.key === "Enter" || e.key === " ") {
									if (bookings.length) {
										onDayBookings({ date: day, bookings });
									} else {
										onDayClick(day);
									}
								}
							}}
						>
							<strong>{new Date(`${day}T12:00:00`).getDate()}</strong>
							{bookings.length
								? bookings.slice(0, 3).map((booking) => (
										<button
											className={`range-booking ${booking.temporal_status}`}
											key={booking.id}
											style={{
												"--booking-color": booking.hall_color || "#2563eb",
											}}
											onClick={(e) => {
												e.stopPropagation();
												onBookingClick(booking);
											}}
										>
											{booking.start_time} {booking.title || booking.hall_name}
										</button>
									))
								: ""}
							{bookings.length > 3 && (
								<small>+{bookings.length - 3}</small>
							)}
						</div>
					);
				})}
			</div>
		</section>
	);
}
