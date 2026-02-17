"use client";

import * as React from "react";
import { getDefaultClassNames, type DayButton } from "react-day-picker";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { platformConfigs, type Platform } from "@/lib/platforms";

type ScheduledItem = {
    id: string;
    title: string;
    scheduledAt: string | null;
    platforms: string[];
};

type ScheduleCalendarProps = {
    scheduledItems: ScheduledItem[];
};

type ItemsByDate = Record<string, ScheduledItem[]>;

const ItemsByDateContext = React.createContext<ItemsByDate>({});

function ScheduleDayButton({
    className,
    day,
    modifiers,
    ...props
}: React.ComponentProps<typeof DayButton>) {
    const defaultClassNames = getDefaultClassNames();
    const itemsByDate = React.useContext(ItemsByDateContext);

    const ref = React.useRef<HTMLButtonElement>(null);
    React.useEffect(() => {
        if (modifiers.focused) ref.current?.focus();
    }, [modifiers.focused]);

    const dateKey = `${day.date.getFullYear()}-${String(day.date.getMonth() + 1).padStart(2, "0")}-${String(day.date.getDate()).padStart(2, "0")}`;
    const items = itemsByDate[dateKey] || [];

    return (
        <Button
            ref={ref}
            variant="ghost"
            size="icon"
            data-day={day.date.toLocaleDateString()}
            data-selected-single={
                modifiers.selected &&
                !modifiers.range_start &&
                !modifiers.range_end &&
                !modifiers.range_middle
            }
            data-range-start={modifiers.range_start}
            data-range-end={modifiers.range_end}
            data-range-middle={modifiers.range_middle}
            className={cn(
                "data-[selected-single=true]:bg-primary data-[selected-single=true]:text-primary-foreground data-[range-middle=true]:bg-accent data-[range-middle=true]:text-accent-foreground data-[range-start=true]:bg-primary data-[range-start=true]:text-primary-foreground data-[range-end=true]:bg-primary data-[range-end=true]:text-primary-foreground group-data-[focused=true]/day:border-ring group-data-[focused=true]/day:ring-ring/50 dark:hover:text-accent-foreground flex size-auto w-full min-w-(--cell-size) flex-col gap-0.5 leading-none font-normal group-data-[focused=true]/day:relative group-data-[focused=true]/day:z-10 group-data-[focused=true]/day:ring-[3px] data-[range-end=true]:rounded-md data-[range-end=true]:rounded-r-md data-[range-middle=true]:rounded-none data-[range-start=true]:rounded-md data-[range-start=true]:rounded-l-md h-auto min-h-(--cell-size) items-center justify-start p-1 md:p-1.5",
                defaultClassNames.day,
                className
            )}
            {...props}
        >
            <span className="text-xs font-medium">{day.date.getDate()}</span>
            {items.length > 0 && (
                <div className="hidden w-full flex-col gap-0.5 md:flex">
                    {items.slice(0, 2).map((item) => (
                        <div
                            key={item.id}
                            className="flex w-full items-center gap-1 rounded bg-primary/10 px-1 py-0.5"
                        >
                            <span className="truncate text-[10px] leading-tight text-foreground">
                                {item.title}
                            </span>
                        </div>
                    ))}
                    {items.length > 2 && (
                        <span className="text-[9px] text-muted-foreground">
                            +{items.length - 2} more
                        </span>
                    )}
                    <div className="flex gap-0.5">
                        {Array.from(
                            new Set(items.flatMap((i) => i.platforms))
                        ).map((platform) => {
                            const config =
                                platformConfigs[platform as Platform];
                            return (
                                <span
                                    key={platform}
                                    className={cn(
                                        "size-1.5 rounded-full",
                                        config?.bgColor
                                            ? config.bgColor.replace(
                                                  "bg-",
                                                  "bg-"
                                              )
                                            : "bg-gray-300"
                                    )}
                                    style={
                                        platform === "youtube"
                                            ? { backgroundColor: "#dc2626" }
                                            : platform === "tiktok"
                                              ? { backgroundColor: "#111827" }
                                              : platform === "instagram"
                                                ? {
                                                      backgroundColor:
                                                          "#db2777",
                                                  }
                                                : platform === "facebook"
                                                  ? {
                                                        backgroundColor:
                                                            "#2563eb",
                                                    }
                                                  : undefined
                                    }
                                    title={config?.name || platform}
                                />
                            );
                        })}
                    </div>
                </div>
            )}
            {items.length > 0 && (
                <div className="flex gap-0.5 md:hidden">
                    <span className="size-1.5 rounded-full bg-primary" />
                </div>
            )}
        </Button>
    );
}

export function ScheduleCalendar({ scheduledItems }: ScheduleCalendarProps) {
    const selectedDates = scheduledItems
        .map((item) => (item.scheduledAt ? new Date(item.scheduledAt) : null))
        .filter((date): date is Date => date !== null && !Number.isNaN(date.getTime()));

    const itemsByDate: ItemsByDate = {};
    for (const item of scheduledItems) {
        if (!item.scheduledAt) continue;
        const d = new Date(item.scheduledAt);
        if (Number.isNaN(d.getTime())) continue;
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
        if (!itemsByDate[key]) itemsByDate[key] = [];
        itemsByDate[key].push(item);
    }

    return (
        <div className="rounded-2xl border border-border p-4 md:p-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-xl font-semibold">Calendar</h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                        Track upcoming releases at a glance.
                    </p>
                </div>
                <span className="rounded-full bg-amber-100 px-3 py-1 text-xs text-amber-700">
                    {scheduledItems.length} scheduled
                </span>
            </div>
            <div className="mt-4">
                <ItemsByDateContext.Provider value={itemsByDate}>
                    <Calendar
                        mode="multiple"
                        selected={selectedDates}
                        disabled={{ before: new Date() }}
                        className="w-full [--cell-size:--spacing(10)]"
                        classNames={{
                            root: "w-full",
                            day: "relative w-full h-full p-0 text-center group/day select-none",
                            week: "flex w-full mt-1",
                        }}
                        components={{
                            DayButton: ScheduleDayButton,
                        }}
                    />
                </ItemsByDateContext.Provider>
            </div>
        </div>
    );
}
