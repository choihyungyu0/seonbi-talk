import { AppRouter } from './app/router'
import { AutoTranslator } from './features/i18n/AutoTranslator'
import { LanguageProvider } from './features/i18n/LanguageContext'
import './styles/global.css'
import './pages/MyPageSidebar.css'

function App() {
  return (
    <LanguageProvider>
      <AutoTranslator />
      <AppRouter />
    </LanguageProvider>
  )
}

export default App
