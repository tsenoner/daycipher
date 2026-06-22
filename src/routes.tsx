import { createBrowserRouter } from 'react-router-dom'
import { App } from './App'
import { TodayScreen } from './features/today/TodayScreen'
import { LearnScreen } from './features/learn/LearnScreen'
import { CheatSheet } from './features/learn/CheatSheet'
import { LessonScreen } from './features/learn/LessonScreen'
import { DailyChallenge } from './features/daily/DailyChallenge'
import { PracticeScreen } from './features/practice/PracticeScreen'
import { LevelsScreen } from './features/levels/LevelsScreen'
import { ProgressScreen } from './features/progress/ProgressScreen'
import { SettingsScreen } from './features/settings/SettingsScreen'

export const router = createBrowserRouter([
  {
    path: '/',
    element: <App />,
    children: [
      { index: true, element: <TodayScreen /> },
      { path: 'learn', element: <LearnScreen /> },
      { path: 'learn/cheatsheet', element: <CheatSheet /> },
      { path: 'learn/:stageId', element: <LessonScreen /> },
      { path: 'daily', element: <DailyChallenge /> },
      { path: 'practice', element: <PracticeScreen /> },
      { path: 'levels', element: <LevelsScreen /> },
      { path: 'progress', element: <ProgressScreen /> },
      { path: 'settings', element: <SettingsScreen /> },
    ],
  },
])
