import { useRef, useState } from "react";
import {
	BookingModal,
	CalendarFilter,
	CalendarGrid,
	CellBookingsModal,
	DateBar,
	DayBookingsModal,
	HallCard,
	RangeCalendar,
	ScheduleSkeleton,
} from "../components";
import { addDays, monthDays, todayISO, weekDays } from "../utils";

const addMonths = (date, n) => {
	const d = new Date(`${date}T12:00:00`);
	d.setMonth(d.getMonth() + n);
	return d.toISOString().slice(0, 10);
};
import { useSchedule, useRangeSchedule } from "../hooks/useSchedule";
import { useCancelBooking, useUpdateBooking } from "../hooks/useBookings";

export function Schedule({ go, user }) {
	const [date, setDate] = useState(todayISO());
	const [view, setView] = useState("rooms");
	const [rangeFilter, setRangeFilter] = useState("all");
	const [selectedBooking, setSelectedBooking] = useState(null);
	const [dayBookings, setDayBookings] = useState(null);
	const [cellData, setCellData] = useState(null);

	const { data: halls = [], isLoading: hallsLoading } = useSchedule(date);
	const cancelBooking = useCancelBooking();
	const updateBooking = useUpdateBooking();

	const rangeDates =
		view === "week"
			? weekDays(date)
			: view === "month"
				? monthDays(date)
				: [];
	const { data: range = [], isLoading: rangeLoading } =
		useRangeSchedule(rangeDates);

	const rangeHalls = range.length
		? Object.values(
				range.reduce((acc, r) => {
					(r?.halls || []).forEach((h) => {
						acc[h.id] = acc[h.id] || h;
					});
					return acc;
				}, {}),
			)
		: halls;

	const goToday = () => setDate(todayISO());
	const onBookingClick = (booking) => setSelectedBooking(booking);
	const shiftView = (dir) =>
		setDate(
			view === "month"
				? addMonths(date, dir)
				: view === "week"
					? addDays(date, dir * 7)
					: addDays(date, dir),
		);
	const onDayClick = (day) => {
		go(`/new-booking?date=${day}`);
	};
	const onDayBookings = (data) => setDayBookings(data);
	const onCellClick = (hall, hour, bookings) => {
		setCellData({ hall, hour, bookings, date });
	};
	const loading = hallsLoading || rangeLoading;

	const handleCancel = async (id) => {
		try {
			await cancelBooking.mutateAsync(id);
		} catch (err) {
			console.error(err);
		}
		setSelectedBooking(null);
	};

	const handleUpdate = async (data) => {
		try {
			const res = await updateBooking.mutateAsync(data);
			if (res?.booking)
				setSelectedBooking(res.booking);
		} catch (err) {
			console.error(err);
		}
	};

	const swipeRef = useRef(null);
	const touchStartX = useRef(0);
	const onTouchStart = (e) => {
		touchStartX.current = e.touches[0].clientX;
	};
	const onTouchEnd = (e) => {
		const dx = e.changedTouches[0].clientX - touchStartX.current;
		if (Math.abs(dx) > 50) shiftView(dx > 0 ? -1 : 1);
	};

	return (
		<>
			<div className="segmented">
				<button
					className={view === "rooms" ? "active" : ""}
					onClick={() => setView("rooms")}
				>
					Помещения
				</button>
				<button
					className={view === "day" ? "active" : ""}
					onClick={() => setView("day")}
				>
					День
				</button>
				<button
					className={view === "week" ? "active" : ""}
					onClick={() => setView("week")}
				>
					Неделя
				</button>
				<button
					className={view === "month" ? "active" : ""}
					onClick={() => setView("month")}
				>
					Месяц
				</button>
			</div>
			<div
				ref={swipeRef}
				onTouchStart={onTouchStart}
				onTouchEnd={onTouchEnd}
				className="swipe-area container"
			>
			{loading ? (
				<ScheduleSkeleton />
			) : (
				<div className="container">
					{view === "rooms" &&
				(halls || []).map((hall) => (
					<HallCard
						key={hall.id}
						hall={hall}
						date={date}
						go={go}
						onBookingClick={onBookingClick}
					/>
				))}
			{view === "day" && (
				<CalendarGrid
					halls={halls || []}
					date={date}
					go={go}
					onCellClick={onCellClick}
					onBookingClick={onBookingClick}
				/>
			)}
			{["week", "month"].includes(view) && (
				<CalendarFilter
					halls={rangeHalls || []}
					value={rangeFilter}
					setValue={setRangeFilter}
				/>
			)}
			{view === "week" && (
				<div className="conatiner">
					<RangeCalendar
						mode="week"
						days={weekDays(date)}
						range={range}
						filter={rangeFilter}
						user={user}
						onDayClick={onDayClick}
						onDayBookings={onDayBookings}
						onBookingClick={onBookingClick}
					/>

					<DateBar shift={shiftView} goToday={goToday} />
				</div>
			)}
			{view === "month" && (
				<div className="conatiner">
					
					<RangeCalendar
						mode="month"
						days={monthDays(date)}
						range={range}
						filter={rangeFilter}
						user={user}
						onDayClick={onDayClick}
						onDayBookings={onDayBookings}
						onBookingClick={onBookingClick}
					/>
					<DateBar shift={shiftView} goToday={goToday} />
				</div>
			)}
				</div>
			)}
			</div>
			<BookingModal
				booking={selectedBooking}
				onClose={() => setSelectedBooking(null)}
				user={user}
				onCancel={handleCancel}
				onUpdate={handleUpdate}
				halls={rangeHalls}
			/>
			{dayBookings && (
				<DayBookingsModal
					date={dayBookings.date}
					bookings={dayBookings.bookings}
					onCreateBooking={() =>
						go(`/new-booking?date=${dayBookings.date}`)
					}
					onBookingClick={onBookingClick}
					onClose={() => setDayBookings(null)}
				/>
			)}
			{cellData && (
				<CellBookingsModal
					hall={cellData.hall}
					date={cellData.date}
					hour={cellData.hour}
					bookings={cellData.bookings}
					onCreateBooking={() =>
						go(
							`/new-booking?hall_id=${cellData.hall.id}&date=${cellData.date}&start_time=${String(cellData.hour).padStart(2, "0")}:00&end_time=${String(cellData.hour + 1).padStart(2, "0")}:00`,
						)
					}
					onBookingClick={onBookingClick}
					onClose={() => setCellData(null)}
				/>
			)}
		</>
	);
}
