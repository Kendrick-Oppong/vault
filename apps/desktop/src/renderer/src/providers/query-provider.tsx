import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { useJobEvents } from '@/lib'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000,
      refetchOnWindowFocus: false
    }
  }
})

// Component to run event listeners once
function EventListenerWrapper({ children }: Readonly<{ children: React.ReactNode }>) {
  useJobEvents()
  return <>{children}</>
}

export function QueryProvider({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <QueryClientProvider client={queryClient}>
      <EventListenerWrapper>{children}</EventListenerWrapper>
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  )
}
