import { Bell, BellRing, LogOut, RefreshCw } from "lucide-react";
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
	Today,
} from "./pages";
import { tokenStore, urlBase64ToUint8Array } from "./utils";

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
			<div style={{ display: route === "/today" || route === "/" ? "" : "none" }}>
				<ErrorBoundary>
					<Today go={go} user={user} />
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
	const [swUpdate, setSwUpdate] = useState(null);
	const [installPrompt, setInstallPrompt] = useState(null);
	const noticeTimer = useRef(null);
	const swRegRef = useRef(null);

	useEffect(() => {
		if (!("serviceWorker" in navigator)) return;
		navigator.serviceWorker.ready.then((reg) => {
			swRegRef.current = reg;
			reg.addEventListener("updatefound", () => {
				const newSw = reg.installing;
				if (!newSw) return;
				newSw.addEventListener("statechange", () => {
					if (newSw.state === "installed" && navigator.serviceWorker.controller) {
						setSwUpdate(true);
					}
				});
			});
		});
		navigator.serviceWorker.addEventListener("controllerchange", () => {
			window.location.reload();
		});
	}, []);

	useEffect(() => {
		const handler = (e) => {
			e.preventDefault();
			setInstallPrompt(e);
		};
		window.addEventListener("beforeinstallprompt", handler);
		return () => window.removeEventListener("beforeinstallprompt", handler);
	}, []);

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
				if (route === "/login" || route === "/") go("/today");
			})
			.catch(() => {
				tokenStore.clear();
				go("/login");
			})
			.finally(() => setLoading(false));
	}, []);

	async function subscribePush() {
		if (!("serviceWorker" in navigator) || Notification.permission === "denied") return;
		try {
			const reg = await navigator.serviceWorker.ready;
			const { publicKey } = await fetch("/api/push/vapid-key").then((r) =>
				r.json(),
			);
			let sub = await reg.pushManager.getSubscription();
			if (!sub) {
				if (Notification.permission === "default") {
					const perm = await Notification.requestPermission();
					if (perm !== "granted") return;
				}
				sub = await reg.pushManager.subscribe({
					userVisibleOnly: true,
					applicationServerKey: urlBase64ToUint8Array(publicKey),
				});
			}
			await api("/api/push/subscribe", {
				method: "POST",
				body: JSON.stringify(sub.toJSON()),
			});
		} catch (err) {
			console.log("Push subscription error:", err);
		}
	}

	useEffect(() => {
		if (!user || !("serviceWorker" in navigator)) return;
		if (Notification.permission === "granted") {
			subscribePush();
		}
	}, [user]);

	useEffect(() => {
		if (user && (route === "/" || route === "/login")) go("/today");
	}, [user, route]);

	const handleInstall = () => {
		if (!installPrompt) return;
		installPrompt.prompt();
		installPrompt.userChoice.then(() => setInstallPrompt(null));
	};

	const handleSwUpdate = () => {
		if (!swRegRef.current?.waiting) return;
		swRegRef.current.waiting.postMessage({ type: "SKIP_WAITING" });
	};

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
					go("/today");
					subscribePush();
				}}
			/>
		);

	return (
		<div className="app-shell">
			<header className="topbar">
				<div>
					<p className="eyebrow">Бронирование залов</p>
					<h1>{route === "/today" || route === "/" ? "Главная" : route === "/schedule" ? "Расписание" : route === "/my-bookings" ? "Мои заявки" : route === "/new-booking" ? "Новая бронь" : route.startsWith("/admin") ? "Админ-панель" : "Расписание"}</h1>
				</div>
			<div style={{ display: "flex", gap: 4, alignItems: "center" }}>
				{"Notification" in window && Notification.permission === "default" && (
					<button className="icon-button" onClick={subscribePush} aria-label="Включить уведомления" title="Включить уведомления о новых заявках">
						<Bell size={18} />
					</button>
				)}
				{installPrompt && (
					<button className="icon-button" onClick={handleInstall} aria-label="Установить" title="Установить приложение">
						<RefreshCw size={18} />
					</button>
				)}
				<button className="icon-button" onClick={logout} aria-label="Выйти">
					<LogOut size={20} />
				</button>
			</div>
			</header>
			{swUpdate && (
				<div
					className="notice info"
					style={{ cursor: "pointer", textAlign: "center", padding: "8px 12px" }}
					onClick={handleSwUpdate}
				>
					Доступна новая версия — нажмите для обновления
				</div>
			)}
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
