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

function createTestDraftData() {
  const managerBaseTimes = {
    Declan: 28000,
    AJ: 34000,
    Liam: 72000,
    Pat: 46000,
    Sean: 39000,
    Nikhil: 52000,
    Nick: 43000,
    Sam: 58000,
    Kevin: 31000,
    Dylan: 48000,
    Connor: 66000,
    Luke: 36000,
  }

  const draftStartedAt = Date.now() - 4 * 60 * 60 * 1000
  let timelineCursor = draftStartedAt

  const stoppageTemplates = [
    {
      name: 'Food break',
      overallPick: 47,
      duration: 12 * 60 * 1000 + 18000,
    },
    {
      name: 'Trade discussion',
      overallPick: 96,
      duration: 4 * 60 * 1000 + 42000,
    },
    {
      name: 'Rain delay',
      overallPick: 151,
      duration: 18 * 60 * 1000 + 9000,
    },
  ]

  const generatedStoppages = []
  const generatedPicks = []

  draftOrder.forEach((pick, index) => {
    const stoppage = stoppageTemplates.find(
      (item) => item.overallPick === pick.overallPick,
    )

    if (stoppage) {
      const stoppageStartedAt = timelineCursor
      const stoppageEndedAt =
        stoppageStartedAt + stoppage.duration

      generatedStoppages.push({
        id: `test-stoppage-${pick.overallPick}`,
        name: stoppage.name,
        startedAt: stoppageStartedAt,
        endedAt: stoppageEndedAt,
        duration: stoppage.duration,
        overallPick: pick.overallPick,
        round: pick.round,
        manager: pick.manager,
      })

      timelineCursor = stoppageEndedAt
    }

    const managerBase = managerBaseTimes[pick.manager]

    const roundAdjustment = pick.round * 650
    const positionAdjustment = pick.pickInRound * 425
    const variation = ((index * 7919) % 24000) - 7000

    let duration = Math.max(
      3500,
      managerBase +
        roundAdjustment +
        positionAdjustment +
        variation,
    )

    // Deliberately make Overall Pick 39 the fastest pick.
    if (pick.overallPick === 39) {
      duration = 1100
    }

    // Deliberately make Overall Pick 128 the slowest pick.
    if (pick.overallPick === 128) {
      duration = 4 * 60 * 1000 + 38600
    }

    const startedAt = timelineCursor
    const completedAt = startedAt + duration

    generatedPicks.push({
      ...pick,
      startedAt,
      completedAt,
      duration,
    })

    timelineCursor = completedAt
  })

  const generatedManagerTotals = createInitialManagerTotals()

  generatedPicks.forEach((pick) => {
    generatedManagerTotals[pick.manager] += pick.duration
  })

  return {
    draftStartedAt,
    draftCompletedAt: timelineCursor,
    completedPicks: generatedPicks,
    managerTotals: generatedManagerTotals,
    stoppages: generatedStoppages,
  }
}

