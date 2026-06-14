import { useMemo, useState } from "react";
import { addDays, todayISO } from "../utils";
import { FormSkeleton } from "../components";
import { useHalls } from "../hooks/useHalls";
import { useCreateBooking, useCreateBookingBatch } from "../hooks/useBookings";

const REPEAT_LABELS = {
	none: "Нет",
	daily: "Каждый день",
	weekly: "Каждую неделю",
	biweekly: "Каждые 2 недели",
	monthly: "Каждый месяц",
};

const REPEAT_STEPS = {
	daily: 1,
	weekly: 7,
	biweekly: 14,
	monthly: null,
};

const addHour = (time) => {
	const [h, m] = time.split(":").map(Number);
	return `${String(h + 1).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
};

const addMonths = (date, months) => {
	const next = new Date(`${date}T12:00:00`);
	next.setMonth(next.getMonth() + months);
	return next.toISOString().slice(0, 10);
};

const eachDay = (from, to) => {
	const days = [];
	let cur = from;
	while (cur <= to) {
		days.push(cur);
		cur = addDays(cur, 1);
	}
	return days;
};

const repeatDates = (from, repeat) => {
	if (repeat === "none") return [];
	const step = REPEAT_STEPS[repeat];
	const cap = addMonths(from, 2);
	const dates = [];
	if (step !== null) {
		let cur = from;
		while (cur <= cap) {
			dates.push(cur);
			cur = addDays(cur, step);
		}
	} else {
		let cur = from;
		while (cur <= cap) {
			dates.push(cur);
			cur = addMonths(cur, 1);
		}
	}
	return dates;
};

export function NewBooking({ setNotice, query = {}, user }) {
	const { data: halls = [], isLoading } = useHalls();
	const createBooking = useCreateBooking(user?.role);
	const createBookingBatch = useCreateBookingBatch();
	const resetForm = () => ({
		hall_id: query.hall_id || "",
		date_from: query.date || todayISO(),
		date_to: query.date || todayISO(),
		start_time: query.start_time || "12:00",
		end_time: query.end_time || "13:00",
		title: "",
		comment: "",
		repeat: "none",
	});
	const [form, setForm] = useState(resetForm);
	const [error, setError] = useState("");
	const [seeding, setSeeding] = useState(0);
	const [created, setCreated] = useState(0);
	const update = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

	const days = useMemo(() => {
		if (form.repeat !== "none") {
			return repeatDates(form.date_from, form.repeat);
		}
		return eachDay(form.date_from, form.date_to);
	}, [form.date_from, form.date_to, form.repeat]);

	const onStartChange = (value) => {
		const next = { ...form, start_time: value };
		if (next.end_time <= value) next.end_time = addHour(value);
		setForm(next);
	};

	const onEndChange = (value) => {
		if (value <= form.start_time) value = addHour(form.start_time);
		setForm({ ...form, end_time: value });
	};

	const submit = async (e) => {
		e.preventDefault();
		setError("");
		if (!form.hall_id) return setError("Выберите помещение");
		if (!form.title.trim()) return setError("Введите название мероприятия");
		if (!days.length) return setError("Укажите даты");

		setSeeding(days.length);

		if (days.length > 1) {
			try {
				const result = await createBookingBatch.mutateAsync(
					days.map((date) => ({
						hall_id: form.hall_id,
						date,
						start_time: form.start_time,
						end_time: form.end_time,
						title: form.title,
						comment: form.comment,
					})),
				);
				setCreated(result.bookings.length);
				setNotice(`Создано ${result.bookings.length} броней.`);
				setForm(resetForm());
			} catch (err) {
				const msg = err.message || "Ошибка при создании";
				setNotice({ text: msg, type: "error" });
			}
			setSeeding(0);
			return;
		}

		try {
			await createBooking.mutateAsync({
				hall_id: form.hall_id,
				date: form.date_from,
				start_time: form.start_time,
				end_time: form.end_time,
				title: form.title,
				comment: form.comment,
			});
			setCreated(1);
			setNotice("Бронь создана.");
			setForm(resetForm());
		} catch (err) {
			setNotice({ text: err.message || "Ошибка при создании", type: "error" });
		}
		setSeeding(0);
	};

	if (isLoading) return <FormSkeleton />;

	const busy = seeding > 0;

	return (
		<form className="card form-card" onSubmit={submit}>
			<h2>Новая бронь</h2>
						<label>
				Название мероприятия
				<input
					value={form.title}
					onChange={(e) => update("title", e.target.value)}
					disabled={busy}
				/>
			</label>

			<label>
				Помещение
				<select
					value={form.hall_id}
					onChange={(e) => update("hall_id", e.target.value)}
					disabled={busy}
				>
					<option value="">Выберите зал</option>
					{(halls || []).map((hall) => (
						<option value={hall.id} key={hall.id}>
							{hall.name}
						</option>
					))}
				</select>
			</label>
			<div className="two-cols">
				<label>
					Дата
					<input
						className="input"
						type="date"
						value={form.date_from}
						onChange={(e) => update("date_from", e.target.value)}
						disabled={busy}
					/>
				</label>
				{form.repeat === "none" && (
					<label>
						Дата по
						<input
							className="input"
							type="date"
							value={form.date_to}
							min={form.date_from}
							onChange={(e) => update("date_to", e.target.value)}
							disabled={busy}
						/>
					</label>
				)}
			</div>
			
			{days.length > 1 && <p className="muted">Будет создано: {days.length} броней</p>}
			<div className="two-cols">
				<label>
					Начало
					<input
						className="input"
						type="time"
						value={form.start_time}
						onChange={(e) => onStartChange(e.target.value)}
						disabled={busy}
					/>
				</label>
				<label>
					Конец
					<input
						className="input"
						type="time"
						value={form.end_time}
						min={form.start_time}
						onChange={(e) => onEndChange(e.target.value)}
						disabled={busy}
					/>
				</label>
			</div>

			<label>
				Повторение
				<select
					value={form.repeat}
					onChange={(e) => update("repeat", e.target.value)}
					disabled={busy}
				>
					{Object.entries(REPEAT_LABELS).map(([key, label]) => (
						<option value={key} key={key}>
							{label}
						</option>
					))}
				</select>
			</label>

			<label>
				Комментарий
				<textarea
					value={form.comment}
					onChange={(e) => update("comment", e.target.value)}
					disabled={busy}
				/>
			</label>
			{busy && <p className="muted">Создано {created} из {seeding}...</p>}
			{error && <div className="error">{error}</div>}
			<button className="primary" disabled={busy}>
				{busy
					? "Создание..."
					: days.length > 1
						? `Забронировать (${days.length})`
						: "Создать бронь"}
			</button>
		</form>
	);
}
