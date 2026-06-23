import { Link } from 'react-router-dom'

const months: [string, string][] = [
  ['Jan', '3 (4 in leap)'],
  ['Feb', '28 (29 in leap)'],
  ['Mar', '14'],
  ['Apr', '4'],
  ['May', '9'],
  ['Jun', '6'],
  ['Jul', '11'],
  ['Aug', '8'],
  ['Sep', '5'],
  ['Oct', '10'],
  ['Nov', '7'],
  ['Dec', '12'],
]
const centuries: [string, string][] = [
  ['1700s', 'Sunday'],
  ['1800s', 'Friday'],
  ['1900s', 'Wednesday'],
  ['2000s', 'Tuesday'],
  ['2100s', 'Sunday'],
]

const th = { textAlign: 'left' as const, padding: '4px 10px', color: 'var(--muted)', fontWeight: 600 }
const td = { padding: '4px 10px', borderTop: '1px solid var(--line)' }

export function CheatSheet() {
  return (
    <div className="screen">
      <Link to="/learn" style={{ color: 'var(--muted)', textDecoration: 'none' }}>
        ← Learn
      </Link>
      <h1>Cheat-sheet</h1>

      <h3>Weekday numbers</h3>
      <p>Sun 0 · Mon 1 · Tue 2 · Wed 3 · Thu 4 · Fri 5 · Sat 6</p>

      <h3>Leap years</h3>
      <p>÷4 yes · ÷100 no · ÷400 yes again. (Non-century year: last two digits ÷4.)</p>

      <h3>Month anchors</h3>
      <table style={{ borderCollapse: 'collapse', width: '100%' }}>
        <tbody>
          {months.map(([m, a]) => (
            <tr key={m}>
              <th style={th} scope="row">
                {m}
              </th>
              <td style={td}>{a}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <h3>Century anchors</h3>
      <table style={{ borderCollapse: 'collapse', width: '100%' }}>
        <tbody>
          {centuries.map(([c, d]) => (
            <tr key={c}>
              <th style={th} scope="row">
                {c}
              </th>
              <td style={td}>{d}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <h3>Year doomsday — Odd+11</h3>
      <ol style={{ lineHeight: 1.7, paddingLeft: 20 }}>
        <li>Last two digits T; if T is odd, +11</li>
        <li>Halve it</li>
        <li>If the result is odd, +11</li>
        <li>Take 7 − (result mod 7)</li>
        <li>Count that many days forward from the century anchor</li>
      </ol>
    </div>
  )
}
