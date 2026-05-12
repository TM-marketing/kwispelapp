import React from "react";
import { Button } from "@/components/ui/button";
import { Calendar, Download } from "lucide-react";

function pad(n) { 
  return String(n).padStart(2, "0"); 
}

// Parse local datetime string: YYYY-MM-DDTHH:MM
function parseLocalParts(isoLocal) {
  const m = isoLocal.match(/^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2}))?$/);
  if (!m) throw new Error(`Invalid local datetime: ${isoLocal}`);
  return {
    Y: Number(m[1]), 
    M: Number(m[2]), 
    D: Number(m[3]),
    h: Number(m[4]), 
    m: Number(m[5]), 
    s: Number(m[6] || 0)
  };
}

function partsToBasic(p) {
  // 20251020T140000
  return (
    String(p.Y) + pad(p.M) + pad(p.D) + "T" + pad(p.h) + pad(p.m) + pad(p.s)
  );
}

function addMinutesToLocal(isoLocal, minutes) {
  const p = parseLocalParts(isoLocal);
  const d = new Date(p.Y, p.M - 1, p.D, p.h, p.m, p.s);
  d.setMinutes(d.getMinutes() + minutes);
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

function buildGoogleLink({ title, startLocal, endLocal, timezone = "Europe/Brussels", description = "", location = "" }) {
  const s = partsToBasic(parseLocalParts(startLocal));
  const e = partsToBasic(parseLocalParts(endLocal));
  const url = new URL("https://www.google.com/calendar/event");
  url.searchParams.set("action", "TEMPLATE");
  url.searchParams.set("text", title);
  url.searchParams.set("dates", `${s}/${e}`);
  url.searchParams.set("ctz", timezone);
  if (description) url.searchParams.set("details", description);
  if (location) url.searchParams.set("location", location);
  return url.toString();
}

function escapeICS(s = "") {
  return String(s)
    .replace(/\\/g, "\\\\")
    .replace(/\n/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;");
}

function buildICS({ title, startLocal, endLocal, timezone = "Europe/Brussels", description = "", location = "" }) {
  const s = partsToBasic(parseLocalParts(startLocal));
  const e = partsToBasic(parseLocalParts(endLocal));
  
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Kwiek & Kwispel//Afspraken//NL",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `DTSTART;TZID=${timezone}:${s}`,
    `DTEND;TZID=${timezone}:${e}`,
    `SUMMARY:${escapeICS(title)}`,
    `DESCRIPTION:${escapeICS(description)}`,
    `LOCATION:${escapeICS(location)}`,
    "STATUS:CONFIRMED",
    "SEQUENCE:0",
    "END:VEVENT",
    "END:VCALENDAR"
  ];
  
  return lines.join("\r\n");
}

export default function AddToCalendar({ 
  title, 
  startLocal, 
  durationMinutes = 60,
  timezone = "Europe/Brussels", 
  description = "", 
  location = "" 
}) {
  // Calculate end time
  const endLocal = addMinutesToLocal(startLocal, durationMinutes);

  const handleGoogleCalendar = () => {
    const url = buildGoogleLink({ title, startLocal, endLocal, timezone, description, location });
    window.open(url, "_blank");
  };

  const handleDownloadICS = () => {
    const icsContent = buildICS({ title, startLocal, endLocal, timezone, description, location });
    const blob = new Blob([icsContent], { type: "text/calendar;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${title.replace(/[^a-z0-9]/gi, '_')}.ics`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex gap-2 flex-wrap">
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={handleGoogleCalendar}
        className="rounded-lg"
        style={{ borderColor: 'var(--primary-blue)', color: 'var(--primary-blue)' }}
      >
        <Calendar className="w-4 h-4 mr-2" />
        In Google Calendar
      </Button>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={handleDownloadICS}
        className="rounded-lg"
        style={{ borderColor: 'var(--primary-pink)', color: 'var(--primary-blue)' }}
      >
        <Download className="w-4 h-4 mr-2" />
        Download iCal
      </Button>
    </div>
  );
}