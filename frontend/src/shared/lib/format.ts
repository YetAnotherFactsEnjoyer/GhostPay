export const money = (minor: number, currency = "MYR") =>
  new Intl.NumberFormat("en-MY", { style: "currency", currency }).format(
    minor / 100,
  );
export const dateTime = (value: string) =>
  new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
