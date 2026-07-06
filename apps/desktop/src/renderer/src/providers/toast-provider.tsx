import { Toaster } from 'sonner'

export function ToastProvider() {
  return (
    <Toaster
      icons={{ success: null, error: null, info: null, warning: null, loading: null }}
      closeButton
      richColors
      toastOptions={{
        duration: 5000,
        className:
          'rounded-lg !border !border-border !bg-card !text-foreground !shadow-card !font-sans',
        style: {
          fontFamily: 'var(--font-sans)',
          background: 'var(--card)',
          color: 'var(--foreground)',
          borderColor: 'var(--border)',
          boxShadow: 'var(--shadow-card)'
        },
        classNames: {
          toast: 'group',
          success: '!bg-card !border-live/20',
          error: '!bg-card !border-danger/20',
          title:
            'font-semibold group-data-[type=success]:!text-live group-data-[type=error]:!text-danger',
          description:
            'group-data-[type=success]:!text-live/80 group-data-[type=error]:!text-danger/80'
        }
      }}
    />
  )
}
