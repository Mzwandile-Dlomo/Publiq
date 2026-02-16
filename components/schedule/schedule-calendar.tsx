"use client";

import { Calendar } from "@/components/ui/calendar";

type ScheduleCalendarProps = {
    scheduledDates: string[];
};

export function ScheduleCalendar({ scheduledDates }: ScheduleCalendarProps) {
    const selectedDates = scheduledDates
        .map((value) => new Date(value))
        .filter((date) => !Number.isNaN(date.getTime()));

    return (
        <div className="rounded-2xl border border-border p-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-xl font-semibold">Calendar</h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                        Track upcoming releases at a glance.
                    </p>
                </div>
                <span className="rounded-full bg-amber-100 px-3 py-1 text-xs text-amber-700">
                    {selectedDates.length} scheduled
                </span>
            </div>
            <div className="mt-4">
                <Calendar
                    mode="multiple"
                    selected={selectedDates}
                    className="w-full [--cell-size:--spacing(12)]"
                    classNames={{ root: "w-full" }}
                />
            </div>
        </div>
    );
}