function findRecordPicks(completedPicks) {
  if (completedPicks.length === 0) {
    return {
      fastestPick: null,
      slowestPick: null,
    }
  }

  let fastestPick = completedPicks[0]
  let slowestPick = completedPicks[0]

  completedPicks.forEach((pick) => {
    if (pick.duration < fastestPick.duration) {
      fastestPick = pick
    }

    if (pick.duration > slowestPick.duration) {
      slowestPick = pick
    }
  })

  return {
    fastestPick,
    slowestPick,
  }
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

  const [fastestPickPlayer, setFastestPickPlayer] = useState(
    savedDraft?.fastestPickPlayer ?? '',
  )

  const [slowestPickPlayer, setSlowestPickPlayer] = useState(
    savedDraft?.slowestPickPlayer ?? '',
  )

  const [postDraftDetailsComplete, setPostDraftDetailsComplete] =
    useState(savedDraft?.postDraftDetailsComplete ?? false)  

  const currentPick = draftOrder[currentPickIndex]
  const nextPick = draftOrder[currentPickIndex + 1]

  const { fastestPick, slowestPick } = useMemo(
    () => findRecordPicks(completedPicks),
    [completedPicks],
  )  

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
      fastestPickPlayer,
      slowestPickPlayer,
      postDraftDetailsComplete,
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
    fastestPickPlayer,
    slowestPickPlayer,
    postDraftDetailsComplete,
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

  function handleGenerateTestDraft() {
    const testDraft = createTestDraftData()

    setDraftStartTime(testDraft.draftStartedAt)
    setDraftCompletedAt(testDraft.draftCompletedAt)

    setCompletedPicks(testDraft.completedPicks)
    setManagerTotals(testDraft.managerTotals)
    setStoppages(testDraft.stoppages)

    setCurrentPickIndex(draftOrder.length - 1)
    setCurrentPickAccumulated(0)
    setPickStartedAt(null)
    setNow(testDraft.draftCompletedAt)

    setIsPaused(false)
    setPauseStartedAt(null)
    setShowStoppageForm(false)
    setActiveStoppage(null)
    setStoppageName('')

    setDraftStarted(false)
    setDraftCompleted(true)

    setFastestPickPlayer('')
    setSlowestPickPlayer('')
    setPostDraftDetailsComplete(false)
  }

  function handleClearTestDraft() {
    window.localStorage.removeItem(STORAGE_KEY)
    window.location.reload()
  }

  function handleSavePostDraftDetails(event) {
    event.preventDefault()

    const trimmedFastestPlayer = fastestPickPlayer.trim()
    const trimmedSlowestPlayer = slowestPickPlayer.trim()

    if (!trimmedFastestPlayer || !trimmedSlowestPlayer) {
      return
    }

    setFastestPickPlayer(trimmedFastestPlayer)
    setSlowestPickPlayer(trimmedSlowestPlayer)
    setPostDraftDetailsComplete(true)
  }  

  if (
    draftCompleted &&
    !postDraftDetailsComplete &&
    fastestPick &&
    slowestPick
  ) {
    return (
      <main className="app">
        <section className="card post-draft-card">
          <p className="eyebrow">Draft Complete</p>

          <h1>Two final details.</h1>

          <p className="draft-format">
            Tell us which players were selected on the fastest and
            slowest picks.
          </p>

          <form
            className="post-draft-form"
            onSubmit={handleSavePostDraftDetails}
          >
            <section className="record-pick-question">
              <p className="record-label">Fastest Pick</p>

              <h2>
                {fastestPick.manager} ·{' '}
                {formatTime(fastestPick.duration, true)}
              </h2>

              <p>
                Round {fastestPick.round} · Pick{' '}
                {fastestPick.pickInRound} of 12 · Overall Pick{' '}
                {fastestPick.overallPick}
              </p>

              <label htmlFor="fastest-pick-player">
                Who was drafted?
              </label>

              <input
                id="fastest-pick-player"
                type="text"
                value={fastestPickPlayer}
                onChange={(event) =>
                  setFastestPickPlayer(event.target.value)
                }
                placeholder="Jahmyr Gibbs"
                maxLength={60}
                autoComplete="off"
              />
            </section>

            <section className="record-pick-question">
              <p className="record-label">Slowest Pick</p>

              <h2>
                {slowestPick.manager} ·{' '}
                {formatTime(slowestPick.duration, true)}
              </h2>

              <p>
                Round {slowestPick.round} · Pick{' '}
                {slowestPick.pickInRound} of 12 · Overall Pick{' '}
                {slowestPick.overallPick}
              </p>

              <label htmlFor="slowest-pick-player">
                Who was drafted?
              </label>

              <input
                id="slowest-pick-player"
                type="text"
                value={slowestPickPlayer}
                onChange={(event) =>
                  setSlowestPickPlayer(event.target.value)
                }
                placeholder="DK Metcalf"
                maxLength={60}
                autoComplete="off"
              />
            </section>

            <button
              type="submit"
              className="start-button post-draft-submit"
              disabled={
                !fastestPickPlayer.trim() ||
                !slowestPickPlayer.trim()
              }
            >
              Continue to Results
            </button>
          </form>

          {import.meta.env.DEV && (
            <section className="developer-tools">
              <p>Development tools</p>

              <button
                type="button"
                className="test-draft-button"
                onClick={handleGenerateTestDraft}
              >
                Regenerate Test Draft
              </button>

              <button
                type="button"
                className="clear-test-button"
                onClick={handleClearTestDraft}
              >
                Clear Test Draft
              </button>
            </section>
          )}
        </section>
      </main>
    )
  }

  if (draftCompleted && postDraftDetailsComplete) {
    return (
      <main className="app">
        <section className="card completion-card">
          <p className="eyebrow">Post-Draft Results</p>

          <h1>Results ready.</h1>

          <p className="draft-format">
            The full results experience is coming next.
          </p>

          <div className="current-pick-preview">
            <p>Fastest Pick</p>

            <h2>{fastestPickPlayer}</h2>

            <span>
              {fastestPick?.manager} ·{' '}
              {formatTime(fastestPick?.duration ?? 0, true)}
            </span>
          </div>

          <div className="current-pick-preview result-preview">
            <p>Slowest Pick</p>

            <h2>{slowestPickPlayer}</h2>

            <span>
              {slowestPick?.manager} ·{' '}
              {formatTime(slowestPick?.duration ?? 0, true)}
            </span>
          </div>

          {import.meta.env.DEV && (
            <section className="developer-tools">
              <p>Development tools</p>

              <button
                type="button"
                className="test-draft-button"
                onClick={handleGenerateTestDraft}
              >
                Regenerate Test Draft
              </button>

              <button
                type="button"
                className="clear-test-button"
                onClick={handleClearTestDraft}
              >
                Clear Test Draft
              </button>
            </section>
          )}
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
      {import.meta.env.DEV && (
        <section className="developer-tools">
          <p>Development tools</p>

          <button
            type="button"
            className="test-draft-button"
            onClick={handleGenerateTestDraft}
          >
            Generate Completed Test Draft
          </button>

          <button
            type="button"
            className="clear-test-button"
            onClick={handleClearTestDraft}
          >
            Clear Saved Test Draft
          </button>
        </section>
      )}
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
              Round {currentPick.round} · Pick {currentPick.pickInRound} · {currentPick.overallPick} of 192
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