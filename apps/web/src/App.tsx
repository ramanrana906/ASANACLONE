
import './App.css'
import { useHealth } from './hooks/useHealth'

function App() {
  const { data, isLoading, error } = useHealth()

  return (
       <>
      <p>
        {isLoading && "Checking API..."}
        {error && `Error: ${error.message}`}
        {data && `API says: ${data.message}`}
      </p>
      {/* rest of your existing JSX */}
    </>
  )
}

export default App
