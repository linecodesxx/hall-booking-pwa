const APP_TIME_ZONE = process.env.APP_TIME_ZONE || "Europe/Samara";

const originalToISOString = Date.prototype.toISOString;
const originalGetUTCHours = Date.prototype.getUTCHours;
const originalGetUTCMinutes = Date.prototype.getUTCMinutes;

const formatter = new Intl.DateTimeFormat("en-CA", {
	timeZone: APP_TIME_ZONE,
	year: "numeric",
	month: "2-digit",
	day: "2-digit",
	hour: "2-digit",
	minute: "2-digit",
	second: "2-digit",
	hourCycle: "h23",
});

function zonedParts(date) {
	const parts = Object.fromEntries(
		formatter
			.formatToParts(date)
			.filter(({ type }) => type !== "literal")
			.map(({ type, value }) => [type, value]),
	);

	return {
		year: parts.year,
		month: parts.month,
		day: parts.day,
		hour: Number(parts.hour),
		minute: Number(parts.minute),
		second: Number(parts.second),
	};
}

Date.prototype.getUTCHours = function getAppHours() {
	if (Number.isNaN(this.getTime())) return originalGetUTCHours.call(this);
	return zonedParts(this).hour;
};

Date.prototype.getUTCMinutes = function getAppMinutes() {
	if (Number.isNaN(this.getTime())) return originalGetUTCMinutes.call(this);
	return zonedParts(this).minute;
};

Date.prototype.toISOString = function toAppISOString() {
	if (Number.isNaN(this.getTime())) return originalToISOString.call(this);
	const parts = zonedParts(this);
	const milliseconds = String(this.getUTCMilliseconds()).padStart(3, "0");
	return `${parts.year}-${parts.month}-${parts.day}T${String(parts.hour).padStart(2, "0")}:${String(parts.minute).padStart(2, "0")}:${String(parts.second).padStart(2, "0")}.${milliseconds}Z`;
};
