import { useState } from "react";
import { BookingList, ListSkeleton } from "../components";
import { BookingModal } from "../components/BookingModal";
import { ConfirmModal } from "../components/ConfirmModal";
import {
	useBookings,
	useApproveBooking,
	useRejectBooking,
	useCancelBooking,
	useUpdateBooking,
} from "../hooks/useBookings";
import { useHalls } from "../hooks/useHalls";

export function AdminBookings({ setNotice, user }) {
	const [status, setStatus] = useState("pending");
	const [comments, setComments] = useState({});
	const [confirmReject, setConfirmReject] = useState(null);
	const [selectedBooking, setSelectedBooking] = useState(null);
	const [confirmCancelId, setConfirmCancelId] = useState(null);
	const { data: bookings = [], isLoading } = useBookings(status === "pending" ? "pending" : "");
	const { data: halls = [] } = useHalls();
	const approveBooking = useApproveBooking();
	const rejectBooking = useRejectBooking();
	const cancelBooking = useCancelBooking();
	const updateBooking = useUpdateBooking();
	const filtered = user ? bookings.filter((b) => b.user_id !== user.id) : bookings;

	const act = async (id, action) => {
		try {
			const mutation = action === "approve" ? approveBooking : rejectBooking;
			await mutation.mutateAsync({ id, comment: comments[id] || "" });
			setNotice(
				action === "approve" ? "Заявка подтверждена." : "Заявка отклонена.",
			);
		} catch (err) {
			setNotice({ text: err.message, type: "error" });
		}
	};

	const handleCancel = async (id) => {
		try {
			await cancelBooking.mutateAsync(id);
			setNotice("Заявка отменена.");
		} catch (err) {
			setNotice({ text: err.message, type: "error" });
		}
		setConfirmCancelId(null);
		setSelectedBooking(null);
	};

	const handleUpdate = async (data) => {
		try {
			await updateBooking.mutateAsync(data);
			setNotice("Заявка обновлена.");
		} catch (err) {
			setNotice({ text: err.message, type: "error" });
		}
		setSelectedBooking(null);
	};

	if (isLoading) return <ListSkeleton rows={4} />;
	return (
		<>
			<div className="segmented">
				<button
					className={status === "pending" ? "active" : ""}
					onClick={() => setStatus("pending")}
				>
					На рассмотрении
				</button>
				<button
					className={!status ? "active" : ""}
					onClick={() => setStatus("")}
				>
					Все заявки
				</button>
			</div>
			<BookingList
				bookings={filtered}
				adminActions={(booking) =>
					booking.status === "pending" ? (
						<div className="admin-actions">
							<label>
								Комментарий администратора
								<textarea
									value={comments[booking.id] || ""}
									onChange={(e) =>
										setComments((prev) => ({
											...prev,
											[booking.id]: e.target.value,
										}))
									}
								/>
							</label>
							<div className="two-cols">
								<button
									className="primary"
									onClick={() => act(booking.id, "approve")}
								>
									Подтвердить
								</button>
								<button
									className="secondary danger"
									onClick={() => setConfirmReject(booking.id)}
								>
									Отклонить
								</button>
							</div>
						</div>
					) : booking.status === "approved" ? (
						<div className="two-cols" style={{ marginTop: 8 }}>
							<button
								className="secondary"
								onClick={() => setSelectedBooking(booking)}
							>
								Инфо
							</button>
							<button
								className="secondary danger"
								onClick={() => setConfirmCancelId(booking.id)}
							>
								Отменить
							</button>
						</div>
					) : booking.status === "rejected" ? (
						<button
							className="secondary"
							style={{ marginTop: 8 }}
							onClick={() => setSelectedBooking(booking)}
						>
							Редактировать
						</button>
					) : null
				}
			/>
			{confirmReject && (
				<ConfirmModal
					title="Отклонить заявку"
					message="Вы уверены, что хотите отклонить эту заявку?"
					confirmLabel="Отклонить"
					danger
					onConfirm={() => {
						const id = confirmReject;
						setConfirmReject(null);
						act(id, "reject");
					}}
					onCancel={() => setConfirmReject(null)}
				/>
			)}
			{confirmCancelId && (
				<ConfirmModal
					title="Отменить бронь"
					message="Вы уверены, что хотите отменить эту бронь?"
					confirmLabel="Отменить"
					danger
					onConfirm={() => handleCancel(confirmCancelId)}
					onCancel={() => setConfirmCancelId(null)}
				/>
			)}
			{selectedBooking && (
				<BookingModal
					booking={selectedBooking}
					onClose={() => setSelectedBooking(null)}
					user={user}
					onCancel={handleCancel}
					onUpdate={handleUpdate}
					halls={halls}
				/>
			)}
		</>
	);
}
