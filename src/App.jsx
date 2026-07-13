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

function App() {
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

        <button type="button" className="start-button">
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

export default App