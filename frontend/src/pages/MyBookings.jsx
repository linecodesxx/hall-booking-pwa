import { useBookings, useCancelBooking } from "../hooks/useBookings";
import { BookingList, ListSkeleton } from "../components";

export function MyBookings({ setNotice }) {
	const { data: bookings = [], isLoading } = useBookings();
	const cancelBooking = useCancelBooking();

	const cancel = async (id) => {
		try {
			await cancelBooking.mutateAsync(id);
			setNotice("Заявка отменена.");
		} catch (err) {
			setNotice({ text: err.message, type: "error" });
		}
	};

	if (isLoading) return <ListSkeleton rows={4} />;
	return <BookingList bookings={bookings} onCancel={cancel} />;
}
