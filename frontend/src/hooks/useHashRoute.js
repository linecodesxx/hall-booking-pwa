import { useEffect, useState } from "react";

export function useHashRoute() {
	const [route, setRoute] = useState(location.hash.replace("#", "") || "/");
	useEffect(() => {
		const onHash = () => {
			const next = location.hash.replace("#", "") || "/";
			setRoute((prev) => (prev === next ? prev : next));
		};
		addEventListener("hashchange", onHash);
		return () => removeEventListener("hashchange", onHash);
	}, []);
	const go = (path) => {
		setRoute(path);
		location.hash = path;
	};
	return [route, go];
}
