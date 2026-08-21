import { CheckCircleIcon } from "@/app/ui/pos/icons";

const HAPPY_PATH = ["OPEN", "CONFIRMED", "PREPARING", "READY", "SERVED", "PAID"] as const;

const STEP_LABELS: Record<string, string> = {
  OPEN: "Order Received",
  CONFIRMED: "Confirmed",
  PREPARING: "Preparing",
  READY: "Ready",
  SERVED: "Served",
  PAID: "Paid",
};

export function OrderStatusTimeline({ status }: { status: string }) {
  if (status === "CANCELLED" || status === "REFUNDED") {
    return (
      <div className="rounded-xl bg-red-50 px-4 py-3 text-center text-sm font-semibold text-red-700">
        This order was {status === "CANCELLED" ? "cancelled" : "refunded"}.
      </div>
    );
  }

  const currentIndex = HAPPY_PATH.indexOf(status as (typeof HAPPY_PATH)[number]);

  return (
    <div className="flex items-start">
      {HAPPY_PATH.map((step, index) => {
        const isDone = currentIndex >= 0 && index <= currentIndex;
        const isLast = index === HAPPY_PATH.length - 1;
        return (
          <div key={step} className={`flex flex-1 items-center ${isLast ? "flex-none" : ""}`}>
            <div className="flex flex-col items-center">
              <span
                className={`flex h-8 w-8 items-center justify-center rounded-full ${
                  isDone ? "bg-amber-700 text-white" : "bg-gray-100 text-gray-400"
                }`}
              >
                {isDone ? <CheckCircleIcon className="h-4.5 w-4.5" /> : index + 1}
              </span>
              <p
                className={`mt-1.5 w-16 text-center text-[11px] font-medium ${
                  isDone ? "text-gray-900" : "text-gray-400"
                }`}
              >
                {STEP_LABELS[step]}
              </p>
            </div>
            {!isLast && (
              <div className={`mx-1 h-0.5 flex-1 ${isDone && index < currentIndex ? "bg-amber-700" : "bg-gray-100"}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}
