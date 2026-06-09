import { useState } from "react";
import { createPortal } from "react-dom";
import { labels, niceDate } from "../utils";
import { ConfirmModal } from "./ConfirmModal";

export function BookingModal({ booking, onClose, user, onCancel, onUpdate, halls }) {
	const [editing, setEditing] = useState(false);
	const [form, setForm] = useState(null);
	const [confirmCancel, setConfirmCancel] = useState(false);
	const isAdmin = user?.role === "admin";
	const isOwner = user?.id === booking?.user_id;
	const canAct = isAdmin || isOwner;
	const isTerminal = ["cancelled", "rejected"].includes(booking?.status);

	if (!booking) return null;

	if (editing)
		return (
			<EditBookingModal
				booking={form}
				halls={halls || []}
				onSave={async () => {
					const changedFields = {};
					for (const k of Object.keys(form)) {
						if (String(form[k]) !== String(booking[k]))
							changedFields[k] = form[k];
					}
					if (Object.keys(changedFields).length) {
						changedFields.id = booking.id;
						await onUpdate(changedFields);
					}
					setEditing(false);
				}}
				onCancel={() => {
					setForm(null);
					setEditing(false);
				}}
				onFieldChange={(field, value) =>
					setForm((prev) => ({ ...prev, [field]: value }))
				}
			/>
		);

	return (
		<>
			{createPortal(
				<div className="modal-overlay" onClick={onClose}>
					<article
						className="booking-modal"
						onClick={(e) => e.stopPropagation()}
					>
						<div className="modal-handle" />
						<button className="modal-close" onClick={onClose} aria-label="Закрыть">
							<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
								<line x1="6" y1="6" x2="18" y2="18" />
								<line x1="18" y1="6" x2="6" y2="18" />
							</svg>
						</button>
						<div className="modal-body">
							<div className="modal-title-row">
								<h2>{booking.title}</h2>
								<span className={`badge ${booking.status}`}>
									{labels[booking.status]}
								</span>
							</div>
							<div className="modal-meta">
								<div className="modal-meta-item">
									<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
										<rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
										<line x1="16" y1="2" x2="16" y2="6" />
										<line x1="8" y1="2" x2="8" y2="6" />
										<line x1="3" y1="10" x2="21" y2="10" />
									</svg>
									<span>{niceDate(booking.date)}</span>
								</div>
								<div className="modal-meta-item">
									<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
										<circle cx="12" cy="12" r="10" />
										<polyline points="12 6 12 12 16 14" />
									</svg>
									<span>{booking.start_time} &ndash; {booking.end_time}</span>
								</div>
								<div className="modal-meta-item">
									<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
										<path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
										<circle cx="12" cy="10" r="3" />
									</svg>
									<span>{booking.hall_name}</span>
								</div>
							</div>
							{booking.user_name && (
								<div className="modal-field">
									<span className="modal-field-label">Заявитель</span>
									<span>{booking.user_name}</span>
								</div>
							)}
							{booking.comment && (
								<div className="modal-field">
									<span className="modal-field-label">Комментарий</span>
									<p>{booking.comment}</p>
								</div>
							)}
							{booking.admin_comment && (
								<div className="modal-field">
									<span className="modal-field-label">Комментарий администратора</span>
									<p>{booking.admin_comment}</p>
								</div>
							)}
							{canAct && (
								<div className="two-cols" style={{ marginTop: 8 }}>
									{isAdmin && (
										<button
											className="secondary"
											onClick={() => {
												setForm({ ...booking });
												setEditing(true);
											}}
										>
											Редактировать
										</button>
									)}
									{!isTerminal && (
										<button
											className="secondary danger"
											onClick={() => setConfirmCancel(true)}
										>
											Отменить
										</button>
									)}
								</div>
							)}
						</div>
					</article>
				</div>,
				document.body,
			)}
			{confirmCancel && (
				<ConfirmModal
					title="Отменить бронь"
					message="Вы уверены, что хотите отменить эту бронь?"
					confirmLabel="Отменить"
					danger
					onConfirm={() => {
						setConfirmCancel(false);
						onCancel(booking.id);
					}}
					onCancel={() => setConfirmCancel(false)}
				/>
			)}
		</>
	);
}

function EditBookingModal({ booking, halls, onSave, onCancel, onFieldChange }) {
	return createPortal(
		<div className="modal-overlay" onClick={onCancel}>
			<article
				className="booking-modal"
				onClick={(e) => e.stopPropagation()}
			>
				<div className="modal-handle" />
				<button className="modal-close" onClick={onCancel} aria-label="Закрыть">
					<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
						<line x1="6" y1="6" x2="18" y2="18" />
						<line x1="18" y1="6" x2="6" y2="18" />
					</svg>
				</button>
				<div className="modal-body">
					<h2>Редактировать бронь</h2>
					<label>
						Название
						<input
							value={booking.title}
							onChange={(e) => onFieldChange("title", e.target.value)}
						/>
					</label>
					<label>
						Помещение
						<select
							value={booking.hall_id}
							onChange={(e) => onFieldChange("hall_id", Number(e.target.value))}
						>
							{halls.map((h) => (
								<option key={h.id} value={h.id}>
									{h.name}
								</option>
							))}
						</select>
					</label>
					<label>
						Дата
						<input
							type="date"
							value={booking.date}
							onChange={(e) => onFieldChange("date", e.target.value)}
						/>
					</label>
					<label>
						Время начала
						<input
							type="time"
							value={booking.start_time}
							onChange={(e) => onFieldChange("start_time", e.target.value)}
						/>
					</label>
					<label>
						Время окончания
						<input
							type="time"
							value={booking.end_time}
							onChange={(e) => onFieldChange("end_time", e.target.value)}
						/>
					</label>
					<label>
						Комментарий
						<textarea
							value={booking.comment || ""}
							onChange={(e) => onFieldChange("comment", e.target.value)}
						/>
					</label>
					<label>
						Комментарий администратора
						<textarea
							value={booking.admin_comment || ""}
							onChange={(e) => onFieldChange("admin_comment", e.target.value)}
						/>
					</label>
					<div className="two-cols">
						<button className="primary" onClick={onSave}>
							Сохранить
						</button>
						<button className="secondary" onClick={onCancel}>
							Отмена
						</button>
					</div>
				</div>
			</article>
		</div>,
		document.body,
	);
}
