import { LogOut } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { BottomNav, ErrorBoundary, FormSkeleton } from "./components";
import { useHashRoute } from "./hooks/useHashRoute";
import { useWebSocket } from "./hooks/useWebSocket";
import { api } from "./lib/api";
import {
	AdminBookings,
	AdminHalls,
	AdminUsers,
	Login,
	MyBookings,
	NewBooking,
	Schedule,
} from "./pages";
import { tokenStore } from "./utils";

function PageRouter({ route, go, user, setNotice }) {
	const query = route.includes("?")
		? Object.fromEntries(new URLSearchParams(route.split("?")[1]))
		: {};
	return (
		<>
			<div style={{ display: route.startsWith("/new-booking") ? "" : "none" }}>
				<ErrorBoundary>
					<NewBooking
						go={go}
						setNotice={setNotice}
						user={user}
						query={query}
						key={route}
					/>
				</ErrorBoundary>
			</div>
			<div style={{ display: route === "/my-bookings" ? "" : "none" }}>
				<ErrorBoundary>
					<MyBookings setNotice={setNotice} />
				</ErrorBoundary>
			</div>
			<div
				style={{
					display:
						route === "/admin" || route === "/admin/bookings" ? "" : "none",
				}}
			>
				<ErrorBoundary>
					<AdminBookings setNotice={setNotice} user={user} />
				</ErrorBoundary>
			</div>
			<div style={{ display: route === "/admin/halls" ? "" : "none" }}>
				<ErrorBoundary>
					<AdminHalls setNotice={setNotice} />
				</ErrorBoundary>
			</div>
			<div style={{ display: route === "/admin/users" ? "" : "none" }}>
				<ErrorBoundary>
					<AdminUsers />
				</ErrorBoundary>
			</div>
			<div style={{ display: route === "/schedule" ? "" : "none" }}>
				<ErrorBoundary>
					<Schedule go={go} user={user} />
				</ErrorBoundary>
			</div>
		</>
	);
}

export function App() {
	const [route, go] = useHashRoute();
	const [user, setUser] = useState(null);
	useWebSocket(user);
	const [loading, setLoading] = useState(true);
	const [notice, setNoticeRaw] = useState(null);
	const noticeTimer = useRef(null);

	const setNotice = useCallback((msg) => {
		const entry =
			typeof msg === "string" ? { text: msg, type: "success" } : msg;
		setNoticeRaw(entry);
		if (noticeTimer.current) clearTimeout(noticeTimer.current);
		if (entry) {
			noticeTimer.current = setTimeout(() => setNoticeRaw(null), 4000);
		}
	}, []);

	useEffect(() => {
		return () => {
			if (noticeTimer.current) clearTimeout(noticeTimer.current);
		};
	}, []);

	useEffect(() => {
		if (!tokenStore.get()) {
			setLoading(false);
			go("/login");
			return;
		}
		api("/api/auth/me")
			.then(({ user: current }) => {
				setUser(current);
				if (route === "/login" || route === "/") go("/schedule");
			})
			.catch(() => {
				tokenStore.clear();
				go("/login");
			})
			.finally(() => setLoading(false));
	}, []);

	useEffect(() => {
		if (user && (route === "/" || route === "/login")) go("/schedule");
	}, [user, route]);

	const logout = () => {
		tokenStore.clear();
		setUser(null);
		go("/login");
	};

	if (loading)
		return (
			<main className="center-screen">
				<FormSkeleton />
			</main>
		);
	if (!user)
		return (
			<Login
				onLogin={(token, nextUser) => {
					tokenStore.set(token);
					setUser(nextUser);
					go("/schedule");
				}}
			/>
		);

	return (
		<div className="app-shell">
			<header className="topbar">
				<div>
					<p className="eyebrow">Бронирование залов</p>
					<h1>{user.role === "admin" ? "Админ-панель" : "Расписание"}</h1>
				</div>
				<button className="icon-button" onClick={logout} aria-label="Выйти">
					<LogOut size={20} />
				</button>
			</header>
			{notice && (
				<div className="notice-overlay">
					<div
						className={`notice ${notice.type}`}
						key={notice.text}
						onClick={() => setNotice(null)}
					>
						{notice.text}
					</div>
				</div>
			)}
			<main className="content">
				<ErrorBoundary>
					<PageRouter route={route} go={go} user={user} setNotice={setNotice} />
				</ErrorBoundary>
			</main>
			<BottomNav user={user} route={route} go={go} />
		</div>
	);
}
