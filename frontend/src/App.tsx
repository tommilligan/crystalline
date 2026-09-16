import { MantineProvider } from '@mantine/core'
import { Notifications } from '@mantine/notifications'
import { type QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { queryClient as defaultQueryClient } from './lib/queryClient'
import { BoardPage } from './pages/BoardPage'
import { HomePage } from './pages/HomePage'
import { theme } from './theme'

interface AppProps {
  queryClient?: QueryClient
}

export function App({ queryClient = defaultQueryClient }: AppProps) {
  return (
    <MantineProvider theme={theme} defaultColorScheme="auto">
      <Notifications />
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/board/:boardId" element={<BoardPage />} />
          </Routes>
        </BrowserRouter>
      </QueryClientProvider>
    </MantineProvider>
  )
}
