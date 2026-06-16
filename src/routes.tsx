import { createBrowserRouter } from 'react-router-dom'
import { App } from './App'
import { TodayScreen } from './features/today/TodayScreen'
import { LearnScreen } from './features/learn/LearnScreen'
import { PracticeScreen } from './features/practice/PracticeScreen'
import { ProgressScreen } from './features/progress/ProgressScreen'
import { SettingsScreen } from './features/settings/SettingsScreen'

export const router = createBrowserRouter([
  {
    path: '/',
    element: <App />,
    children: [
      { index: true, element: <TodayScreen /> },
      { path: 'learn', element: <LearnScreen /> },
      { path: 'practice', element: <PracticeScreen /> },
      { path: 'progress', element: <ProgressScreen /> },
      { path: 'settings', element: <SettingsScreen /> },
    ],
  },
])
