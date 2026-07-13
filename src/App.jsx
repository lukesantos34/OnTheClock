import { useEffect, useMemo, useState } from 'react'
import './App.css'

const managers = [
  'Declan',
  'AJ',
  'Liam',
  'Pat',
  'Sean',
  'Nikhil',
  'Nick',
  'Sam',
  'Kevin',
  'Dylan',
  'Connor',
  'Luke',
]

function createDraftOrder() {
  const draftOrder = []

  for (let round = 1; round <= 16; round += 1) {
    const roundManagers =
      round % 2 === 1 ? managers : [...managers].reverse()

    roundManagers.forEach((manager, index) => {
      draftOrder.push({
        overallPick: draftOrder.length + 1,
        round,
        pickInRound: index + 1,
        manager,
      })
    })
  }

  return draftOrder
}

const draftOrder = createDraftOrder()

function createInitialManagerTotals() {
  return Object.fromEntries(managers.map((manager) => [manager, 0]))
}

function formatTime(milliseconds, showTenths = false) {
  const safeMilliseconds = Math.max(0, milliseconds)
  const totalSeconds = Math.floor(safeMilliseconds / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  const tenths = Math.floor((safeMilliseconds % 1000) / 100)

  const baseTime = `${minutes}:${String(seconds).padStart(2, '0')}`

  return showTenths ? `${baseTime}.${tenths}` : baseTime
}

function App() {
  const [draftStarted, setDraftStarted] = useState(false)
  const [currentPickIndex, setCurrentPickIndex] = useState(0)
  const [pickStartedAt, setPickStartedAt] = useState(null)
  const [now, setNow] = useState(0)
  const [completedPicks, setCompletedPicks] = useState([])
  const [managerTotals, setManagerTotals] = useState(
    createInitialManagerTotals,
  )

  const currentPick = draftOrder[currentPickIndex]
  const nextPick = draftOrder[currentPickIndex + 1]

  const currentPickTime = useMemo(() => {
    if (!draftStarted || pickStartedAt === null) {
      return 0
    }

    return now - pickStartedAt
  }, [draftStarted, now, pickStartedAt])

  useEffect(() => {
    if (!draftStarted) {
      return undefined
    }

    const timerId = window.setInterval(() => {
      setNow(Date.now())
    }, 100)

    return () => {
      window.clearInterval(timerId)
    }
  }, [draftStarted])

  function handleStartDraft() {
    const startTime = Date.now()

    setPickStartedAt(startTime)
    setNow(startTime)
    setDraftStarted(true)
  }

  function handleDrafted() {
    if (!currentPick || pickStartedAt === null) {
      return
    }

    const completedAt = Date.now()
    const pickDuration = completedAt - pickStartedAt

    const completedPick = {
      ...currentPick,
      startedAt: pickStartedAt,
      completedAt,
      duration: pickDuration,
    }

    setCompletedPicks((previousPicks) => [
      ...previousPicks,
      completedPick,
    ])

    setManagerTotals((previousTotals) => ({
      ...previousTotals,
      [currentPick.manager]:
        previousTotals[currentPick.manager] + pickDuration,
    }))

    const nextPickIndex = currentPickIndex + 1

    if (nextPickIndex >= draftOrder.length) {
      setDraftStarted(false)
      return
    }

    setCurrentPickIndex(nextPickIndex)
    setPickStartedAt(completedAt)
    setNow(completedAt)
  }

  function handleUndo() {
    if (completedPicks.length === 0) {
      return
    }

    const undoneAt = Date.now()
    const revertedPick = completedPicks[completedPicks.length - 1]

    setCompletedPicks((previousPicks) =>
      previousPicks.slice(0, -1),
    )

    setManagerTotals((previousTotals) => ({
      ...previousTotals,
      [revertedPick.manager]: Math.max(
        0,
        previousTotals[revertedPick.manager] -
          revertedPick.duration,
      ),
    }))

    setCurrentPickIndex(revertedPick.overallPick - 1)

    setPickStartedAt(
      undoneAt - revertedPick.duration,
    )

    setNow(undoneAt)
  }

  if (!draftStarted) {
    const firstPick = draftOrder[0]

    return (
      <main className="app">
        <section className="card">
          <p className="eyebrow">Fantasy Football Draft Timer</p>

          <h1>On The Clock</h1>

          <p className="draft-format">
            12 managers · 16 rounds · 192 picks · Snake draft
          </p>

          <div className="current-pick-preview">
            <p>First on the clock</p>
            <h2>{firstPick.manager}</h2>
            <span>
              Round {firstPick.round} · Pick {firstPick.overallPick}
            </span>
          </div>

          <button
            type="button"
            className="start-button"
            onClick={handleStartDraft}
          >
            Start Draft
          </button>

          <div className="manager-list">
            <h3>Draft Order</h3>

            <ol>
              {managers.map((manager) => (
                <li key={manager}>{manager}</li>
              ))}
            </ol>
          </div>
        </section>
      </main>
    )
  }

  return (
    <main className="app draft-screen">
      <section className="card live-draft-card">
        <header className="draft-header">
          <div>
            <p className="eyebrow">On The Clock</p>
            <p className="pick-label">
              Round {currentPick.round} · Pick{' '}
              {currentPick.overallPick} of 192
            </p>
          </div>

          <span className="live-indicator">Live</span>
        </header>

        <section className="manager-panel">
          <p className="manager-status">Currently drafting</p>

          <h1 className="current-manager">
            {currentPick.manager}
          </h1>

          <div className="timer-block">
            <span className="timer-label">Current pick</span>

            <strong className="stopwatch">
              {formatTime(currentPickTime)}
            </strong>
          </div>

          <div className="total-time-row">
            <span>{currentPick.manager}&apos;s total time</span>

            <strong>
              {formatTime(managerTotals[currentPick.manager])}
            </strong>
          </div>
        </section>

        <section className="next-manager">
          <span>Up next</span>
          <strong>{nextPick?.manager ?? 'Draft complete'}</strong>
        </section>

        <section className="draft-controls">
          <button
            type="button"
            className="drafted-button"
            onClick={handleDrafted}
          >
            Drafted
          </button>

          <div className="secondary-controls">
            <button
              type="button"
              className="control-button"
              onClick={handleUndo}
              disabled={completedPicks.length === 0}
            >
              Undo
            </button>

            <button type="button" className="control-button">
              Pause
            </button>
          </div>
        </section>
      </section>
    </main>
  )
}

export default App