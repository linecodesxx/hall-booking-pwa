import { API, tokenStore } from "../utils";

export async function api(url, options = {}) {
	const response = await fetch(`${API}${url}`, {
		...options,
		headers: {
			"Content-Type": "application/json",
			...(tokenStore.get()
				? { Authorization: `Bearer ${tokenStore.get()}` }
				: {}),
			...(options.headers || {}),
		},
	});
	const data = await response.json().catch(() => ({}));
	if (!response.ok) throw new Error(data.error || "Что-то пошло не так");
	return data;
}
