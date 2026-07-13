import { useEffect, useMemo, useState } from 'react'
import './App.css'

const STORAGE_KEY = 'on-the-clock-draft-v1'

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

function loadSavedDraftState() {
  try {
    const savedDraft = window.localStorage.getItem(STORAGE_KEY)

    if (!savedDraft) {
      return null
    }

    const parsedDraft = JSON.parse(savedDraft)

    if (parsedDraft.version !== 1) {
      return null
    }

    return parsedDraft
  } catch (error) {
    console.error('Unable to restore saved draft:', error)
    return null
  }
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
  const [savedDraft] = useState(() => loadSavedDraftState())

  const [draftStarted, setDraftStarted] = useState(
    savedDraft?.draftStarted ?? false,
  )

  const [draftCompleted, setDraftCompleted] = useState(
    savedDraft?.draftCompleted ?? false,
  )

  const [draftCompletedAt, setDraftCompletedAt] = useState(
    savedDraft?.draftCompletedAt ?? null,
  )

  const [draftStartTime, setDraftStartTime] = useState(
    savedDraft?.draftStartTime ?? null,
  )

  const [currentPickIndex, setCurrentPickIndex] = useState(
    savedDraft?.currentPickIndex ?? 0,
  )

  const [pickStartedAt, setPickStartedAt] = useState(
    savedDraft?.pickStartedAt ?? null,
  )

  const [currentPickAccumulated, setCurrentPickAccumulated] =
    useState(savedDraft?.currentPickAccumulated ?? 0)

  const [now, setNow] = useState(0)

  const [completedPicks, setCompletedPicks] = useState(
    savedDraft?.completedPicks ?? [],
  )

  const [managerTotals, setManagerTotals] = useState(() =>
    savedDraft?.managerTotals ?? createInitialManagerTotals(),
  )

  const [isPaused, setIsPaused] = useState(
    savedDraft?.isPaused ?? false,
  )

  const [pauseStartedAt, setPauseStartedAt] = useState(
    savedDraft?.pauseStartedAt ?? null,
  )

  const [showStoppageForm, setShowStoppageForm] = useState(
    savedDraft?.showStoppageForm ?? false,
  )

  const [stoppageName, setStoppageName] = useState('')

  const [activeStoppage, setActiveStoppage] = useState(
    savedDraft?.activeStoppage ?? null,
  )

  const [stoppages, setStoppages] = useState(
    savedDraft?.stoppages ?? [],
  )

  const currentPick = draftOrder[currentPickIndex]
  const nextPick = draftOrder[currentPickIndex + 1]

  const currentPickTime = useMemo(() => {
    if (!draftStarted || pickStartedAt === null) {
      return currentPickAccumulated
    }

    if (isPaused) {
      return currentPickAccumulated
    }

    return currentPickAccumulated + (now - pickStartedAt)
  }, [
    currentPickAccumulated,
    draftStarted,
    isPaused,
    now,
    pickStartedAt,
  ])

  useEffect(() => {
    if (!draftStarted || isPaused) {
      return undefined
    }

    const timerId = window.setInterval(() => {
      setNow(Date.now())
    }, 100)

    return () => {
      window.clearInterval(timerId)
    }
  }, [draftStarted, isPaused])

  useEffect(() => {
    const stateToSave = {
      version: 1,
      draftStarted,
      draftStartTime,
      draftCompleted,
      draftCompletedAt,
      currentPickIndex,
      pickStartedAt,
      currentPickAccumulated,
      completedPicks,
      managerTotals,
      isPaused,
      pauseStartedAt,
      showStoppageForm,
      activeStoppage,
      stoppages,
    }

    try {
      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(stateToSave),
      )
    } catch (error) {
      console.error('Unable to save draft progress:', error)
    }
  }, [
    activeStoppage,
    completedPicks,
    currentPickAccumulated,
    currentPickIndex,
    draftStartTime,
    draftStarted,
    draftCompleted,
    draftCompletedAt,
    isPaused,
    managerTotals,
    pauseStartedAt,
    pickStartedAt,
    showStoppageForm,
    stoppages,
  ])

  function handleStartDraft() {
    const startTime = Date.now()

    setDraftCompleted(false)
    setDraftCompletedAt(null)
    setDraftStartTime(startTime)
    setCurrentPickAccumulated(0)
    setPickStartedAt(startTime)
    setNow(startTime)
    setDraftStarted(true)
  }

  function handleDrafted() {
    if (
      !currentPick ||
      pickStartedAt === null ||
      isPaused
    ) {
      return
    }

    const completedAt = Date.now()
    const pickDuration =
      currentPickAccumulated + (completedAt - pickStartedAt)

    const completedPick = {
      ...currentPick,
      startedAt: completedAt - pickDuration,
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
      setDraftCompletedAt(completedAt)
      setDraftCompleted(true)
      setDraftStarted(false)
      setPickStartedAt(null)
      setCurrentPickAccumulated(0)
      setNow(completedAt)
      return
    }

    setCurrentPickIndex(nextPickIndex)
    setCurrentPickAccumulated(0)
    setPickStartedAt(completedAt)
    setNow(completedAt)
  }

  function handleUndo() {
    if (completedPicks.length === 0 || isPaused) {
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
    setCurrentPickAccumulated(revertedPick.duration)
    setPickStartedAt(undoneAt)
    setNow(undoneAt)
  }

  function handlePause() {
    if (isPaused || pickStartedAt === null) {
      return
    }

    const pausedAt = Date.now()
    const elapsedBeforePause =
      currentPickAccumulated + (pausedAt - pickStartedAt)

    setCurrentPickAccumulated(elapsedBeforePause)
    setPauseStartedAt(pausedAt)
    setNow(pausedAt)
    setIsPaused(true)
    setShowStoppageForm(true)
  }

  function handleSaveStoppageName(event) {
    event.preventDefault()

    const trimmedName = stoppageName.trim()

    if (!trimmedName || pauseStartedAt === null) {
      return
    }

    setActiveStoppage({
      name: trimmedName,
      startedAt: pauseStartedAt,
      overallPick: currentPick.overallPick,
      round: currentPick.round,
      manager: currentPick.manager,
    })

    setStoppageName('')
    setShowStoppageForm(false)
  }

  function handleResume() {
    if (
      !isPaused ||
      !activeStoppage ||
      pauseStartedAt === null
    ) {
      return
    }

    const resumedAt = Date.now()

    const completedStoppage = {
      ...activeStoppage,
      id: `${activeStoppage.startedAt}-${activeStoppage.overallPick}`,
      endedAt: resumedAt,
      duration: resumedAt - activeStoppage.startedAt,
    }

    setStoppages((previousStoppages) => [
      ...previousStoppages,
      completedStoppage,
    ])

    setActiveStoppage(null)
    setPauseStartedAt(null)
    setIsPaused(false)
    setPickStartedAt(resumedAt)
    setNow(resumedAt)
  }

  if (draftCompleted) {
    return (
      <main className="app">
        <section className="card completion-card">
          <p className="eyebrow">Draft Complete</p>

          <h1>That&apos;s a wrap.</h1>

          <p className="draft-format">
            All 192 picks have been recorded successfully.
          </p>

          <div className="current-pick-preview">
            <p>Completed picks</p>
            <h2>{completedPicks.length} / 192</h2>

            <span>
              Results and analytics are ready to be generated.
            </span>
          </div>

          <button type="button" className="start-button" disabled>
            View Results — Coming Next
          </button>
        </section>
      </main>
    )
  }

  if (!draftStarted) {
    const firstPick = draftOrder[0]

    return (
      <main className="app">
        <section className="card">
          <p className="eyebrow">
            Fantasy Football Draft Timer
          </p>

          <h1>On The Clock</h1>

          <p className="draft-format">
            12 managers · 16 rounds · 192 picks · Snake draft
          </p>

          <div className="current-pick-preview">
            <p>First on the clock</p>
            <h2>{firstPick.manager}</h2>
            <span>
              Round {firstPick.round} · Pick{' '}
              {firstPick.overallPick}
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

          <span
            className={
              isPaused
                ? 'live-indicator paused-indicator'
                : 'live-indicator'
            }
          >
            {isPaused ? 'Paused' : 'Live'}
          </span>
        </header>

        <section className="manager-panel">
          <p className="manager-status">
            {isPaused ? 'Draft paused' : 'Currently drafting'}
          </p>

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
            <span>
              {currentPick.manager}&apos;s total time
            </span>

            <strong>
              {formatTime(managerTotals[currentPick.manager])}
            </strong>
          </div>
        </section>

        <section className="next-manager">
          <span>Up next</span>
          <strong>
            {nextPick?.manager ?? 'Draft complete'}
          </strong>
        </section>

        {isPaused && activeStoppage && (
          <section className="active-stoppage">
            <span>Current stoppage</span>
            <strong>{activeStoppage.name}</strong>
          </section>
        )}

        <section className="draft-controls">
          <button
            type="button"
            className="drafted-button"
            onClick={handleDrafted}
            disabled={isPaused}
          >
            Drafted
          </button>

          <div className="secondary-controls">
            <button
              type="button"
              className="control-button"
              onClick={handleUndo}
              disabled={
                completedPicks.length === 0 || isPaused
              }
            >
              Undo
            </button>

            <button
              type="button"
              className="control-button"
              onClick={isPaused ? handleResume : handlePause}
              disabled={isPaused && !activeStoppage}
            >
              {isPaused ? 'Resume' : 'Pause'}
            </button>
          </div>
        </section>
      </section>

      {showStoppageForm && (
        <div className="modal-backdrop">
          <form
            className="stoppage-modal"
            onSubmit={handleSaveStoppageName}
          >
            <p className="eyebrow">Draft Paused</p>
            <h2>Name this stoppage</h2>

            <p className="modal-description">
              The manager&apos;s timer is frozen. Enter a reason
              before continuing.
            </p>

            <label htmlFor="stoppage-name">
              Stoppage name
            </label>

            <input
              id="stoppage-name"
              type="text"
              value={stoppageName}
              onChange={(event) =>
                setStoppageName(event.target.value)
              }
              placeholder="Rain delay"
              maxLength={50}
              autoFocus
            />

            <button
              type="submit"
              className="save-stoppage-button"
              disabled={!stoppageName.trim()}
            >
              Save Stoppage
            </button>
          </form>
        </div>
      )}
    </main>
  )
}

export default App