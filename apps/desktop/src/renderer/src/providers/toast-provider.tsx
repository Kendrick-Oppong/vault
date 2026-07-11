import { Toaster } from "sonner";

export function ToastProvider() {
  return (
    <Toaster
      icons={{
        success: <></>,
        error: <></>,
        warning: <></>,
        info: <></>,
        loading: <></>
      }}
      closeButton
      richColors
      toastOptions={{
        duration: 5000,
        className:
          "rounded-lg border! border-border! bg-card! text-foreground! shadow-card! font-sans!",
        style: {
          fontFamily: "var(--font-sans)",
          background: "var(--card)",
          color: "var(--foreground)",
          borderColor: "var(--border)",
          boxShadow: "var(--shadow-card)"
        },
        classNames: {
          toast: "group",
          success: "bg-card! border-live/20!",
          error: "bg-card! border-destructive/20!",
          title:
            "font-semibold group-data-[type=success]:text-success! group-data-[type=error]:text-destructive!",
          description:
            "group-data-[type=success]:text-success/80! group-data-[type=error]:text-destructive/80!"
        }
      }}
    />
  );
}
