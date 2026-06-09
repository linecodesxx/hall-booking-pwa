import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";

export function useSchedule(date) {
	return useQuery({
		queryKey: ["schedule", date],
		queryFn: () =>
			api(`/api/bookings/schedule?date=${date}`).then((d) => d.halls || []),
	});
}

export function useRangeSchedule(dates) {
	return useQuery({
		queryKey: ["schedule", "range", dates],
		queryFn: () =>
			Promise.all(
				dates.map((day) =>
					api(`/api/bookings/schedule?date=${day}`).then((d) => d),
				),
			),
		enabled: dates.length > 0,
	});
}
